"use strict";

/* PIKU: DEEP DIVE. Native Canvas game; no engine or external asset requests. */
(() => {
    const BEST_KEY = "peacock-dynamics-piku-best";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeGame = null;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
    const formatScore = (value) => {
        try { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value); }
        catch { return value.toString(); }
    };
    const readBest = () => {
        try {
            const value = window.localStorage.getItem(BEST_KEY) || "0";
            return /^\d+$/.test(value) ? BigInt(value) : 0n;
        } catch { return 0n; }
    };
    const writeBest = (value) => {
        try { window.localStorage.setItem(BEST_KEY, value.toString()); } catch { /* Keep the run playable when storage is blocked. */ }
    };

    /* Side profile of the official peacock graph mark: edges and consensus nodes only. */
    const drawPiku = (ctx, mood, time, angerAmount = 0) => {
        const angry = mood === "angry";
        const happy = mood === "happy";
        const surprised = mood === "surprised" || mood === "failure";
        const anger = angry ? clamp(angerAmount, 0, 1) : 0;
        const tailRaise = happy ? -3 : 0;
        const anchor = { x: -3, y: -7 };
        const tips = [[-57, -28], [-62, -14], [-65, 0], [-59, 15], [-48, 25]];
        ctx.save();
        ctx.strokeStyle = happy ? "#f8d65c" : "#edb91f";
        ctx.fillStyle = happy ? "#f8d65c" : "#edb91f";
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        tips.forEach(([rawX, rawY], index) => {
            const x = anchor.x + (rawX - anchor.x) * (1 - .34 * anger);
            const y = anchor.y + (rawY - anchor.y) * (1 - .2 * anger) + tailRaise;
            const midX = anchor.x + (x - anchor.x) * .58;
            const midY = anchor.y + (y - anchor.y) * .58;
            ctx.beginPath();
            ctx.moveTo(anchor.x, anchor.y);
            ctx.lineTo(midX, midY);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.fillStyle = index === 2 ? "#b99aff" : happy ? "#f8d65c" : "#f0c431";
            ctx.beginPath();
            ctx.arc(x, y, happy ? 3.4 : 2.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(midX, midY, 1.55, 0, Math.PI * 2);
            ctx.fill();
        });

        // The long center stem and short foot echo the original emblem's body axis.
        ctx.strokeStyle = "#edb91f";
        ctx.lineWidth = 2.35;
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.lineTo(0, 27);
        ctx.moveTo(-9, 28);
        ctx.lineTo(9, 28);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 27, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // A clean, forward-pointing triangular head is the turned side view of the logo's core.
        ctx.strokeStyle = "#f0c431";
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(0, 1);
        ctx.lineTo(19, -7);
        ctx.closePath();
        ctx.stroke();

        // One small graph node reads as the eye; no cartoon pupil or beak is added.
        ctx.fillStyle = angry ? "#d4b4ff" : happy ? "#f8d65c" : "#b99aff";
        ctx.beginPath();
        ctx.arc(7, -7, angry ? 1.25 + (1 - anger) : surprised ? 2.5 : 2.0, 0, Math.PI * 2);
        ctx.fill();

        // Three crest nodes and links extend the graph silhouette above the head.
        const crestLift = angry ? -2.5 * anger : surprised ? -4 : 0;
        const crest = [[-1, -24 + crestLift], [7, -31 + crestLift], [15, -24 + crestLift]];
        ctx.strokeStyle = "#e9b92e";
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.moveTo(0, -15);
        crest.forEach(([x, y]) => { ctx.lineTo(x, y); });
        ctx.stroke();
        crest.forEach(([x, y], index) => {
            ctx.fillStyle = index === 1 && (happy || surprised) ? "#c7a6ff" : "#f2c53c";
            ctx.beginPath();
            ctx.arc(x, y, surprised && index === 1 ? 2.9 : 2.3, 0, Math.PI * 2);
            ctx.fill();
        });

        if (angry) {
            // A small red alert graph keeps the reaction in the same point-and-edge language.
            const pulse = .78 + Math.sin(time * 18) * .12;
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = "#ef5967";
            ctx.fillStyle = "#ff7881";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(16, -22);
            ctx.lineTo(21, -28);
            ctx.lineTo(27, -24);
            ctx.stroke();
            [[16, -22], [21, -28], [27, -24]].forEach(([x, y]) => {
                ctx.beginPath();
                ctx.arc(x, y, 1.8, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }
        ctx.restore();
    };

    /* Rounded bathyscaphe with a transparent cockpit and visible graph mascot. */
    const drawSubmarine = (ctx, x, y, scale, mood, time, bubbles = true, anger = 0) => {
        ctx.save();
        ctx.translate(x, y + Math.sin(time * 2.5) * 2.2);
        ctx.scale(scale, scale);

        if (bubbles) {
            ctx.fillStyle = "rgba(151, 215, 231, .42)";
            for (let i = 0; i < 4; i++) {
                const bx = -122 - mod(time * 24 + i * 19, 44);
                const by = Math.sin(time * 2 + i * 1.7) * 11 + (i - 1.5) * 5;
                ctx.beginPath(); ctx.arc(bx, by, 1.8 + (i % 2) * .8, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Rear propeller and protective ring.
        ctx.save();
        ctx.translate(-111, 0);
        ctx.strokeStyle = "rgba(184, 157, 221, .72)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.rotate(time * 13);
        ctx.fillStyle = "#8c70ad";
        for (let i = 0; i < 3; i++) {
            ctx.rotate(Math.PI * 2 / 3);
            ctx.beginPath(); ctx.ellipse(0, -7, 3, 7, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // Fins and hull.
        ctx.fillStyle = "#302046";
        ctx.strokeStyle = "#9c79c7";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-77, -34); ctx.lineTo(-88, -55); ctx.lineTo(-49, -42); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-77, 34); ctx.lineTo(-88, 55); ctx.lineTo(-49, 42); ctx.closePath(); ctx.fill(); ctx.stroke();
        const hull = ctx.createLinearGradient(0, -42, 0, 44);
        hull.addColorStop(0, "#382751"); hull.addColorStop(.5, "#211831"); hull.addColorStop(1, "#110e1c");
        ctx.fillStyle = hull;
        ctx.strokeStyle = "#b28add";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-106, -12);
        ctx.quadraticCurveTo(-98, -39, -57, -41);
        ctx.lineTo(56, -41);
        ctx.quadraticCurveTo(104, -39, 119, -8);
        ctx.lineTo(119, 8);
        ctx.quadraticCurveTo(103, 39, 56, 41);
        ctx.lineTo(-57, 41);
        ctx.quadraticCurveTo(-99, 38, -106, 12);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Cockpit bubble. Piku and the small graph tail stay inside this ring.
        ctx.fillStyle = "rgba(35, 33, 62, .65)";
        ctx.strokeStyle = "rgba(152, 211, 229, .82)";
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(-7, -1, 62, 52, -.04, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(190, 154, 238, .38)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(-7, -1, 54, 44, -.04, 3.5, 5.5); ctx.stroke();

        drawPiku(ctx, mood, time, anger);

        // Console, seat, seams, lights and forward headlamps.
        ctx.fillStyle = "#1c1728";
        ctx.strokeStyle = "rgba(205, 171, 239, .72)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(31, 12, 25, 13, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#e9ba35";
        ctx.beginPath(); ctx.arc(38, 18, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#91d7e7";
        ctx.beginPath(); ctx.arc(48, 18, 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(226, 187, 70, .7)";
        ctx.beginPath(); ctx.moveTo(70, -35); ctx.lineTo(90, -33); ctx.moveTo(71, 35); ctx.lineTo(89, 33); ctx.stroke();
        ctx.fillStyle = "#b59be0";
        ctx.beginPath(); ctx.arc(96, -26, 3, 0, Math.PI * 2); ctx.arc(96, 26, 3, 0, Math.PI * 2); ctx.fill();
        const lamp = ctx.createRadialGradient(112, 0, 2, 112, 0, 38);
        lamp.addColorStop(0, "rgba(208, 242, 247, .22)"); lamp.addColorStop(1, "rgba(149, 217, 231, 0)");
        ctx.fillStyle = lamp; ctx.beginPath(); ctx.moveTo(108, -15); ctx.lineTo(164, -42); ctx.lineTo(164, 42); ctx.lineTo(108, 15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#e6f4f2";
        ctx.beginPath(); ctx.arc(111, -9, 3.2, 0, Math.PI * 2); ctx.arc(111, 9, 3.2, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    };

    const drawSideViewArt = (canvas) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);
        const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        const scale = Math.min(width / 360, height / 118);
        ctx.translate(width / 2, height / 2 + 2);
        drawSubmarine(ctx, 0, 0, scale, "normal", .25, false);
        ctx.restore();
    };

    const makeRockVertices = (radius, seed) => {
        let value = seed >>> 0;
        const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
        const count = 8;
        return Array.from({ length: count }, (_, i) => {
            const angle = i / count * Math.PI * 2;
            const distance = radius * (.74 + random() * .43);
            return [Math.cos(angle) * distance, Math.sin(angle) * distance];
        });
    };

    class PikuDeepDive {
        constructor() {
            this.abort = new AbortController();
            this.root = null;
            this.mascotTimer = 0;
            this.sideViewCanvas = null;
            this.worldCanvas = null;
            this.worldCtx = null;
            this.playScreen = null;
            this.animationFrame = 0;
            this.lastFrameTime = 0;
            this.resizeObserver = null;
            this.usingResizeObserver = typeof ResizeObserver !== "undefined";
            this.state = "intro";
            this.game = null;
            this.best = readBest();
            this.input = { keys: new Set(), pointers: new Map(), dragPointer: null, dragY: null };
            this.previousOverflow = document.body.style.overflow;
            this.closed = false;
            this.hud = {};
        }

        mount() {
            const node = document.createElement("div");
            node.id = "piku-game-root";
            node.className = "piku-game-root";
            node.setAttribute("role", "dialog");
            node.setAttribute("aria-modal", "true");
            node.setAttribute("aria-labelledby", "piku-dialog-title");
            node.tabIndex = -1;
            node.innerHTML = `
                <div class="piku-shell">
                    <header class="piku-topbar">
                        <img src="assets/logo/icon_dark.png" alt="">
                        <strong>PIKU: DEEP DIVE</strong>
                        <span>A TINY CAPTAIN. AN ENORMOUS OCEAN.</span>
                    </header>
                    <main class="piku-screen">
                        <section class="piku-intro-screen" data-piku-screen="intro" aria-labelledby="piku-dialog-title">
                            <div class="piku-intro-copy">
                                <p class="piku-kicker">PEACOCK DYNAMICS PRESENTS</p>
                                <h1 id="piku-dialog-title">MEET BABY PIKU</h1>
                                <p class="piku-subtitle">The Tiny Captain of the Deep</p>
                                <dl class="piku-facts">
                                    <div><dt>Name:</dt><dd>Baby Piku</dd></div>
                                    <div><dt>Age:</dt><dd>Baby</dd></div>
                                    <div><dt>Species:</dt><dd>Peacock</dd></div>
                                    <div><dt>Role:</dt><dd>Official Mascot of Peacock Dynamics</dd></div>
                                    <div><dt>Personality:</dt><dd>Curious, adventurous, and extremely grumpy.</dd></div>
                                    <div><dt>Favorite Activity:</dt><dd>Exploring the deep ocean aboard autonomous submarines.</dd></div>
                                    <div><dt>Biggest Annoyance:</dt><dd>Being poked or disturbed.</dd></div>
                                </dl>
                                <div class="piku-introduction">
                                    <p>Meet Baby Piku, the tiniest explorer at Peacock Dynamics!</p>
                                    <p>He is a curious little peacock with a very big personality. He loves exploring mysterious underwater worlds aboard his self-driving submarine.</p>
                                    <p>He might be adorable, but be careful. Baby Piku gets very grumpy when disturbed!</p>
                                    <p>Today, he is setting off on another underwater expedition.</p>
                                    <p>Would you like to join his adventure?</p>
                                </div>
                                <div class="piku-controls-guide" aria-label="Game controls">
                                    <div><strong>KEYBOARD</strong><span>W / ↑ rise · S / ↓ dive · Space sonar · Esc pause</span></div>
                                    <div><strong>TOUCH</strong><span>Drag up or down to steer · hold UP / DOWN · tap SONAR to scan</span></div>
                                </div>
                                <div class="piku-intro-actions">
                                    <button class="piku-button piku-button-primary" type="button" data-action="join">Join the Adventure</button>
                                    <button class="piku-button piku-button-quiet" type="button" data-action="home">Home</button>
                                </div>
                            </div>
                            <div class="piku-intro-art">
                                <div class="piku-front-view-window">
                                    <button class="piku-mascot-button" type="button" data-piku-mascot aria-label="Gently tap Baby Piku to ruffle his feathers">
                                        <svg class="piku-peacock" viewBox="190 160 770 820" role="img" aria-label="The Peacock Dynamics peacock graph mark, reproduced as gold balls and sticks without the outer ring or wordmark.">
                                            <g class="piku-tail-fan" fill="none" stroke="#edb91f" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M236 552 490 583 M278 385 500 543 M403 255 520 499 M572 195 572 374 M740 255 624 499 M864 385 644 543 M905 552 653 583" />
                                                <path d="M538 427 571 510 M571 404 571 510 M606 427 571 510" />
                                            </g>
                                            <g class="piku-mark-nodes" fill="#edb91f">
                                                <circle cx="236" cy="552" r="14"/><circle cx="278" cy="385" r="14"/><circle cx="403" cy="255" r="14"/><circle cx="572" cy="195" r="14"/><circle cx="740" cy="255" r="14"/><circle cx="864" cy="385" r="14"/><circle cx="905" cy="552" r="14"/>
                                                <circle cx="538" cy="427" r="12"/><circle cx="571" cy="404" r="12"/><circle cx="606" cy="427" r="12"/>
                                            </g>
                                            <g class="piku-peacock-body" fill="none" stroke="#edb91f" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M531 512 H612 L572 590 Z M572 590 V954 M524 954 H620" />
                                            </g>
                                        </svg>
                                        <span class="piku-huff-emoji" aria-hidden="true">💢</span>
                                    </button>
                                    <p class="piku-art-caption">FRONT VIEW · PEACOCK MARK</p>
                                </div>
                                <div class="piku-side-view-window">
                                    <canvas id="piku-side-view-art" aria-label="Baby Piku in side profile, riding inside his small autonomous submarine." role="img"></canvas>
                                    <p class="piku-art-caption">SIDE PROFILE · DEEP-SEA SUBMARINE</p>
                                </div>
                            </div>
                        </section>
                        <section class="piku-play-screen" data-piku-screen="play" aria-label="Underwater expedition" hidden>
                            <canvas class="piku-world-canvas" tabindex="-1" aria-label="Side-scrolling underwater exploration game"></canvas>
                            <div class="piku-hud" aria-label="Mission status">
                                <div class="piku-stat"><span>SCORE</span><strong data-hud="score">0</strong></div>
                                <div class="piku-stat"><span>BEST</span><strong data-hud="best">0</strong></div>
                                <div class="piku-stat"><span>DISTANCE</span><strong data-hud="distance">0 m</strong></div>
                                <div class="piku-hull" aria-label="Submarine hull integrity"><span class="piku-hull-label">HULL</span><i></i><i></i><i></i></div>
                                <button class="piku-pause-button" type="button" data-action="pause">PAUSE · ESC</button>
                            </div>
                            <p class="piku-orientation-note" aria-hidden="true">Landscape gives Piku more room to explore</p>
                            <p class="piku-play-hint piku-hint-keyboard" aria-hidden="true">W / ↑ RISE · S / ↓ DIVE · SPACE SONAR · ESC PAUSE</p>
                            <p class="piku-play-hint piku-hint-touch" aria-hidden="true">DRAG TO STEER · UP / DOWN TO MOVE · SONAR TO SCAN</p>
                            <button class="piku-home-button" type="button" data-action="home">HOME</button>
                            <div class="piku-touch-controls" aria-label="Touch controls">
                                <div class="piku-move-pad">
                                    <button class="piku-control-button" type="button" data-hold="up" aria-label="Move submarine up">UP</button>
                                    <button class="piku-control-button" type="button" data-hold="down" aria-label="Move submarine down">DOWN</button>
                                </div>
                                <button class="piku-control-button piku-sonar-button" type="button" data-action="sonar" aria-label="Activate sonar">SONAR</button>
                            </div>
                            <section class="piku-game-modal" data-piku-modal="pause" aria-labelledby="piku-pause-title" hidden>
                                <div class="piku-modal-card">
                                    <p class="piku-modal-kicker">EXPEDITION PAUSED</p>
                                    <h2 id="piku-pause-title">Take a breather</h2>
                                    <p>Piku is waiting at the controls.</p>
                                    <div class="piku-modal-actions">
                                        <button class="piku-button piku-button-primary" type="button" data-action="resume">Resume</button>
                                        <button class="piku-button" type="button" data-action="restart">Restart</button>
                                        <button class="piku-button piku-button-quiet" type="button" data-action="home">Home</button>
                                    </div>
                                </div>
                            </section>
                        </section>
                        <section class="piku-gameover-screen" data-piku-screen="gameover" aria-labelledby="piku-gameover-title" hidden>
                            <div class="piku-modal-card">
                                <p class="piku-modal-kicker">EXPEDITION REPORT</p>
                                <h2 id="piku-gameover-title">MISSION FAILED</h2>
                                <p>Baby Piku is very grumpy.</p>
                                <dl class="piku-modal-stats">
                                    <div><dt>FINAL SCORE</dt><dd data-result="score">0</dd></div>
                                    <div><dt>BEST SCORE</dt><dd data-result="best">0</dd></div>
                                    <div><dt>DISTANCE</dt><dd data-result="distance">0 m</dd></div>
                                </dl>
                                <div class="piku-modal-actions">
                                    <button class="piku-button piku-button-primary" type="button" data-action="restart">Try Again</button>
                                    <button class="piku-button piku-button-quiet" type="button" data-action="home">Home</button>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>`;
            document.body.append(node);
            this.root = node;
            this.worldCanvas = node.querySelector(".piku-world-canvas");
            this.sideViewCanvas = node.querySelector("#piku-side-view-art");
            this.worldCtx = this.worldCanvas.getContext("2d", { alpha: false });
            this.introScreen = node.querySelector('[data-piku-screen="intro"]');
            this.playScreen = node.querySelector(".piku-play-screen");
            this.gameoverScreen = node.querySelector('[data-piku-screen="gameover"]');
            this.hud = {
                score: node.querySelector('[data-hud="score"]'),
                best: node.querySelector('[data-hud="best"]'),
                distance: node.querySelector('[data-hud="distance"]'),
                hull: Array.from(node.querySelectorAll(".piku-hull i")),
                sonarButton: node.querySelector('[data-action="sonar"]'),
                pauseModal: node.querySelector('[data-piku-modal="pause"]'),
                resultScore: node.querySelector('[data-result="score"]'),
                resultBest: node.querySelector('[data-result="best"]'),
                resultDistance: node.querySelector('[data-result="distance"]')
            };

            this.site = document.querySelector(".site-frame");
            this.previousSiteInert = this.site ? this.site.inert : false;
            if (this.site) this.site.inert = true;
            this.previousOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            document.body.classList.remove("nav-open");
            document.querySelector(".menu-toggle")?.setAttribute("aria-expanded", "false");
            document.documentElement.classList.add("piku-game-active");

            this.bindInput();
            this.observeSize();
            this.resize();
            this.refreshHud(true);
            this.root.focus({ preventScroll: true });
        }

        bindInput() {
            const signal = this.abort.signal;
            this.root.addEventListener("click", (event) => {
                const mascot = event.target instanceof Element ? event.target.closest("[data-piku-mascot]") : null;
                if (mascot && this.state === "intro") {
                    this.ruffleMascot(mascot);
                    return;
                }
                const control = event.target instanceof Element ? event.target.closest("[data-action]") : null;
                if (!control) return;
                const action = control.dataset.action;
                if (action === "home") this.home();
                else if (action === "join") this.startRun();
                else if (action === "pause") this.pause();
                else if (action === "resume") this.resume();
                else if (action === "restart") this.startRun();
                else if (action === "sonar") this.activateSonar();
            }, { signal });

            this.root.addEventListener("pointerdown", (event) => {
                if (!(event.target instanceof Element)) return;
                const hold = event.target.closest("[data-hold]");
                if (hold && this.state === "playing") {
                    event.preventDefault();
                    this.input.pointers.set(event.pointerId, hold.dataset.hold);
                    hold.classList.add("is-active");
                    try { hold.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
                    return;
                }
                if (event.target === this.worldCanvas && this.state === "playing") {
                    this.input.dragPointer = event.pointerId;
                    this.setDragTarget(event.clientY);
                    try { this.worldCanvas.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
                }
            }, { signal });

            const releasePointer = (event) => {
                if (this.input.pointers.has(event.pointerId)) {
                    const hold = this.input.pointers.get(event.pointerId);
                    this.input.pointers.delete(event.pointerId);
                    const button = this.root.querySelector(`[data-hold="${hold}"]`);
                    if (button && !Array.from(this.input.pointers.values()).includes(hold)) button.classList.remove("is-active");
                }
                if (this.input.dragPointer === event.pointerId) {
                    this.input.dragPointer = null;
                    this.input.dragY = null;
                }
            };
            this.root.addEventListener("pointerup", releasePointer, { signal });
            this.root.addEventListener("pointercancel", releasePointer, { signal });
            this.root.addEventListener("lostpointercapture", releasePointer, { signal });
            this.root.addEventListener("pointermove", (event) => {
                if (this.input.dragPointer === event.pointerId && this.state === "playing") this.setDragTarget(event.clientY);
            }, { signal });

            this.root.addEventListener("keydown", (event) => {
                if (event.key === "Tab") this.trapFocus(event);
                if (event.key === "Escape") {
                    event.preventDefault();
                    if (this.state === "playing") this.pause();
                    else if (this.state === "paused") this.resume();
                    else this.home();
                    return;
                }
                if (this.state !== "playing") return;
                const key = event.key.toLowerCase();
                if (["arrowup", "arrowdown", "w", "s", " "].includes(key)) event.preventDefault();
                if (["arrowup", "arrowdown", "w", "s"].includes(key)) this.input.keys.add(key);
                if ((key === " " || key === "spacebar") && !event.repeat) this.activateSonar();
            }, { signal });
            this.root.addEventListener("keyup", (event) => {
                this.input.keys.delete(event.key.toLowerCase());
            }, { signal });
            window.addEventListener("blur", () => this.clearInput(), { signal });
            document.addEventListener("visibilitychange", () => {
                if (document.hidden && this.state === "playing") this.pause(false);
            }, { signal });
            if (!this.usingResizeObserver) window.addEventListener("resize", () => this.resize(), { signal });
        }

        trapFocus(event) {
            const focusable = Array.from(this.root.querySelectorAll('button:not(:disabled), [tabindex="0"]')).filter((node) => !node.closest("[hidden]"));
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === this.root)) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first.focus();
            }
        }

        observeSize() {
            if (this.usingResizeObserver) {
                this.resizeObserver = new ResizeObserver(() => this.resize());
                this.resizeObserver.observe(this.root);
                this.resizeObserver.observe(this.playScreen);
                this.resizeObserver.observe(this.sideViewCanvas.parentElement);
            }
        }

        resizeCanvas(canvas) {
            const rect = canvas.getBoundingClientRect();
            const width = Math.max(1, rect.width);
            const height = Math.max(1, rect.height);
            const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
            const pixelWidth = Math.round(width * dpr);
            const pixelHeight = Math.round(height * dpr);
            if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
                canvas.width = pixelWidth;
                canvas.height = pixelHeight;
            }
            const ctx = canvas.getContext("2d");
            if (!ctx) return null;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return { ctx, width, height };
        }

        resize() {
            if (this.closed || !this.root) return;
            drawSideViewArt(this.sideViewCanvas);
            const world = this.resizeCanvas(this.worldCanvas);
            if (world) {
                this.width = world.width;
                this.height = world.height;
                this.worldCtx = world.ctx;
                if (this.game) this.drawFrame();
            }
        }

        ruffleMascot(mascot) {
            if (this.mascotTimer) window.clearTimeout(this.mascotTimer);
            mascot.classList.remove("is-ruffled");
            void mascot.offsetWidth;
            mascot.classList.add("is-ruffled");
            this.mascotTimer = window.setTimeout(() => {
                mascot.classList.remove("is-ruffled");
                this.mascotTimer = 0;
            }, 1150);
        }

        setDragTarget(clientY) {
            const rect = this.worldCanvas.getBoundingClientRect();
            this.input.dragY = (clientY - rect.top) / Math.max(1, rect.height) * this.height;
        }

        clearInput() {
            this.input.keys.clear();
            this.input.pointers.clear();
            this.input.dragPointer = null;
            this.input.dragY = null;
            this.root?.querySelectorAll(".piku-control-button.is-active").forEach((node) => node.classList.remove("is-active"));
        }

        safeBounds() {
            const top = Math.max(58, Math.min(86, this.height * .2));
            const bottom = Math.max(top + 50, this.height - Math.max(75, Math.min(108, this.height * .23)));
            return { top, bottom };
        }

        random(game) {
            game.seed = (game.seed * 1664525 + 1013904223) >>> 0;
            return game.seed / 4294967296;
        }

        startRun() {
            this.stopFrame();
            this.clearInput();
            this.game = null;
            this.setScreen("playing");
            this.resize();
            this.best = readBest();
            const bounds = this.safeBounds();
            this.game = {
                worldX: 0, distance: 0, y: (bounds.top + bounds.bottom) / 2, vy: 0,
                speed: 150, score: 0n, best: this.best, hull: 3, elapsed: 0,
                objects: [], nextSpawn: Math.max(390, this.width * .82), seed: (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0,
                invulnerable: 0, mood: "normal", moodUntil: 0, moodStarted: 0, sonarCooldown: 0, sonarAge: -1,
                failureAt: -1, lastDistanceHud: -1, lastHudSonar: ""
            };
            this.refreshHud(true);
            this.root.querySelector(".piku-world-canvas").focus({ preventScroll: true });
            this.lastFrameTime = 0;
            this.startFrame();
        }

        spawnEncounter(x) {
            const game = this.game;
            const bounds = this.safeBounds();
            const span = Math.max(36, bounds.bottom - bounds.top);
            const difficulty = Math.min(1, game.distance / 6500);
            const radius = Math.min(span * .19, 22 + difficulty * 14 + this.random(game) * 5);
            const y = bounds.top + radius + this.random(game) * Math.max(1, span - radius * 2);
            const seed = Math.floor(this.random(game) * 0xffffffff) >>> 0;
            const coral = this.random(game) < .43;
            game.objects.push({ kind: coral ? "coral" : "rock", x, y, radius, seed, vertices: makeRockVertices(radius, seed) });

            const pickupY = clamp(y + (this.random(game) < .5 ? -1 : 1) * (radius + 58 + this.random(game) * 40), bounds.top + 12, bounds.bottom - 12);
            const roll = this.random(game);
            const value = roll < .045 ? 100n : roll < .24 ? 50n : 10n;
            game.objects.push({ kind: "research", x: x - 150 - this.random(game) * 50, y: pickupY, radius: value === 100n ? 11 : 8, value, hidden: value === 50n && this.random(game) < .7, revealedUntil: -1, phase: this.random(game) * Math.PI * 2 });
            if (this.random(game) < .22) {
                const secondY = clamp(bounds.top + this.random(game) * span, bounds.top + 14, bounds.bottom - 14);
                game.objects.push({ kind: "research", x: x + 135, y: secondY, radius: 7, value: 10n, hidden: false, revealedUntil: 0, phase: this.random(game) * Math.PI * 2 });
            }
        }

        update(dt) {
            const game = this.game;
            if (!game) return;
            game.elapsed += dt;
            game.invulnerable = Math.max(0, game.invulnerable - dt);
            game.sonarCooldown = Math.max(0, game.sonarCooldown - dt);
            if (game.sonarAge >= 0) game.sonarAge += dt;
            if (game.mood !== "normal" && game.elapsed >= game.moodUntil) game.mood = "normal";

            if (this.state === "failure") {
                if (game.elapsed - game.failureAt >= .82) this.showGameOver();
                return;
            }

            const bounds = this.safeBounds();
            const up = this.input.keys.has("arrowup") || this.input.keys.has("w") || Array.from(this.input.pointers.values()).includes("up");
            const down = this.input.keys.has("arrowdown") || this.input.keys.has("s") || Array.from(this.input.pointers.values()).includes("down");
            let acceleration = (down ? 420 : 0) - (up ? 420 : 0);
            if (this.input.dragY !== null) acceleration = clamp((this.input.dragY - game.y) * 21, -1170, 1170);
            game.vy = (game.vy + acceleration * dt) * Math.exp(-4.1 * dt);
            game.vy = clamp(game.vy, -250, 250);
            game.y = clamp(game.y + game.vy * dt, bounds.top, bounds.bottom);

            game.speed = Math.min(315, 150 + Math.sqrt(game.distance) * 2.25);
            game.worldX += game.speed * dt;
            game.distance = game.worldX;
            const difficulty = Math.min(1, game.distance / 6500);
            const gap = Math.max(310, 500 - difficulty * 125);
            const generateTo = game.worldX + this.width + 520;
            while (game.nextSpawn < generateTo) {
                this.spawnEncounter(game.nextSpawn);
                game.nextSpawn += gap * (.84 + this.random(game) * .34);
            }

            const playerX = this.playerScreenX();
            for (let i = game.objects.length - 1; i >= 0; i--) {
                const object = game.objects[i];
                if (object.x < game.worldX - 180) { game.objects.splice(i, 1); continue; }
                if (object.kind === "research") {
                    const revealed = !object.hidden || object.revealedUntil >= game.elapsed;
                    if (revealed && Math.hypot(object.x - game.worldX - playerX, object.y - game.y) < object.radius + 24) {
                        game.score += object.value;
                        if (game.score > game.best) { game.best = game.score; this.best = game.best; writeBest(game.best); }
                        game.mood = object.value === 100n ? "surprised" : "happy";
                        game.moodUntil = game.elapsed + .72;
                        game.moodStarted = game.elapsed;
                        game.objects.splice(i, 1);
                        this.refreshHud(true);
                    }
                } else if (game.invulnerable <= 0 && Math.hypot(object.x - game.worldX - playerX, game.y - object.y) < object.radius + 29) {
                    this.hitObstacle();
                    break;
                }
            }

            if (game.lastDistanceHud < Math.floor(game.distance / 10)) {
                game.lastDistanceHud = Math.floor(game.distance / 10);
                this.refreshHud(false);
            }
            this.refreshSonarHud();
        }

        playerScreenX() { return clamp(this.width * .24, 92, 175); }

        hitObstacle() {
            const game = this.game;
            game.hull -= 1;
            game.invulnerable = 1.35;
            game.vy += game.y > (this.safeBounds().top + this.safeBounds().bottom) / 2 ? -92 : 92;
            game.mood = game.hull <= 0 ? "failure" : "angry";
            game.moodUntil = game.elapsed + 1;
            game.moodStarted = game.elapsed;
            this.refreshHud(true);
            if (game.hull <= 0) {
                game.failureAt = game.elapsed;
                this.clearInput();
                this.state = "failure";
            }
        }

        activateSonar() {
            if (this.state !== "playing" || !this.game || this.game.sonarCooldown > 0) return;
            const game = this.game;
            game.sonarCooldown = 4.5;
            game.sonarAge = 0;
            game.objects.forEach((object) => {
                if (object.kind === "research" && object.hidden && Math.abs(object.x - game.worldX) < this.width * .8 && Math.abs(object.y - game.y) < this.height * .7) {
                    object.revealedUntil = game.elapsed + 2.8;
                }
            });
            this.refreshSonarHud();
        }

        startFrame() {
            if (this.animationFrame || this.closed) return;
            this.animationFrame = window.requestAnimationFrame((time) => this.frame(time));
        }

        stopFrame() {
            if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
            this.animationFrame = 0;
            this.lastFrameTime = 0;
        }

        frame(now) {
            this.animationFrame = 0;
            if (this.closed || !["playing", "failure"].includes(this.state)) return;
            const dt = this.lastFrameTime ? clamp((now - this.lastFrameTime) / 1000, 0, .05) : 0;
            this.lastFrameTime = now;
            if (dt > 0) this.update(dt);
            this.drawFrame();
            if (["playing", "failure"].includes(this.state)) this.animationFrame = window.requestAnimationFrame((time) => this.frame(time));
        }

        drawBackground(ctx, width, height, game) {
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, "#0c0818"); gradient.addColorStop(.52, "#111129"); gradient.addColorStop(1, "#080a17");
            ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);

            // Faint distant light shafts and suspended sensing points.
            for (let i = 0; i < 4; i++) {
                const x = mod(i * 237 - game.worldX * .12, width + 160) - 80;
                const shaft = ctx.createLinearGradient(x, 0, x + 90, height * .76);
                shaft.addColorStop(0, "rgba(170, 133, 211, .075)"); shaft.addColorStop(1, "rgba(145, 194, 213, 0)");
                ctx.fillStyle = shaft;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 62, 0); ctx.lineTo(x + 210, height * .72); ctx.lineTo(x + 162, height * .72); ctx.closePath(); ctx.fill();
            }
            ctx.fillStyle = "rgba(193, 175, 220, .45)";
            for (let i = 0; i < 28; i++) {
                const x = mod(i * 113 - game.worldX * (.08 + (i % 3) * .03), width);
                const y = mod(i * 59 + Math.sin(game.elapsed * .4 + i) * 15, height * .86);
                ctx.globalAlpha = .18 + (i % 4) * .06;
                ctx.beginPath(); ctx.arc(x, y, .7 + (i % 3) * .35, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;

            const floorBase = height - 34;
            ctx.fillStyle = "rgba(17, 14, 28, .92)";
            ctx.beginPath(); ctx.moveTo(0, height);
            for (let x = 0; x <= width + 24; x += 24) ctx.lineTo(x, floorBase + Math.sin((x + game.worldX * .55) * .012) * 11 + Math.sin((x + game.worldX * .24) * .027) * 4);
            ctx.lineTo(width, height); ctx.closePath(); ctx.fill();
            for (let line = 0; line < 3; line++) {
                ctx.beginPath();
                for (let x = 0; x <= width + 24; x += 24) {
                    const y = floorBase - 9 - line * 12 + Math.sin((x + game.worldX * .42 + line * 30) * .012) * 10;
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = `rgba(167, 139, 205, ${.11 - line * .02})`;
                ctx.lineWidth = 1; ctx.stroke();
            }

            if (!reduceMotion.matches) {
                // Small, deterministic kelp silhouettes parallax near the seabed.
                for (let i = 0; i < 7; i++) {
                    const x = mod(i * 187 - game.worldX * .32, width + 70) - 35;
                    const base = height - 38 + Math.sin(x * .03) * 5;
                    ctx.strokeStyle = "rgba(70, 108, 111, .38)";
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x - 15, base - 28, x + Math.sin(game.elapsed + i) * 5, base - 57); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x + 2, base - 15); ctx.quadraticCurveTo(x + 16, base - 24, x + 10, base - 34); ctx.stroke();
                }
            }
        }

        drawObstacle(ctx, object, screenX, game) {
            ctx.save(); ctx.translate(screenX, object.y);
            if (object.kind === "rock") {
                const fill = ctx.createLinearGradient(-object.radius, -object.radius, object.radius, object.radius);
                fill.addColorStop(0, "#49405b"); fill.addColorStop(1, "#191626");
                ctx.fillStyle = fill; ctx.strokeStyle = "rgba(177, 151, 211, .65)"; ctx.lineWidth = 1.5;
                ctx.beginPath();
                object.vertices.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.strokeStyle = "rgba(187, 162, 218, .36)";
                for (let i = 0; i < object.vertices.length; i += 2) {
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(object.vertices[i][0], object.vertices[i][1]); ctx.stroke();
                    ctx.fillStyle = "#b79be0"; ctx.beginPath(); ctx.arc(object.vertices[i][0], object.vertices[i][1], 1.9, 0, Math.PI * 2); ctx.fill();
                }
            } else {
                ctx.strokeStyle = "#728583"; ctx.lineWidth = 3; ctx.lineCap = "round";
                ctx.beginPath(); ctx.moveTo(0, object.radius); ctx.quadraticCurveTo(-8, 0, -3, -object.radius); ctx.stroke();
                for (let i = 0; i < 4; i++) {
                    const side = i % 2 ? 1 : -1;
                    const y = object.radius - i * object.radius * .48;
                    const tipX = side * (object.radius * (.62 + (i % 3) * .12));
                    const tipY = y - 11;
                    ctx.beginPath(); ctx.moveTo(-3, y); ctx.quadraticCurveTo(tipX * .6, y - 2, tipX, tipY); ctx.stroke();
                    ctx.fillStyle = i % 2 ? "#a489c6" : "#e1b942"; ctx.beginPath(); ctx.arc(tipX, tipY, 2.4, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.restore();
        }

        drawResearch(ctx, object, x, game) {
            const revealed = !object.hidden || object.revealedUntil >= game.elapsed;
            if (!revealed) return;
            const pulse = 1 + Math.sin(game.elapsed * 4 + object.phase) * .08;
            ctx.save(); ctx.translate(x, object.y); ctx.scale(pulse, pulse);
            const color = object.value === 100n ? "#f5ca42" : object.value === 50n ? "#8de2eb" : "#c7a6ff";
            ctx.shadowColor = color; ctx.shadowBlur = 13;
            if (object.value === 50n) {
                ctx.fillStyle = "rgba(35, 70, 91, .92)"; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.roundRect(-9, -12, 18, 24, 5); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(5, -4); ctx.moveTo(-5, 3); ctx.lineTo(5, 3); ctx.stroke();
            } else {
                ctx.strokeStyle = color; ctx.lineWidth = 1.4;
                ctx.beginPath(); ctx.arc(0, 0, object.radius + 3, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-object.radius, 0); ctx.lineTo(object.radius, 0); ctx.moveTo(0, -object.radius); ctx.lineTo(0, object.radius); ctx.stroke();
                ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, object.radius * .38, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0; ctx.restore();
        }

        drawFrame() {
            if (!this.worldCtx || !this.game || !this.width || !this.height) return;
            const ctx = this.worldCtx;
            const width = this.width;
            const height = this.height;
            const game = this.game;
            const playerX = this.playerScreenX();
            this.drawBackground(ctx, width, height, game);

            // Background landmarks are computed from distance rather than stored in a growing list.
            const landmarkStart = Math.floor(game.worldX / 365) - 1;
            for (let i = 0; i < 7; i++) {
                const index = landmarkStart + i;
                const x = mod(index * 365 - game.worldX * .48, width + 180) - 90;
                const y = height * (.3 + (Math.abs(index * 17) % 4) * .075);
                ctx.strokeStyle = "rgba(95, 91, 128, .32)";
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(x - 34, y + 35); ctx.lineTo(x, y - 14); ctx.lineTo(x + 28, y + 32); ctx.stroke();
                ctx.fillStyle = "rgba(178, 155, 219, .45)"; ctx.beginPath(); ctx.arc(x, y - 14, 2.2, 0, Math.PI * 2); ctx.fill();
            }

            for (const object of game.objects) {
                const screenX = playerX + object.x - game.worldX;
                if (screenX < -100 || screenX > width + 100) continue;
                if (object.kind === "research") this.drawResearch(ctx, object, screenX, game);
                else this.drawObstacle(ctx, object, screenX, game);
            }

            if (game.sonarAge >= 0 && game.sonarAge < 1.12) {
                const progress = game.sonarAge / 1.12;
                const radius = progress * Math.max(width, height) * .78;
                ctx.save(); ctx.globalAlpha = (1 - progress) * .72;
                ctx.strokeStyle = "#a4e3ed"; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(playerX, game.y, radius, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = "rgba(183, 148, 232, .78)"; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(playerX, game.y, radius * .86, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }

            if (game.invulnerable > 0 && Math.floor(game.elapsed * 12) % 2 === 0) ctx.globalAlpha = .63;
            const mood = this.state === "failure" ? "failure" : game.mood;
            const submarineScale = clamp(width / 470, .72, 1.04);
            const angerProgress = clamp((game.elapsed - game.moodStarted) / Math.max(.01, game.moodUntil - game.moodStarted), 0, 1);
            const angerAmount = game.mood === "angry" ? Math.sin(angerProgress * Math.PI) : 0;
            drawSubmarine(ctx, playerX, game.y, submarineScale, mood, game.elapsed, true, angerAmount);
            ctx.globalAlpha = 1;

            if (game.invulnerable > 1.05) {
                ctx.strokeStyle = "rgba(255, 208, 93, .42)"; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(playerX, game.y, 43 * submarineScale, 0, Math.PI * 2); ctx.stroke();
            }
        }

        refreshHud(force) {
            if (!this.game) return;
            const game = this.game;
            const distanceText = game.distance < 1000 ? `${Math.floor(game.distance)} m` : `${(game.distance / 1000).toFixed(1)} km`;
            const distanceBucket = Math.floor(game.distance / 10);
            if (force || this.hud.score.textContent !== formatScore(game.score)) this.hud.score.textContent = formatScore(game.score);
            if (force || this.hud.best.textContent !== formatScore(game.best)) this.hud.best.textContent = formatScore(game.best);
            if (force || game.lastDistanceHud === distanceBucket) this.hud.distance.textContent = distanceText;
            this.hud.hull.forEach((node, index) => node.classList.toggle("is-empty", index >= game.hull));
            if (force) this.refreshSonarHud();
        }

        refreshSonarHud() {
            if (!this.game || !this.hud.sonarButton) return;
            const remain = this.game.sonarCooldown;
            const text = remain > 0 ? `SONAR ${remain.toFixed(1)}s` : "SONAR";
            if (this.game.lastHudSonar === text) return;
            this.game.lastHudSonar = text;
            this.hud.sonarButton.textContent = text;
            this.hud.sonarButton.setAttribute("aria-label", remain > 0 ? `Sonar recharging, ${remain.toFixed(1)} seconds` : "Activate sonar");
            this.hud.sonarButton.disabled = remain > 0;
        }

        setScreen(state) {
            this.state = state;
            this.playScreen.dataset.state = state;
            this.introScreen.hidden = state !== "intro";
            this.playScreen.hidden = !["playing", "paused", "failure"].includes(state);
            this.gameoverScreen.hidden = state !== "gameover";
            this.root.classList.toggle("piku-game-screen-active", state !== "intro");
            this.hud.pauseModal.hidden = state !== "paused";
        }

        showGameOver() {
            if (this.state === "gameover") return;
            this.stopFrame();
            this.setScreen("gameover");
            const game = this.game;
            this.hud.resultScore.textContent = formatScore(game.score);
            this.hud.resultBest.textContent = formatScore(game.best);
            this.hud.resultDistance.textContent = game.distance < 1000 ? `${Math.floor(game.distance)} m` : `${(game.distance / 1000).toFixed(1)} km`;
            this.gameoverScreen.querySelector('[data-action="restart"]').focus({ preventScroll: true });
        }

        pause(moveFocus = true) {
            if (this.state !== "playing") return;
            this.stopFrame(); this.clearInput(); this.setScreen("paused");
            if (moveFocus) this.hud.pauseModal.querySelector('[data-action="resume"]').focus({ preventScroll: true });
        }

        resume() {
            if (this.state !== "paused") return;
            this.clearInput(); this.setScreen("playing");
            this.root.querySelector(".piku-world-canvas").focus({ preventScroll: true });
            this.lastFrameTime = 0; this.startFrame();
        }

        home() {
            if (this.closed) return;
            this.closed = true;
            this.stopFrame();
            this.abort.abort();
            if (this.resizeObserver) this.resizeObserver.disconnect();
            if (this.mascotTimer) window.clearTimeout(this.mascotTimer);
            this.clearInput();
            this.game?.objects.splice(0);
            this.game = null;
            document.body.style.overflow = this.previousOverflow;
            if (this.site) this.site.inert = this.previousSiteInert;
            document.body.classList.remove("nav-open");
            document.querySelector(".menu-toggle")?.setAttribute("aria-expanded", "false");
            document.documentElement.classList.remove("piku-game-active");
            this.root.remove();
            activeGame = null;
        }
    }

    window.PikuDeepDive = {
        open() {
            if (activeGame && !activeGame.closed) {
                activeGame.root.focus({ preventScroll: true });
                return;
            }
            activeGame = new PikuDeepDive();
            activeGame.mount();
        }
    };
})();
