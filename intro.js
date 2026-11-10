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

    // Each frame is original vector geometry: vehicle silhouettes and ocean
    // sensing diagrams are built from connected graph edges and sample nodes.
    const shotGeometry = [
        {
            paths: [
                "M290 338 344 304 462 285 720 285 834 304 910 338 834 372 720 391 462 391 344 372Z",
                "M344 304 374 338 344 372 M462 285 492 338 462 391 M575 285 575 391 M695 285 695 391 M790 297 790 379 M374 338 492 338 575 338 695 338 790 338 834 304 M492 338 575 308 695 308 790 338 695 368 575 368 492 338",
                "M290 338 255 311 255 365 290 338 M255 311 238 338 255 365 M910 338 946 321 946 355 910 338 M390 304 376 268 457 268 462 285 M390 372 376 408 457 408 462 391 M686 285 704 257 764 257 720 285 M686 391 704 419 764 419 720 391",
                "M274 294Q220 338 274 382 M252 276Q184 338 252 400 M916 299Q966 338 916 377 M934 284Q1002 338 934 392",
                "M290 338 344 304 462 285 575 285 695 285 834 304 910 338 M290 338 344 372 462 391 575 391 695 391 834 372 910 338"
            ],
            nodes: [[290,338],[344,304],[374,338],[344,372],[462,285],[462,391],[492,338],[575,285],[575,308],[575,338],[575,368],[575,391],[695,285],[695,308],[695,338],[695,368],[695,391],[790,297],[790,338],[790,379],[834,304],[834,372],[910,338],[255,311],[255,365],[946,321],[946,355],[390,268],[457,268],[390,408],[457,408],[704,257],[764,257],[704,419],[764,419]]
        },
        {
            paths: [
                "M125 430 230 400 330 414 430 373 530 385 630 344 730 360 830 323 930 341 1075 300",
                "M110 462 220 434 322 446 424 407 526 419 628 379 730 393 832 358 934 376 1085 337",
                "M120 495 225 468 328 480 430 443 532 454 635 417 738 430 840 397 943 414 1092 374",
                "M160 531 265 502 368 514 470 481 572 490 675 455 778 466 880 435 983 450 1100 417",
                "M230 400 220 434 225 468 265 502 M330 414 322 446 328 480 368 514 M430 373 424 407 430 443 470 481 M530 385 526 419 532 454 572 490 M630 344 628 379 635 417 675 455 M730 360 730 393 738 430 778 466 M830 323 832 358 840 397 880 435 M930 341 934 376 943 414 983 450",
                "M815 210 758 285 720 354 M815 210 820 292 832 358 M815 210 900 277 934 376 M815 210 690 300 628 379 M815 210 950 310 1085 337",
                "M740 250Q815 195 890 250 M704 275Q815 180 926 275 M674 300Q815 164 956 300"
            ],
            nodes: [[125,430],[230,400],[330,414],[430,373],[530,385],[630,344],[730,360],[830,323],[930,341],[1075,300],[220,434],[322,446],[424,407],[526,419],[628,379],[730,393],[832,358],[934,376],[225,468],[328,480],[430,443],[532,454],[635,417],[738,430],[840,397],[943,414],[815,210],[758,285],[720,354],[820,292],[832,358],[900,277],[934,376],[690,300],[628,379],[950,310],[1085,337]]
        },
        {
            paths: [
                "M335 310 380 284 475 272 678 272 762 288 822 310 762 332 678 348 475 348 380 336Z",
                "M335 310 380 336 M380 284 405 310 380 336 M475 272 492 310 475 348 M575 272 575 348 M678 272 678 348 M762 288 762 332 M405 310 492 310 575 310 678 310 762 310",
                "M350 310 318 292 318 328 350 310 M822 310 850 297 850 323 822 310",
                "M160 438 278 405 396 414 514 380 632 386 750 352 868 357 1038 324 M187 469 305 436 423 445 541 411 659 417 777 383 895 388 1065 355",
                "M220 525 338 492 456 501 574 467 692 473 810 439 928 444 1092 412 M278 405 305 436 338 492 M396 414 423 445 456 501 M514 380 541 411 574 467 M632 386 659 417 692 473 M750 352 777 383 810 439 M868 357 895 388 928 444",
                "M280 226 385 226 385 257 280 257Z M280 226 332 205 435 205 385 226 M385 226 435 205 435 237 385 257 M835 222V323 M835 222 815 250 M835 222 855 250 M835 222 835 252"
            ],
            nodes: [[335,310],[380,284],[405,310],[380,336],[475,272],[475,348],[492,310],[575,272],[575,310],[575,348],[678,272],[678,310],[678,348],[762,288],[762,310],[762,332],[822,310],[318,292],[318,328],[850,297],[850,323],[160,438],[278,405],[396,414],[514,380],[632,386],[750,352],[868,357],[1038,324],[187,469],[305,436],[423,445],[541,411],[659,417],[777,383],[895,388],[1065,355],[332,205],[280,226],[385,226],[435,205],[835,222],[815,250],[855,250],[835,323]]
        },
        {
            paths: [
                "M220 310 270 284 340 284 390 310 340 336 270 336Z M220 310 340 310 390 310 M270 284 270 336 M340 284 340 336",
                "M510 230 560 204 630 204 680 230 630 256 560 256Z M510 230 630 230 680 230 M560 204 560 256 M630 204 630 256",
                "M790 395 840 369 910 369 960 395 910 421 840 421Z M790 395 910 395 960 395 M840 369 840 421 M910 369 910 421",
                "M390 310Q465 276 510 230 M680 230Q746 267 790 395 M390 310Q525 388 790 395 M340 284Q435 223 510 230 M630 256Q726 325 840 369 M340 336Q515 436 840 421",
                "M442 295Q472 274 495 257 M716 250Q748 274 768 319 M445 346Q571 379 724 380",
                "M204 310Q188 284 204 258 M204 310Q188 336 204 362 M498 230Q480 205 498 180 M498 230Q480 255 498 280 M974 395Q990 369 974 343 M974 395Q990 421 974 447"
            ],
            nodes: [[220,310],[270,284],[340,284],[390,310],[340,336],[270,336],[510,230],[560,204],[630,204],[680,230],[630,256],[560,256],[790,395],[840,369],[910,369],[960,395],[910,421],[840,421],[465,276],[495,257],[746,267],[724,380],[204,258],[204,362],[498,180],[498,280],[974,343],[974,447]]
        },
        {
            paths: [
                "M95 420 195 396 295 411 395 375 495 388 595 351 695 365 795 330 895 344 1000 311 1110 325",
                "M90 455 190 431 290 446 390 410 490 423 590 386 690 400 790 365 890 379 995 346 1115 360",
                "M112 491 212 466 312 481 412 446 512 458 612 422 712 435 812 400 912 414 1017 381 1122 395",
                "M170 530 270 502 370 517 470 482 570 494 670 459 770 471 870 438 970 450 1070 420",
                "M295 411 290 446 312 481 370 517 M495 388 490 423 512 458 570 494 M695 365 690 400 712 435 770 471 M895 344 890 379 912 414 970 450",
                "M285 310Q380 280 475 300T665 298T850 256T1010 234",
                "M285 310 388 295 510 300 636 280 758 267 882 247 1010 234",
                "M285 310 285 366 M388 295 388 350 M510 300 510 355 M636 280 636 335 M758 267 758 322 M882 247 882 302 M1010 234 1010 289",
                "M492 252 522 232 552 252 522 272Z M710 324 742 300 774 324 742 348Z M920 304 950 282 980 304 950 326Z",
                "M248 310 265 298 282 310 265 322Z M1030 234 1047 222 1064 234 1047 246Z"
            ],
            nodes: [[95,420],[195,396],[295,411],[395,375],[495,388],[595,351],[695,365],[795,330],[895,344],[1000,311],[1110,325],[190,431],[290,446],[390,410],[490,423],[590,386],[690,400],[790,365],[890,379],[995,346],[112,491],[212,466],[312,481],[412,446],[512,458],[612,422],[712,435],[812,400],[912,414],[1017,381],[285,310],[388,295],[510,300],[636,280],[758,267],[882,247],[1010,234],[522,232],[522,272],[742,300],[742,348],[950,282],[950,326],[265,298],[265,322],[1047,222],[1047,246]]
        },
        {
            paths: [
                "M440 325 490 295 575 286 735 286 810 304 858 325 810 346 735 364 575 364 490 355Z",
                "M440 325 490 295 575 286 735 286 810 304 858 325 810 346 735 364 575 364 490 355Z M490 295 515 325 490 355 M575 286 594 325 575 364 M655 286 655 364 M735 286 735 364 M810 304 810 346 M515 325 594 325 655 325 735 325 810 325",
                "M440 325 410 306 410 344 440 325 M858 325 884 313 884 337 858 325",
                "M280 244Q395 190 510 244T740 244T970 244 M250 218Q395 150 540 218T830 218T1040 218",
                "M500 325Q485 235 560 190Q624 151 690 194 M690 194 674 189 M690 194 685 210 M735 325Q855 239 833 172Q813 120 741 142 M741 142 757 135 M741 142 748 158 M575 364Q463 426 442 488Q427 533 499 551 M499 551 482 555 M499 551 493 535",
                "M611 172 655 192 699 172 655 152Z M611 172 655 192 655 232 611 212Z M655 192 699 172 699 212 655 232Z",
                "M655 232V286 M550 325 515 325 M735 325 810 325"
            ],
            nodes: [[440,325],[490,295],[515,325],[490,355],[575,286],[575,364],[594,325],[655,286],[655,325],[655,364],[735,286],[735,325],[735,364],[810,304],[810,325],[810,346],[858,325],[410,306],[410,344],[884,313],[884,337],[280,244],[395,190],[510,244],[740,244],[970,244],[250,218],[395,150],[540,218],[830,218],[1040,218],[560,190],[690,194],[674,189],[685,210],[833,172],[741,142],[757,135],[748,158],[442,488],[499,551],[482,555],[493,535],[611,172],[655,152],[699,172],[655,232]]
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
            const points = document.createElementNS(svgNS, "g");
            points.setAttribute("class", "graph-points");
            geometry.nodes.forEach(([cx, cy], index) => {
                const circle = document.createElementNS(svgNS, "circle");
                circle.setAttribute("cx", cx);
                circle.setAttribute("cy", cy);
                circle.setAttribute("r", index % 5 === 0 ? "5.5" : "3.4");
                points.append(circle);
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
