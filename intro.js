"use strict";

(() => {
    const root = document.documentElement;
    if (!root.classList.contains("intro-active")) return;

    const overlay = document.querySelector("#cinematic-intro");
    const site = document.querySelector(".site-frame");
    const skip = document.querySelector("#intro-skip");
    const scenes = Array.from(document.querySelectorAll(".intro-scene"));
    const caption = document.querySelector(".intro-caption");
    const captionIndex = document.querySelector(".intro-caption-index");
    const captionTitle = document.querySelector(".intro-caption-title");
    const convergence = document.querySelector(".intro-convergence");
    const lockup = document.querySelector(".intro-lockup");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Set();
    const capabilities = [
        "Underwater Vehicle",
        "Sonar Mapping",
        "UUV Simulation",
        "Fleet Coordination",
        "Survey Planning",
        "UUV Control"
    ];
    let finished = false;

    if (!overlay || !site || !skip || !caption || !captionIndex || !captionTitle || scenes.length !== 6) {
        root.classList.remove("intro-active");
        window.dispatchEvent(new Event("pd-intro-dismissed"));
        return;
    }

    // Every frame uses connected graph geometry. A shared UUV outline keeps
    // each scene immediately recognizable while the surrounding graph changes
    // to show sensing, simulation, coordination, navigation, or control.
    const uuvProfile = {
        paths: [
            "M-58 0 -46 -11 -27 -18 18 -18 43 -12 58 0 43 12 18 18 -27 18 -46 11Z",
            "M-48 0 -27 -18 M-48 0 -27 18 M-27 -18 -16 0 -27 18 M-16 0 18 -18 M-16 0 18 18 M18 -18 31 0 18 18 M-46 0 43 0",
            "M-51 -9 -62 -21 -30 -16 M-51 9 -62 21 -30 16 M-58 0 -69 -8 M-58 0 -69 8 M-68 -8V8",
            "M43 -7V7 M49 -5V5 M58 0Q70 -10 78 0 M58 0Q70 10 78 0"
        ],
        nodes: [[-58,0],[-46,-11],[-46,11],[-27,-18],[-27,18],[-16,0],[18,-18],[18,18],[31,0],[43,-12],[43,0],[43,12],[58,0],[-62,-21],[-62,21],[-69,-8],[-69,8],[78,0]]
    };

    // The same UUV is framed differently in each shot. Fine graph edges and
    // sampled points keep the artwork light and consistent with the brand.
    const shotGeometry = [
        {
            paths: [
                // Close vehicle profile, bottom contours and sonar returns.
                "M170 448Q330 416 475 448T770 444T1050 408 M190 480Q350 452 500 479T790 476T1040 443 M250 512Q405 485 558 511T830 507T1015 479",
                "M866 288Q940 330 866 372 M879 268Q980 330 879 392 M891 246Q1020 330 891 414 M842 330 866 288 M842 330 866 372 M842 330 879 268 M842 330 879 392",
                "M260 208 350 230 440 214 530 236 M950 218 1010 194 1080 220 M230 270 300 252 M980 470 1060 488"
            ],
            nodes: [[170,448],[330,416],[475,448],[620,438],[770,444],[910,422],[1050,408],[190,480],[350,452],[500,479],[650,468],[790,476],[930,456],[1040,443],[250,512],[405,485],[558,511],[700,500],[830,507],[1015,479],[866,288],[866,372],[879,268],[879,392],[891,246],[891,414],[940,330],[980,330],[1020,330],[350,230],[440,214],[530,236],[1010,194],[1080,220],[300,252],[1060,488]],
            vehicles: [{ x: 590, y: 330, scale: 4.5 }]
        },
        {
            paths: [
                // Forward-looking sonar from a surveying UUV to a sampled seabed.
                "M830 260 690 438 M830 260 770 455 M830 260 870 455 M830 260 980 438",
                "M735 335Q830 270 925 335 M700 360Q830 260 960 360 M670 390Q830 250 990 390",
                "M100 490 190 458 285 474 380 432 475 448 570 410 665 428 760 394 855 410 950 376 1095 394",
                "M90 528 180 498 275 514 370 472 465 488 560 450 655 468 750 434 845 450 940 416 1105 434",
                "M130 566 220 536 315 552 410 510 505 526 600 488 695 506 790 472 885 488 980 454 1110 472",
                "M190 458 180 498 220 536 M285 474 275 514 315 552 M380 432 370 472 410 510 M475 448 465 488 505 526 M570 410 560 450 600 488 M665 428 655 468 695 506 M760 394 750 434 790 472 M855 410 845 450 885 488 M950 376 940 416 980 454"
            ],
            nodes: [[100,490],[190,458],[285,474],[380,432],[475,448],[570,410],[665,428],[760,394],[855,410],[950,376],[1095,394],[90,528],[180,498],[275,514],[370,472],[465,488],[560,450],[655,468],[750,434],[845,450],[940,416],[1105,434],[130,566],[220,536],[315,552],[410,510],[505,526],[600,488],[695,506],[790,472],[885,488],[980,454],[1110,472],[690,438],[770,455],[870,455],[980,438],[830,260],[735,335],[925,335],[700,360],[960,360],[670,390],[990,390]],
            vehicles: [{ x: 660, y: 248, scale: 2.35 }]
        },
        {
            paths: [
                // Virtual test volume, coordinate axes and vehicle trajectory.
                "M250 205 520 150 950 205 680 262Z M250 205V475L680 545V262 M680 262V545L950 475V205 M250 475 520 418 950 475",
                "M330 188V492 M415 171V506 M520 150V522 M800 178V510 M250 295 680 352 950 295 M250 385 680 442 950 385",
                "M180 570 360 540 520 562 710 526 900 548 1080 516 M185 605 365 575 525 597 715 561 905 583 1085 551",
                "M335 365Q420 305 500 340T650 364T790 300T900 318 M335 365 352 345 M335 365 359 369",
                "M520 340 530 322 M650 364 660 345 M790 300 800 281 M900 318 910 299",
                "M1000 255V355 M1000 255 988 277 M1000 255 1012 277 M1025 280H1090 M1090 280 1070 268 M1090 280 1070 292"
            ],
            nodes: [[250,205],[520,150],[950,205],[680,262],[250,475],[680,545],[950,475],[330,188],[415,171],[800,178],[250,295],[680,352],[950,295],[250,385],[680,442],[950,385],[180,570],[360,540],[520,562],[710,526],[900,548],[1080,516],[185,605],[365,575],[525,597],[715,561],[905,583],[1085,551],[335,365],[420,305],[500,340],[650,364],[790,300],[900,318],[1000,255],[1090,280]],
            vehicles: [{ x: 625, y: 360, scale: 2.25 }]
        },
        {
            paths: [
                // Six UUVs share state over a symmetric cycle graph.
                "M600 160 830 250 830 425 600 515 370 425 370 250Z",
                "M600 160 600 515 M830 250 370 425 M830 425 370 250",
                "M125 552Q300 520 465 550T790 548T1080 516 M145 584Q320 554 485 582T810 580T1060 550 M180 615Q350 586 515 612T830 610T1035 582"
            ],
            nodes: [[600,160],[830,250],[830,425],[600,515],[370,425],[370,250],[600,338],[715,205],[830,338],[715,470],[485,470],[370,338],[485,205]],
            nodeRadii: [8,8,8,8,8,8,3.3,3.3,3.3,3.3,3.3,3.3,3.3],
            vehicles: [
                { x: 600, y: 160, scale: 0.92 },{ x: 830, y: 250, scale: 0.92 },
                { x: 830, y: 425, scale: 0.92 },{ x: 600, y: 515, scale: 0.92 },
                { x: 370, y: 425, scale: 0.92 },{ x: 370, y: 250, scale: 0.92 }
            ]
        },
        {
            paths: [
                // Planned route curves around two mapped obstacles.
                "M370 365Q490 365 540 315T680 285T820 315T970 270T1090 270",
                "M370 365 395 350 M370 365 395 380 M540 315 526 323 M540 315 553 327 M680 285 666 293 M680 285 693 297 M820 315 806 323 M820 315 833 327 M970 270 956 278 M970 270 983 282",
                "M110 492 220 468 330 484 440 450 550 466 660 432 770 448 880 414 990 430 1100 396",
                "M90 530 200 506 310 522 420 488 530 504 640 470 750 486 860 452 970 468 1080 434",
                "M170 570 280 546 390 562 500 528 610 544 720 510 830 526 940 492 1050 508",
                "M650 348 675 328 700 348 675 368Z M870 385 897 363 924 385 897 407Z M650 348V432 M675 328V432 M700 348V432 M870 385V455 M897 363V440 M924 385V430",
                "M405 365 485 422 M405 365 520 400 M405 365 480 335"
            ],
            nodes: [[110,492],[220,468],[330,484],[440,450],[550,466],[660,432],[770,448],[880,414],[990,430],[1100,396],[90,530],[200,506],[310,522],[420,488],[530,504],[640,470],[750,486],[860,452],[970,468],[1080,434],[170,570],[280,546],[390,562],[500,528],[610,544],[720,510],[830,526],[940,492],[1050,508],[675,328],[650,348],[700,348],[675,368],[897,363],[870,385],[924,385],[897,407],[370,365],[540,315],[680,285],[820,315],[970,270],[1090,270],[485,422],[520,400],[480,335]],
            vehicles: [{ x: 340, y: 365, scale: 2.05 }]
        },
        {
            paths: [
                // Vehicle motion, attitude axes, thrust vectors and feedback loop.
                "M220 330Q320 230 430 270T610 330T800 282T1000 320 M235 350Q330 260 430 292",
                "M600 225V270 M600 225 585 247 M600 225 615 247 M600 410V455 M600 455 585 433 M600 455 615 433",
                "M470 340H520 M470 340 492 327 M470 340 492 353 M690 340H745 M745 340 723 327 M745 340 723 353",
                "M315 465H440V430Q440 405 465 405H520 M680 405H735Q760 405 760 430V465H885 M315 465V500H885V465",
                "M315 465 295 450 M315 465 295 480 M885 465 905 450 M885 465 905 480",
                "M520 205Q600 160 680 205 M495 220Q600 145 705 220 M520 475Q600 520 680 475"
            ],
            nodes: [[220,330],[320,230],[430,270],[610,330],[800,282],[1000,320],[235,350],[430,292],[600,225],[600,270],[600,410],[600,455],[470,340],[520,340],[690,340],[745,340],[315,465],[440,430],[520,405],[680,405],[760,430],[885,465],[315,500],[885,500],[520,205],[600,160],[680,205],[495,220],[705,220],[520,475],[600,520],[680,475]],
            vehicles: [{ x: 600, y: 340, scale: 2.95 }]
        }
    ];
    const svgNS = "http://www.w3.org/2000/svg";
    const buildScene = (scene, geometry) => {
        const appendLayer = (className) => {
            const layer = document.createElementNS(svgNS, "g");
            layer.setAttribute("class", className);
            const lines = document.createElementNS(svgNS, "g");
            lines.setAttribute("class", "graph-lines");
            geometry.paths.forEach((d) => {
                const path = document.createElementNS(svgNS, "path");
                path.setAttribute("d", d);
                lines.append(path);
            });
            (geometry.vehicles || []).forEach((vehicle) => {
                const group = document.createElementNS(svgNS, "g");
                group.setAttribute("class", "uuv-graph");
                group.setAttribute("transform", `translate(${vehicle.x} ${vehicle.y}) rotate(${vehicle.angle || 0}) scale(${vehicle.scale || 1})`);
                uuvProfile.paths.forEach((d) => {
                    const path = document.createElementNS(svgNS, "path");
                    path.setAttribute("d", d);
                    group.append(path);
                });
                lines.append(group);
            });
            const points = document.createElementNS(svgNS, "g");
            points.setAttribute("class", "graph-points");
            geometry.nodes.forEach(([cx, cy], index) => {
                const circle = document.createElementNS(svgNS, "circle");
                circle.setAttribute("cx", cx);
                circle.setAttribute("cy", cy);
                circle.setAttribute("r", geometry.nodeRadii?.[index] || (index % 5 === 0 ? "5.5" : "3.4"));
                points.append(circle);
            });
            (geometry.vehicles || []).forEach((vehicle) => {
                const group = document.createElementNS(svgNS, "g");
                group.setAttribute("class", "uuv-graph-nodes");
                group.setAttribute("transform", `translate(${vehicle.x} ${vehicle.y}) rotate(${vehicle.angle || 0}) scale(${vehicle.scale || 1})`);
                uuvProfile.nodes.forEach(([cx, cy]) => {
                    const circle = document.createElementNS(svgNS, "circle");
                    circle.setAttribute("cx", cx);
                    circle.setAttribute("cy", cy);
                    circle.setAttribute("r", "1.45");
                    group.append(circle);
                });
                points.append(group);
            });
            layer.append(lines, points);
            return layer;
        };
        scene.replaceChildren(appendLayer("art-base"), appendLayer("art-lit"));
    };
    scenes.forEach((scene, index) => buildScene(scene, shotGeometry[index]));

    site.inert = true;
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    skip.focus({ preventScroll: true });

    const later = (callback, delay) => {
        const timer = window.setTimeout(() => {
            timers.delete(timer);
            callback();
        }, delay);
        timers.add(timer);
        return timer;
    };

    const clearTimers = () => {
        timers.forEach(window.clearTimeout);
        timers.clear();
        if (window.__pdIntroFailsafe) {
            window.clearTimeout(window.__pdIntroFailsafe);
            window.__pdIntroFailsafe = null;
        }
    };

    const release = () => {
        if (finished) return;
        finished = true;
        clearTimers();
        scenes.forEach((scene) => scene.classList.remove("is-active"));
        caption.classList.remove("is-active");
        convergence.classList.remove("is-active");
        lockup.classList.remove("is-active");
        root.classList.remove("intro-active", "intro-fading");
        overlay.setAttribute("aria-hidden", "true");
        site.inert = root.classList.contains("device-choice-active");
        document.body.style.removeProperty("overflow");
        if (overlay.contains(document.activeElement)) skip.blur();
        window.dispatchEvent(new Event("pd-intro-dismissed"));
    };

    const beginDismiss = () => {
        if (finished || root.classList.contains("intro-fading")) return;
        clearTimers();
        root.classList.add("intro-fading");
        site.inert = root.classList.contains("device-choice-active");
        later(release, 920);
    };

    const startScene = (index) => {
        if (finished) return;
        scenes.forEach((scene, current) => {
            scene.classList.toggle("is-active", current === index);
            scene.dataset.direction = current % 2 === 0 ? "ltr" : "rtl";
        });
        scenes[index].setAttribute("aria-label", `Scene ${index + 1} of 6`);
        caption.classList.remove("is-active");
        caption.dataset.shot = String(index + 1);
        captionIndex.textContent = `${String(index + 1).padStart(2, "0")} / 06`;
        captionTitle.textContent = capabilities[index];
        void caption.offsetWidth;
        caption.classList.add("is-active");
    };

    // Timing from first paint: 0.5s dark, six 0.8s shots, 0.9s convergence,
    // 1.9s logo hold, and a 0.9s dissolve. Total: exactly 9.0 seconds.
    later(() => {
        let shot = 0;
        const advance = () => {
            if (finished) return;
            if (shot < 6) {
                startScene(shot);
                shot += 1;
                later(advance, 800);
                return;
            }
            scenes.forEach((scene) => scene.classList.remove("is-active"));
            caption.classList.remove("is-active");
            convergence.classList.add("is-active");
            later(() => {
                convergence.classList.remove("is-active");
                lockup.classList.add("is-active");
                later(beginDismiss, 1900);
            }, 900);
        };
        advance();
    }, 500);

    skip.addEventListener("click", beginDismiss);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !finished) beginDismiss();
    });

    const onMotionChange = (event) => {
        if (event.matches) beginDismiss();
    };
    reducedMotion.addEventListener?.("change", onMotionChange);
})();
