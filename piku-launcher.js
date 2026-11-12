"use strict";

/* The launcher stays tiny; the game engine and its styles load on demand. */
(() => {
    let stylesPromise = null;
    let gamePromise = null;

    const loadStyles = () => {
        if (document.querySelector('link[data-piku-styles]')?.sheet) return Promise.resolve();
        if (stylesPromise) return stylesPromise;
        stylesPromise = new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "piku-game.css?v=20261112-4";
            link.dataset.pikuStyles = "true";
            link.onload = resolve;
            link.onerror = () => {
                link.remove();
                stylesPromise = null;
                reject(new Error("Piku styles could not be loaded."));
            };
            document.head.append(link);
        });
        return stylesPromise;
    };

    const loadGame = () => {
        if (window.PikuDeepDive) return Promise.resolve(window.PikuDeepDive);
        if (gamePromise) return gamePromise;
        gamePromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "piku-game.js?v=20261112-4";
            script.onload = () => window.PikuDeepDive ? resolve(window.PikuDeepDive) : reject(new Error("Piku game did not initialize."));
            script.onerror = () => {
                script.remove();
                gamePromise = null;
                reject(new Error("Piku game could not be loaded."));
            };
            document.head.append(script);
        });
        return gamePromise;
    };

    document.addEventListener("click", async (event) => {
        const trigger = event.target instanceof Element ? event.target.closest("[data-meet-piku]") : null;
        if (!trigger || trigger.disabled) return;
        event.preventDefault();
        trigger.setAttribute("aria-busy", "true");
        try {
            await loadStyles();
            const game = await loadGame();
            await game.open();
        } catch (error) {
            console.error("Piku could not open.", error);
            trigger.focus({ preventScroll: true });
        } finally {
            trigger.removeAttribute("aria-busy");
        }
    });
})();
