"use strict";

/* ================================================================
   PEACOCK DYNAMICS
   Single-page website interaction script
   ================================================================ */


/* Add the JavaScript-enabled class immediately. */

document.documentElement.classList.add("js");


document.addEventListener("DOMContentLoaded", () => {

    /* ============================================================
       1. ELEMENT REFERENCES
       ============================================================ */

    const body = document.body;

    const menuToggle = document.querySelector(".menu-toggle");

    const sidebar = document.querySelector("#site-navigation");

    const navLinks = Array.from(
        document.querySelectorAll("[data-nav-link]")
    );

    const pageSections = Array.from(
        document.querySelectorAll("[data-section]")
    );

    const revealElements = Array.from(
        document.querySelectorAll(".reveal")
    );

    const fallbackImages = Array.from(
        document.querySelectorAll("[data-fallback-image]")
    );

    const currentYearElement =
        document.querySelector("#current-year");


    /* ============================================================
       2. CURRENT YEAR
       ============================================================ */

    if (currentYearElement) {
        currentYearElement.textContent =
            String(new Date().getFullYear());
    }


    /* ============================================================
       3. IMAGE FALLBACKS
       ============================================================ */

    const applyImageFallback = (image) => {
        const parent = image.parentElement;

        if (parent) {
            parent.classList.add("has-missing-image");
        }
    };


    fallbackImages.forEach((image) => {

        image.addEventListener("error", () => {
            applyImageFallback(image);
        });

        /*
         * This also catches images that failed before the event
         * listener was attached.
         */

        if (
            image.complete &&
            image.naturalWidth === 0
        ) {
            applyImageFallback(image);
        }

    });


    /* ============================================================
       4. MOBILE NAVIGATION
       ============================================================ */

    const closeMobileNavigation = () => {

        body.classList.remove("nav-open");

        if (menuToggle) {
            menuToggle.setAttribute(
                "aria-expanded",
                "false"
            );
        }

    };


    const openMobileNavigation = () => {

        body.classList.add("nav-open");

        if (menuToggle) {
            menuToggle.setAttribute(
                "aria-expanded",
                "true"
            );
        }

    };


    if (menuToggle && sidebar) {

        menuToggle.addEventListener("click", () => {

            const isOpen =
                body.classList.contains("nav-open");

            if (isOpen) {
                closeMobileNavigation();
            } else {
                openMobileNavigation();
            }

        });

    }


    navLinks.forEach((link) => {

        link.addEventListener("click", () => {

            if (window.innerWidth <= 840) {
                closeMobileNavigation();
            }

        });

    });


    window.addEventListener("resize", () => {

        if (window.innerWidth > 840) {
            closeMobileNavigation();
        }

    });


    document.addEventListener("keydown", (event) => {

        if (
            event.key === "Escape" &&
            body.classList.contains("nav-open")
        ) {
            closeMobileNavigation();

            if (menuToggle) {
                menuToggle.focus();
            }
        }

    });


    /* ============================================================
       5. SCROLL REVEAL
       ============================================================ */

    const prefersReducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;


    if (
        "IntersectionObserver" in window &&
        !prefersReducedMotion
    ) {

        const revealObserver =
            new IntersectionObserver(
                (entries, observer) => {

                    entries.forEach((entry) => {

                        if (!entry.isIntersecting) {
                            return;
                        }

                        entry.target.classList.add(
                            "is-visible"
                        );

                        observer.unobserve(entry.target);

                    });

                },
                {
                    threshold: 0.08,
                    rootMargin: "0px 0px -40px 0px"
                }
            );


        revealElements.forEach((element) => {
            revealObserver.observe(element);
        });

    } else {

        revealElements.forEach((element) => {
            element.classList.add("is-visible");
        });

    }


    /* ============================================================
       6. ACTIVE NAVIGATION SECTION
       ============================================================ */

    const setActiveNavigationLink = (sectionId) => {

        navLinks.forEach((link) => {

            const linkTarget =
                link.getAttribute("href");

            const shouldBeActive =
                linkTarget === `#${sectionId}`;

            link.classList.toggle(
                "is-active",
                shouldBeActive
            );

            if (shouldBeActive) {
                link.setAttribute(
                    "aria-current",
                    "location"
                );
            } else {
                link.removeAttribute("aria-current");
            }

        });

    };


    if (
        "IntersectionObserver" in window &&
        pageSections.length > 0
    ) {

        const sectionObserver =
            new IntersectionObserver(
                (entries) => {

                    const visibleEntries =
                        entries
                            .filter(
                                (entry) =>
                                    entry.isIntersecting
                            )
                            .sort(
                                (entryA, entryB) =>
                                    entryB.intersectionRatio -
                                    entryA.intersectionRatio
                            );

                    const mostVisibleSection =
                        visibleEntries[0];

                    if (!mostVisibleSection) {
                        return;
                    }

                    setActiveNavigationLink(
                        mostVisibleSection.target.id
                    );

                },
                {
                    threshold: [
                        0.15,
                        0.3,
                        0.5,
                        0.7
                    ],

                    rootMargin:
                        "-18% 0px -55% 0px"
                }
            );


        pageSections.forEach((section) => {
            sectionObserver.observe(section);
        });

    }


    /* ============================================================
       7. SMOOTH INTERNAL NAVIGATION
       ============================================================ */

    const internalLinks = Array.from(
        document.querySelectorAll(
            'a[href^="#"]'
        )
    );


    internalLinks.forEach((link) => {

        link.addEventListener("click", (event) => {

            const targetId =
                link.getAttribute("href");

            if (
                !targetId ||
                targetId === "#"
            ) {
                return;
            }

            const targetElement =
                document.querySelector(targetId);

            if (!targetElement) {
                return;
            }

            /*
             * Native smooth scrolling remains the default.
             * Reduced-motion users receive immediate navigation.
             */

            if (prefersReducedMotion) {

                event.preventDefault();

                targetElement.scrollIntoView({
                    behavior: "auto",
                    block: "start"
                });

            }

        });

    });


    /* ============================================================
       8. EXTERNAL LINK SAFETY
       ============================================================ */

    const externalLinks = Array.from(
        document.querySelectorAll(
            'a[target="_blank"]'
        )
    );


    externalLinks.forEach((link) => {

        const existingRel =
            link.getAttribute("rel") || "";

        const requiredValues = [
            "noopener",
            "noreferrer"
        ];

        const relValues =
            new Set(
                existingRel
                    .split(/\s+/)
                    .filter(Boolean)
            );

        requiredValues.forEach((value) => {
            relValues.add(value);
        });

        link.setAttribute(
            "rel",
            Array.from(relValues).join(" ")
        );

    });

});