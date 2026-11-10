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
        "UUV Autonomy",
        "Spatial Perception & Mapping",
        "Simulation-First Engineering",
        "Multi-Agent Coordination",
        "Path Planning & Navigation",
        "Dynamics & Control"
    ];
    let finished = false;

    if (!overlay || !site || !skip || !caption || !captionIndex || !captionTitle || scenes.length !== 6) {
        root.classList.remove("intro-active");
        window.dispatchEvent(new Event("pd-intro-dismissed"));
        return;
    }

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
