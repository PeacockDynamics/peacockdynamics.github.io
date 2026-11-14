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
    let flightLogo = null;
    let flightAnimation = null;

    if (!overlay || !site || !skip || !caption || !captionIndex || !captionTitle || scenes.length !== 6) {
        root.classList.remove("intro-active");
        window.dispatchEvent(new Event("pd-intro-dismissed"));
        return;
    }

    // Each shot is a small 3D wireframe projected into the SVG viewBox. The
    // vertices are the balls; the edges are the sticks. Far-side edges dim
    // naturally, giving the models depth without adding decorative clutter.
    const createGraph = () => ({ vertices: [], edges: [] });
    const addVertex = (graph, x, y, z, options = {}) => {
        graph.vertices.push({ x, y, z, radius: options.radius || 4.6, accent: Boolean(options.accent) });
        return graph.vertices.length - 1;
    };
    const addEdge = (graph, a, b, kind = "model") => graph.edges.push({ a, b, kind });
    const addChain = (graph, points, kind = "model", options = {}) => {
        const vertices = points.map(([x, y, z], index) => addVertex(graph, x, y, z, {
            radius: options.radius || (index === 0 || index === points.length - 1 ? 5.4 : 4.2),
            accent: options.accent
        }));
        for (let index = 1; index < vertices.length; index += 1) addEdge(graph, vertices[index - 1], vertices[index], kind);
        return vertices;
    };

    const addUuv = (graph, { x = 0, y = 0, z = 0, scale = 1, yaw = 0, simple = false, hexagonal = false, tailFin = true } = {}) => {
        const ring = (station) => [
            ...(hexagonal
                ? [[station, 0.3, 0], [station, 0.15, 0.27], [station, -0.15, 0.27], [station, -0.3, 0], [station, -0.15, -0.27], [station, 0.15, -0.27]]
                : [[station, 0.29, 0], [station, 0.08, 0.32], [station, -0.27, 0], [station, 0.08, -0.32]])
        ].map(([localX, localY, localZ], index) => {
            const rotatedX = localX * Math.cos(yaw) + localZ * Math.sin(yaw);
            const rotatedZ = -localX * Math.sin(yaw) + localZ * Math.cos(yaw);
            const rearTaper = !simple && station < 0 ? 0.82 : 1;
            const depthScale = hexagonal ? rearTaper : 1;
            return addVertex(graph, x + rotatedX * scale, y + localY * scale * depthScale, z + rotatedZ * scale * depthScale, { radius: 4.4 });
        });

        const rear = ring(simple ? -0.35 : -0.78);
        const front = simple ? rear : ring(0.66);
        (simple ? [rear] : [rear, front]).forEach((loop) => loop.forEach((vertex, index) => addEdge(graph, vertex, loop[(index + 1) % loop.length])));
        if (!simple) rear.forEach((vertex, index) => addEdge(graph, vertex, front[index]));

        const nose = addVertex(graph, x + 1.22 * scale * Math.cos(yaw), y, z - 1.22 * scale * Math.sin(yaw), { radius: 5.6, accent: true });
        const tail = addVertex(graph, x - 1.25 * scale * Math.cos(yaw), y, z + 1.25 * scale * Math.sin(yaw), { radius: 5.1 });
        front.forEach((vertex) => addEdge(graph, vertex, nose));
        rear.forEach((vertex) => addEdge(graph, vertex, tail));

        if (tailFin) {
            const addStabilizer = (side) => {
                const localX = -1.28;
                const localZ = side * 0.66;
                const finTip = addVertex(
                    graph,
                    x + (localX * Math.cos(yaw) + localZ * Math.sin(yaw)) * scale,
                    y,
                    z + (-localX * Math.sin(yaw) + localZ * Math.cos(yaw)) * scale,
                    { radius: 3.9 }
                );
                addEdge(graph, rear[side > 0 ? (hexagonal ? 2 : 1) : (hexagonal ? 4 : 3)], finTip);
                addEdge(graph, finTip, tail);
            };
            addStabilizer(-1);
            addStabilizer(1);
        }
        return { nose, tail };
    };

    const addArrow = (graph, from, to, kind = "accent") => {
        const start = addVertex(graph, ...from, { radius: 4.5 });
        const tip = addVertex(graph, ...to, { radius: 6, accent: true });
        addEdge(graph, start, tip, kind);
        const [dx, dy, dz] = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
        const length = Math.hypot(dx, dy, dz) || 1;
        const side = [dy / length, -dx / length, 0];
        const wingA = addVertex(graph, to[0] - dx / length * 0.22 + side[0] * 0.15, to[1] - dy / length * 0.22 + side[1] * 0.15, to[2] - dz / length * 0.22 + side[2] * 0.15, { radius: 3.5 });
        const wingB = addVertex(graph, to[0] - dx / length * 0.22 - side[0] * 0.15, to[1] - dy / length * 0.22 - side[1] * 0.15, to[2] - dz / length * 0.22 - side[2] * 0.15, { radius: 3.5 });
        addEdge(graph, tip, wingA, kind);
        addEdge(graph, tip, wingB, kind);
    };

    const addBowViewUuv = (graph, scale = 1) => {
        const makeRing = (depth, width, height) => [
            [0, height], [width * 0.86, height * 0.5],
            [width * 0.86, -height * 0.5], [0, -height],
            [-width * 0.86, -height * 0.5], [-width * 0.86, height * 0.5]
        ].map(([x, y]) => addVertex(graph, x * scale, y * scale, depth * scale, { radius: 4.6 }));

        const bow = makeRing(0.62, 0.42, 0.36);
        const stern = makeRing(-0.78, 0.3, 0.26);
        bow.forEach((vertex, index) => addEdge(graph, vertex, bow[(index + 1) % bow.length]));
        stern.forEach((vertex, index) => addEdge(graph, vertex, stern[(index + 1) % stern.length]));
        bow.forEach((vertex, index) => addEdge(graph, vertex, stern[index]));

        const nose = addVertex(graph, 0, 0, 1.18 * scale, { radius: 6, accent: true });
        const tail = addVertex(graph, 0, 0, -1.25 * scale, { radius: 5.2 });
        bow.forEach((vertex) => addEdge(graph, vertex, nose));
        stern.forEach((vertex) => addEdge(graph, vertex, tail));

        // Two compact fins and a short propeller bar clarify the vehicle's stern.
        [-1, 1].forEach((side) => {
            const fin = addVertex(graph, side * 0.58 * scale, 0, -1.02 * scale, { radius: 4 });
            addEdge(graph, stern[side < 0 ? 5 : 1], fin);
            addEdge(graph, fin, tail);
        });
        const propA = addVertex(graph, -0.2 * scale, 0, -1.42 * scale, { radius: 3.8 });
        const propB = addVertex(graph, 0.2 * scale, 0, -1.42 * scale, { radius: 3.8 });
        addEdge(graph, tail, propA);
        addEdge(graph, tail, propB);
    };

    const shotGeometry = (() => {
        // 1. Show the UUV's bow and tapered hull from a three-quarter view.
        const vehicle = createGraph();
        addBowViewUuv(vehicle, 2.65);

        // 2. A small UUV maps a patch of seabed with a simple sonar fan.
        const sonar = createGraph();
        addUuv(sonar, { y: 1.25, scale: 1.45 });
        const seabed = [
            [-3, -1.7, -1.4], [3, -1.7, -1.4],
            [3, -1.7, 1.4], [-3, -1.7, 1.4]
        ].map(([px, py, pz], index) => addVertex(sonar, px, py, pz, { radius: 5.2, accent: index === 1 || index === 3 }));
        seabed.forEach((vertex, index) => addEdge(sonar, vertex, seabed[(index + 1) % seabed.length], "seabed"));
        const scanHits = [
            [-1.3, -1.7, -0.6], [0, -1.7, 0], [1.3, -1.7, 0.6]
        ].map((point, index) => addVertex(sonar, ...point, { radius: 6.5, accent: true }));
        const sensor = addVertex(sonar, 0.45, 0.85, 0, { radius: 4.8 });
        scanHits.forEach((hit) => addEdge(sonar, sensor, hit, "sonar"));

        // 3. A vehicle inside a transparent, perspective simulation volume.
        const simulation = createGraph();
        const box = [];
        for (const yy of [-1.4, 1.4]) {
            for (const zz of [-1.8, 1.8]) {
                for (const xx of [-2.2, 2.2]) box.push(addVertex(simulation, xx, yy, zz, { radius: 4.1 }));
            }
        }
        // Index order: y plane, z plane, x side. Connect the box's 12 edges.
        [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b]) => addEdge(simulation, box[a], box[b], "volume"));
        addUuv(simulation, { y: 0.05, z: 0.1, scale: 1.05, yaw: 0.16 });
        addChain(simulation, [[-1.2, -0.65, 0.15], [-0.25, -0.1, 0.25], [0.75, 0.25, 0.1]], "trajectory", { radius: 4.8, accent: true });

        // 4. Three UUVs form a legible, connected team.
        const fleet = createGraph();
        const fleetPositions = [
            { x: -1.9, y: 0.35, z: 0, yaw: 0.05 },
            { x: 1, y: 0.35, z: -1.5, yaw: -0.6 },
            { x: 1, y: 0.35, z: 1.5, yaw: 0.6 }
        ];
        const fleetCenters = fleetPositions.map((position) => addVertex(fleet, position.x, position.y + 0.45, position.z, { radius: 7.2, accent: true }));
        addEdge(fleet, fleetCenters[0], fleetCenters[1], "network");
        addEdge(fleet, fleetCenters[1], fleetCenters[2], "network");
        addEdge(fleet, fleetCenters[2], fleetCenters[0], "network");
        fleetPositions.forEach((position) => addUuv(fleet, { ...position, scale: 0.68, simple: true }));

        // 5. A sparse seabed grid and a single, readable lawnmower survey path.
        const survey = createGraph();
        const gridX = [-2.4, 0, 2.4];
        const gridZ = [-1.5, 0, 1.5];
        gridX.forEach((xx) => addChain(survey, gridZ.map((zz) => [xx, -1.25, zz]), "seabed"));
        gridZ.forEach((zz) => addChain(survey, gridX.map((xx) => [xx, -1.25, zz]), "seabed"));
        const route = [
            [-2, -0.98, -1.05], [2, -0.98, -1.05],
            [2, -0.98, 0], [-2, -0.98, 0],
            [-2, -0.98, 1.05], [2, -0.98, 1.05]
        ];
        addChain(survey, route, "route", { radius: 6.2, accent: true });
        addUuv(survey, { x: -2.15, y: -0.35, z: -1.05, scale: 0.72, simple: true });

        // 6. A UUV follows a 3D course with a small stern-control vector,
        // distinguishing active control from the standalone vehicle shot.
        const control = createGraph();
        addChain(control, [
            [-3.6, -0.38, 1.25], [-2.2, -0.05, 0.72],
            [-0.6, 0.22, 0.28], [1.2, 0.5, -0.28], [3.1, 0.68, -0.92]
        ], "trajectory");
        addUuv(control, { y: 0.18, z: 0.05, scale: 1.85, yaw: 0.4, hexagonal: true });
        addArrow(control, [-1.9, 0.12, 0.82], [-2.6, 0.68, 1.18]);

        return [vehicle, sonar, simulation, fleet, survey, control];
    })();

    const svgNS = "http://www.w3.org/2000/svg";
    const projection = (vertex) => [
        600 + (vertex.x - vertex.z) * 75,
        338 + ((vertex.x + vertex.z) * 0.46 - vertex.y) * 82
    ];
    const buildScene = (scene, graph, index) => {
        // Fit every domain graphic into the same invisible stage. This keeps
        // the fleet and other compact subjects as present as the larger models.
        const projectedVertices = graph.vertices.map(projection);
        const bounds = projectedVertices.reduce((current, [x, y]) => ({
            left: Math.min(current.left, x),
            right: Math.max(current.right, x),
            top: Math.min(current.top, y),
            bottom: Math.max(current.bottom, y)
        }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
        const frame = { x: 600, y: 338, width: 740, height: 460 };
        const fitScale = Math.min(
            frame.width / Math.max(1, bounds.right - bounds.left),
            frame.height / Math.max(1, bounds.bottom - bounds.top)
        );
        const boundsCenterX = (bounds.left + bounds.right) / 2;
        const boundsCenterY = (bounds.top + bounds.bottom) / 2;
        const fitPosition = (vertex) => {
            const [x, y] = projection(vertex);
            return [
                frame.x + (x - boundsCenterX) * fitScale,
                frame.y + (y - boundsCenterY) * fitScale
            ];
        };

        const appendLayer = (className, suffix) => {
            const layer = document.createElementNS(svgNS, "g");
            layer.setAttribute("class", className);
            const defs = document.createElementNS(svgNS, "defs");
            const ball = document.createElementNS(svgNS, "radialGradient");
            ball.setAttribute("id", `graph-ball-${index}-${suffix}`);
            ball.setAttribute("cx", "29%");
            ball.setAttribute("cy", "23%");
            ball.setAttribute("r", "78%");
            [["0%", "#effdff"], ["28%", "#83ddf2"], ["100%", "#2d668f"]].forEach(([offset, color]) => {
                const stop = document.createElementNS(svgNS, "stop");
                stop.setAttribute("offset", offset);
                stop.setAttribute("stop-color", color);
                ball.append(stop);
            });
            const gold = document.createElementNS(svgNS, "radialGradient");
            gold.setAttribute("id", `graph-gold-${index}-${suffix}`);
            gold.setAttribute("cx", "29%");
            gold.setAttribute("cy", "23%");
            [["0%", "#fff2ae"], ["34%", "#f4c950"], ["100%", "#9c6520"]].forEach(([offset, color]) => {
                const stop = document.createElementNS(svgNS, "stop");
                stop.setAttribute("offset", offset);
                stop.setAttribute("stop-color", color);
                gold.append(stop);
            });
            defs.append(ball, gold);
            const back = document.createElementNS(svgNS, "g");
            back.setAttribute("class", "graph-lines-back");
            const front = document.createElementNS(svgNS, "g");
            front.setAttribute("class", "graph-lines");
            const accents = document.createElementNS(svgNS, "g");
            accents.setAttribute("class", "graph-lines-accent");
            const links = document.createElementNS(svgNS, "g");
            links.setAttribute("class", "graph-links");

            graph.edges.forEach((edge) => {
                const a = graph.vertices[edge.a];
                const b = graph.vertices[edge.b];
                const [x1, y1] = fitPosition(a);
                const [x2, y2] = fitPosition(b);
                const line = document.createElementNS(svgNS, "path");
                line.setAttribute("d", `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`);
                if (edge.kind === "network") links.append(line);
                else if (edge.kind === "accent" || edge.kind === "route") accents.append(line);
                else if ((a.z + b.z) < -0.04) back.append(line);
                else front.append(line);
            });

            const points = document.createElementNS(svgNS, "g");
            points.setAttribute("class", "graph-points");
            graph.vertices
                .map((vertex) => ({ vertex, position: fitPosition(vertex) }))
                .sort((a, b) => a.vertex.z - b.vertex.z)
                .forEach(({ vertex, position: [cx, cy] }) => {
                    const circle = document.createElementNS(svgNS, "circle");
                    circle.setAttribute("cx", cx.toFixed(1));
                    circle.setAttribute("cy", cy.toFixed(1));
                    circle.setAttribute("r", String(vertex.radius * fitScale));
                    circle.setAttribute("class", `graph-node${vertex.accent ? " graph-node-accent" : ""}${vertex.z < -0.04 ? " graph-node-back" : ""}`);
                    circle.setAttribute("fill", `url(#graph-${vertex.accent ? "gold" : "ball"}-${index}-${suffix})`);
                    points.append(circle);
                });

            layer.append(defs, links, back, front, accents, points);
            return layer;
        };
        scene.replaceChildren(appendLayer("art-base", "base"), appendLayer("art-lit", "lit"));
    };
    scenes.forEach((scene, index) => buildScene(scene, shotGeometry[index], index));

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
        flightAnimation?.cancel();
        flightAnimation = null;
        flightLogo?.remove();
        flightLogo = null;
        scenes.forEach((scene) => scene.classList.remove("is-active"));
        caption.classList.remove("is-active");
        convergence.classList.remove("is-active");
        lockup.classList.remove("is-active");
        root.classList.remove("intro-active", "intro-fading", "intro-handoff");
        overlay.setAttribute("aria-hidden", "true");
        site.inert = false;
        document.body.style.removeProperty("overflow");
        if (overlay.contains(document.activeElement)) skip.blur();
        window.dispatchEvent(new Event("pd-intro-dismissed"));
    };

    const createLogoFlight = () => {
        const source = lockup.querySelector(".intro-logo-mark");
        const target = document.querySelector(".brand-logo-shell");
        if (!source || !target || typeof source.animate !== "function") return null;

        const from = source.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        if (!from.width || !from.height || !to.width || !to.height) return null;

        const flight = source.cloneNode(true);
        flight.className = "intro-flight-logo";
        flight.setAttribute("aria-hidden", "true");
        flight.querySelector(".intro-logo-glint")?.remove();
        Object.assign(flight.style, {
            left: `${from.left}px`,
            top: `${from.top}px`,
            width: `${from.width}px`,
            height: `${from.height}px`
        });
        document.body.append(flight);

        try {
            const animation = flight.animate([
                { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` },
                { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` }
            ], {
                duration: 1120,
                easing: "cubic-bezier(.2, .72, .2, 1)",
                fill: "forwards"
            });
            return { element: flight, animation };
        } catch (error) {
            flight.remove();
            return null;
        }
    };

    const beginDismiss = ({ handoff = false } = {}) => {
        if (finished || root.classList.contains("intro-fading")) return;
        clearTimers();
        const logoFlight = handoff && !reducedMotion.matches ? createLogoFlight() : null;
        root.classList.add("intro-fading");
        site.inert = false;
        if (logoFlight) {
            flightLogo = logoFlight.element;
            flightAnimation = logoFlight.animation;
            root.classList.add("intro-handoff");
            overlay.setAttribute("aria-hidden", "true");
            flightAnimation.onfinish = () => release();
            later(release, 1500);
            return;
        }
        later(release, 736);
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

    const playIntro = () => {
        if (reducedMotion.matches) return;
        clearTimers();
        finished = false;
        scenes.forEach((scene) => scene.classList.remove("is-active"));
        caption.classList.remove("is-active");
        convergence.classList.remove("is-active");
        lockup.classList.remove("is-active");
        root.classList.remove("intro-fading");
        root.classList.add("intro-active");
        site.inert = true;
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        skip.focus({ preventScroll: true });

        window.__pdIntroFailsafe = window.setTimeout(() => {
            if (!finished) release();
        }, 9800);

        // The sequence runs at 1.25x; the final logo/tagline hold includes one
        // extra second so the Sanskrit line has time to be read.
        later(() => {
            let shot = 0;
            const advance = () => {
                if (finished) return;
                if (shot < 6) {
                    startScene(shot);
                    shot += 1;
                    later(advance, 640);
                    return;
                }
                scenes.forEach((scene) => scene.classList.remove("is-active"));
                caption.classList.remove("is-active");
                convergence.classList.add("is-active");
                later(() => {
                    convergence.classList.remove("is-active");
                    lockup.classList.add("is-active");
                    later(() => beginDismiss({ handoff: true }), 2520);
                }, 720);
            };
            advance();
        }, 400);
    };

    skip.addEventListener("click", beginDismiss);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !finished) beginDismiss();
    });

    const onMotionChange = (event) => {
        if (event.matches) beginDismiss();
    };
    reducedMotion.addEventListener?.("change", onMotionChange);
    playIntro();
})();
