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

    const backToTopButton =
        document.querySelector("#back-to-top");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!reducedMotion.matches) {
        const waterSurface = document.createElement("canvas");
        waterSurface.className = "water-surface";
        waterSurface.setAttribute("aria-hidden", "true");
        document.body.append(waterSurface);

        const context = waterSurface.getContext("2d", { alpha: true });
        const cellSize = 5;
        const damping = 0.965;
        let columns = 0;
        let rows = 0;
        let previous = new Float32Array(0);
        let current = new Float32Array(0);
        let next = new Float32Array(0);
        let pixels = null;
        let lastPointer = null;
        let lastFrame = 0;
        let frameRequested = false;
        let activeEnergy = 0;

        const resizeSurface = () => {
            const width = Math.max(1, window.innerWidth);
            const height = Math.max(1, window.innerHeight);
            const nextColumns = Math.ceil(width / cellSize) + 2;
            const nextRows = Math.ceil(height / cellSize) + 2;
            waterSurface.style.width = width + "px";
            waterSurface.style.height = height + "px";
            if (nextColumns !== columns || nextRows !== rows) {
                columns = nextColumns;
                rows = nextRows;
                waterSurface.width = columns;
                waterSurface.height = rows;
                previous = new Float32Array(columns * rows);
                current = new Float32Array(columns * rows);
                next = new Float32Array(columns * rows);
                pixels = context?.createImageData(columns, rows) || null;
                lastPointer = null;
                activeEnergy = 0;
            }
        };

        const disturb = (clientX, clientY, strength) => {
            if (!context) return;
            const x = Math.round(clientX / cellSize) + 1;
            const y = Math.round(clientY / cellSize) + 1;
            const radius = 3;

            for (let dy = -radius; dy <= radius; dy += 1) {
                for (let dx = -radius; dx <= radius; dx += 1) {
                    const xx = x + dx;
                    const yy = y + dy;
                    if (xx <= 0 || xx >= columns - 1 || yy <= 0 || yy >= rows - 1) continue;
                    const distance = Math.hypot(dx, dy) / radius;
                    if (distance > 1) continue;
                    const impulse = Math.cos(distance * Math.PI * 0.5) * strength;
                    const index = yy * columns + xx;
                    previous[index] -= impulse;
                    current[index] += impulse * 0.28;
                }
            }

            activeEnergy = Math.max(activeEnergy, strength);
            requestSurfaceFrame();
        };

        const isProtectedWaterZone = (event) => {
            if (document.documentElement.classList.contains("intro-active")) return true;
            return event.target instanceof Element && Boolean(
                event.target.closest("#cinematic-intro")
            );
        };

        const stepWaves = () => {
            let energy = 0;
            for (let y = 1; y < rows - 1; y += 1) {
                for (let x = 1; x < columns - 1; x += 1) {
                    const index = y * columns + x;
                    let value = ((current[index - 1] + current[index + 1] + current[index - columns] + current[index + columns]) * 0.5 - previous[index]) * damping;
                    const edgeDistance = Math.min(x, y, columns - 1 - x, rows - 1 - y);
                    if (edgeDistance < 10) value *= edgeDistance / 10;
                    next[index] = value;
                    energy = Math.max(energy, Math.abs(value));
                }
            }
            const oldPrevious = previous;
            previous = current;
            current = next;
            next = oldPrevious;
            activeEnergy = energy;
        };

        const renderSurface = () => {
            if (!context || !pixels) return;
            const data = pixels.data;
            data.fill(0);

            for (let y = 1; y < rows - 1; y += 1) {
                for (let x = 1; x < columns - 1; x += 1) {
                    const index = y * columns + x;
                    const slopeX = current[index + 1] - current[index - 1];
                    const slopeY = current[index + columns] - current[index - columns];
                    const litSlope = Math.max(0, slopeX * 0.58 + slopeY * 0.82);
                    const softSheen = Math.abs(slopeX * 0.58 + slopeY * 0.82) * 0.018;
                    const highlight = Math.min(0.32, Math.pow(litSlope * 2.5, 1.7) * 0.27 + softSheen);
                    const pixel = index * 4;
                    data[pixel] = 70;
                    data[pixel + 1] = 183;
                    data[pixel + 2] = 211;
                    data[pixel + 3] = Math.round(highlight * 255);
                }
            }

            context.putImageData(pixels, 0, 0);
        };

        const animateSurface = (time) => {
            frameRequested = false;
            if (!context || time - lastFrame < 30) {
                if (activeEnergy > 0.001) requestSurfaceFrame();
                return;
            }
            lastFrame = time;
            stepWaves();
            renderSurface();
            if (activeEnergy > 0.001) requestSurfaceFrame();
        };

        function requestSurfaceFrame() {
            if (frameRequested) return;
            frameRequested = true;
            window.requestAnimationFrame(animateSurface);
        }

        resizeSurface();
        window.addEventListener("resize", resizeSurface, { passive: true });
        document.addEventListener("pointermove", (event) => {
            if (!event.isPrimary) return;
            if (isProtectedWaterZone(event)) {
                lastPointer = null;
                return;
            }
            const point = { x: event.clientX, y: event.clientY };
            if (!lastPointer) {
                lastPointer = point;
                disturb(point.x, point.y, 0.3);
                return;
            }
            const dx = point.x - lastPointer.x;
            const dy = point.y - lastPointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance < 12) return;
            const strength = Math.min(0.42, 0.16 + distance * 0.0035);
            const steps = Math.min(64, Math.ceil(distance / 12));
            for (let step = 1; step <= steps; step += 1) {
                const progress = step / steps;
                disturb(lastPointer.x + dx * progress, lastPointer.y + dy * progress, strength);
            }
            lastPointer = point;
        }, { passive: true });

        document.addEventListener("pointerdown", (event) => {
            if (!event.isPrimary || event.button !== 0) return;
            if (isProtectedWaterZone(event)) return;
            disturb(event.clientX, event.clientY, 0.72);
        }, { passive: true });

        document.addEventListener("pointerout", (event) => {
            if (!event.relatedTarget) {
                lastPointer = null;
            }
        }, { passive: true });

        document.addEventListener("scroll", () => {
            lastPointer = null;
        }, { passive: true, capture: true });
    }


    /* ============================================================
       2. CURRENT YEAR
       ============================================================ */

    if (currentYearElement) {
        currentYearElement.textContent =
            String(new Date().getFullYear());
    }

    const contactEmail = document.querySelector('meta[name="pd-contact-email"]')?.content.trim();
    if (contactEmail) {
        document.querySelectorAll("[data-contact-link]").forEach((link) => {
            const query = new URLSearchParams();
            if (link.dataset.contactSubject) query.set("subject", link.dataset.contactSubject);
            if (link.dataset.contactBody) query.set("body", link.dataset.contactBody);
            const queryString = query.toString();
            link.href = `mailto:${contactEmail}${queryString ? `?${queryString}` : ""}`;
            if (link.hasAttribute("data-contact-label")) link.textContent = contactEmail;
        });
    }

    const briefingForm = document.querySelector("[data-briefing-form]");
    if (briefingForm && contactEmail) {
        briefingForm.method = "POST";
        briefingForm.action = `https://formsubmit.co/ajax/${encodeURIComponent(contactEmail)}`;

        briefingForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const submitButton = briefingForm.querySelector('[type="submit"]');
            const status = briefingForm.querySelector("[data-briefing-status]");
            if (!submitButton || !status) return;

            submitButton.disabled = true;
            status.textContent = "Sending your inquiry…";

            try {
                const response = await fetch(briefingForm.action, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(Object.fromEntries(new FormData(briefingForm)))
                });
                const result = await response.json();

                if (!response.ok || result.success === false || result.success === "false") {
                    throw new Error(result.message || "The message could not be sent.");
                }

                briefingForm.reset();
                status.textContent = "Your inquiry has been submitted. Thank you.";
            } catch (error) {
                status.textContent = "We couldn't send that just now. Please try again or email us directly.";
            } finally {
                submitButton.disabled = false;
            }
        });
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

    const productArchitectureDetails = Array.from(
        document.querySelectorAll(
            "#products .product-architecture"
        )
    );

    productArchitectureDetails.forEach((details) => {
        const summary = details.querySelector("summary");
        const panel = details.querySelector(
            ".product-architecture-panel"
        );

        if (!summary || !panel) {
            return;
        }

        summary.addEventListener("click", (event) => {
            event.preventDefault();

            if (details.dataset.animating === "true") {
                return;
            }

            const opening = !details.open;

            if (
                window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches
            ) {
                details.open = opening;
                return;
            }

            details.dataset.animating = "true";
            panel.style.overflowY = "hidden";

            if (opening) {
                details.open = true;
                panel.style.height = "0px";
                panel.style.opacity = "0";
            } else {
                panel.style.height = `${panel.getBoundingClientRect().height}px`;
                panel.style.opacity = "1";
            }

            panel.getBoundingClientRect();

            let fallbackTimer;

            const finishAnimation = () => {
                if (details.dataset.animating !== "true") {
                    return;
                }

                window.clearTimeout(fallbackTimer);
                panel.removeEventListener(
                    "transitionend",
                    finishOnTransition
                );
                panel.removeEventListener(
                    "transitioncancel",
                    finishOnTransition
                );

                if (!opening) {
                    details.open = false;
                }

                panel.style.removeProperty("height");
                panel.style.removeProperty("opacity");
                panel.style.removeProperty("overflow-y");
                delete details.dataset.animating;
            };

            const finishOnTransition = (transitionEvent) => {
                if (
                    transitionEvent.target === panel &&
                    transitionEvent.propertyName === "height"
                ) {
                    finishAnimation();
                }
            };

            panel.addEventListener(
                "transitionend",
                finishOnTransition
            );
            panel.addEventListener(
                "transitioncancel",
                finishOnTransition
            );

            window.requestAnimationFrame(() => {
                if (details.dataset.animating !== "true") {
                    return;
                }

                if (opening) {
                    panel.style.height = `${panel.scrollHeight}px`;
                    panel.style.opacity = "1";
                } else {
                    panel.style.height = "0px";
                    panel.style.opacity = "0";
                }
            });

            fallbackTimer = window.setTimeout(
                finishAnimation,
                450
            );
        });
    });


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


    // Section height must not affect whether its navigation link can activate.
    const updateActiveNavigation = () => {
        if (backToTopButton) {
            backToTopButton.hidden = window.scrollY <= 600;
        }

        if (pageSections.length === 0) {
            return;
        }

        const readingLine = window.innerHeight * 0.18;
        let activeSection = pageSections[0];

        for (const section of pageSections) {
            if (section.getBoundingClientRect().top > readingLine) {
                break;
            }
            activeSection = section;
        }

        setActiveNavigationLink(activeSection.id);
    };

    let navigationFramePending = false;
    const scheduleNavigationUpdate = () => {
        if (navigationFramePending) {
            return;
        }
        navigationFramePending = true;
        window.requestAnimationFrame(() => {
            navigationFramePending = false;
            updateActiveNavigation();
        });
    };

    window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
    window.addEventListener("resize", scheduleNavigationUpdate);
    window.addEventListener("pageshow", scheduleNavigationUpdate);
    window.addEventListener("load", scheduleNavigationUpdate);
    updateActiveNavigation();


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
