"use strict";

/* Modern command interface. The Classic page remains the content source. */
(() => {
    const root = document.documentElement;
    const modernRoot = document.querySelector("#modern-experience");
    const classicFrame = document.querySelector(".site-frame");
    const deviceChoice = document.querySelector("#device-choice");
    const deviceChoiceError = document.querySelector("#device-choice-error");
    const skipLink = document.querySelector(".skip-link");
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const initialHash = window.location.hash;
    let active = root.classList.contains("experience-modern") ? "modern" : "classic";
    let stylesheet = null;
    let stylesheetPromise = null;
    let shell = null;
    let view = null;
    let currentRoute = "home";
    let routeTrail = [];
    let transitionTimer = 0;
    let lastHandledHash = "";

    if (!modernRoot || !classicFrame || !deviceChoice) return;

    const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const text = (node) => node && node.textContent ? node.textContent.replace(/\s+/g, " ").trim() : "";
    const source = (id) => document.getElementById(id);
    const el = (tag, className, value) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (value !== undefined && value !== null) node.textContent = value;
        return node;
    };
    const makeButton = (label, route, className) => {
        const node = el("button", ("command-button " + (className || "")).trim(), label);
        node.type = "button";
        if (route) node.dataset.route = route;
        return node;
    };
    const loadStyles = () => {
        if (stylesheet && stylesheet.sheet) return Promise.resolve();
        if (stylesheetPromise) return stylesheetPromise;
        stylesheetPromise = new Promise((resolve, reject) => {
            stylesheet = document.createElement("link");
            stylesheet.rel = "stylesheet";
            stylesheet.href = "modern.css";
            stylesheet.onload = resolve;
            stylesheet.onerror = () => {
                stylesheet.remove();
                stylesheet = null;
                stylesheetPromise = null;
                reject(new Error("Modern styles failed to load."));
            };
            document.head.append(stylesheet);
        });
        return stylesheetPromise;
    };

    const facts = Array.from(source("mission").querySelectorAll(".fact-cell"), (node, index) => ({
        id: slug(text(node.querySelector("strong"))),
        index: String(index + 1).padStart(2, "0"),
        title: text(node.querySelector("strong")),
        description: text(node.querySelector("p"))
    }));
    const collectRows = (sectionId, kind) => Array.from(source(sectionId).querySelectorAll("article.capability-row"), (node, index) => {
        const title = text(node.querySelector("h3"));
        const label = text(node.querySelector(".capability-number"));
        const image = node.querySelector("img");
        return {
            id: slug(kind === "current" ? label : title),
            kind,
            index: String(index + 1).padStart(2, "0"),
            label,
            title,
            description: text(node.querySelector(".capability-copy p")),
            image: image ? { src: image.getAttribute("src"), alt: image.getAttribute("alt") || title } : null,
            links: Array.from(node.querySelectorAll(".project-links a"), (anchor) => ({ label: text(anchor), href: anchor.getAttribute("href") }))
        };
    });
    const projects = collectRows("latest-work", "current");
    const lineage = collectRows("lineage", "lineage");
    const products = Array.from(source("products").querySelectorAll("article.product-card"), (node, index) => {
        const title = text(node.querySelector("h3"));
        const token = index === 0 ? "microtrench" : "ambu";
        const related = projects.find((item) => item.id.includes(token));
        return {
            id: slug(title),
            index: String(index + 1).padStart(2, "0"),
            title,
            label: text(node.querySelector(":scope > .capability-number")),
            description: text(node.querySelector(":scope > p")),
            architecture: node.querySelector(".product-architecture-panel"),
            links: Array.from(node.querySelectorAll(":scope > .project-links a"), (anchor) => ({ label: text(anchor), href: anchor.getAttribute("href") })),
            image: related ? related.image : null
        };
    });
    const people = Array.from(source("team").querySelectorAll("article.team-card"), (node, index) => ({
        id: slug(text(node.querySelector("h3"))),
        index: String(index + 1).padStart(2, "0"),
        name: text(node.querySelector("h3")),
        role: text(node.querySelector(".team-role")),
        paragraphs: Array.from(node.querySelectorAll(".team-card-copy > p"), text),
        links: Array.from(node.querySelectorAll(".project-links a"), (anchor) => ({ label: text(anchor), href: anchor.getAttribute("href") }))
    }));
    const challenges = Array.from(source("questions").querySelectorAll(".question-list li"), (node, index) => ({
        id: slug(text(node.querySelector("h3"))),
        index: String(index + 1).padStart(2, "0"),
        title: text(node.querySelector("h3")),
        description: text(node.querySelector("p"))
    }));
    const mission = {
        title: text(source("mission").querySelector("h1")),
        lead: text(source("mission").querySelector(".lead-copy")),
        progress: text(source("mission").querySelector(".hero-copy > p:not(.lead-copy)")),
        status: Array.from(source("mission").querySelectorAll(".mission-status strong"), text),
        challengeTitle: text(source("questions").querySelector("h2")),
        challengeIntro: text(source("questions").querySelector(".section-header + p")),
        projectsTitle: text(source("latest-work").querySelector("h2")),
        projectIntro: text(source("latest-work").querySelector(".section-introduction")),
        productsTitle: text(source("products").querySelector("h2")),
        productsIntro: text(source("products").querySelector(".section-introduction")),
        lineageIntro: text(source("lineage").querySelector(".section-introduction")),
        lineageTitle: text(source("lineage").querySelector("h2")),
        lineageIndex: text(source("lineage").querySelector(".section-index")),
        productAccess: text(source("products").querySelector(".product-access")),
        organizationTitle: text(source("team").querySelector("h2")),
        partnership: text(source("contact").querySelector(".footer-announcement strong")),
        email: source("contact").querySelector(".footer-announcement a").getAttribute("href")
    };

    const splitText = (value, limit) => {
        const pages = [];
        let page = "";
        value.split(/\s+/).filter(Boolean).forEach((word) => {
            const next = page ? page + " " + word : word;
            if (page && next.length > limit) {
                pages.push(page);
                page = word;
            } else page = next;
        });
        if (page) pages.push(page);
        return pages.length ? pages : [""];
    };
    const textPage = (value, page, limit) => {
        const pages = splitText(value, limit || 280);
        const current = Math.min(Math.max(1, Number(page) || 1), pages.length);
        return { pages, current, content: el("p", "paged-copy", pages[current - 1]) };
    };
    const routeButton = (label, route, className) => makeButton(label, route, className);
    const appendLinks = (parent, links) => {
        const list = el("div", "command-resources");
        links.forEach(({ label, href }) => {
            if (!href) return;
            if (href.startsWith("#products")) {
                list.append(routeButton(label + " ↗", "technology/platforms", "resource-link"));
                return;
            }
            const anchor = el("a", "resource-link", label + " ↗");
            anchor.href = href;
            if (!href.startsWith("mailto:")) {
                anchor.target = "_blank";
                anchor.rel = "noopener noreferrer";
            }
            list.append(anchor);
        });
        parent.append(list);
    };
    const appendImage = (parent, image, className) => {
        if (!image || !image.src) return;
        const figure = el("figure", className || "record-image");
        const imageNode = el("img");
        imageNode.src = image.src;
        imageNode.alt = image.alt;
        imageNode.loading = "lazy";
        figure.append(imageNode);
        parent.append(figure);
    };

    const makeToolbar = (category, fallback) => {
        const toolbar = el("div", "panel-toolbar");
        const back = makeButton("← BACK", null, "toolbar-back");
        back.dataset.commandBack = "true";
        back.dataset.fallback = fallback || "home";
        const home = makeButton("⌂ HOME", null, "toolbar-home");
        home.dataset.home = "true";
        toolbar.append(back, el("span", "toolbar-context", category.toUpperCase()), home);
        return toolbar;
    };
    const makePanel = ({ category, title, subtitle, back, content }) => {
        const panel = el("section", "command-panel");
        panel.setAttribute("aria-labelledby", "command-panel-title");
        panel.append(makeToolbar(category, back));
        const heading = el("header", "panel-heading");
        heading.append(el("p", "panel-kicker", category.toUpperCase()));
        const h1 = el("h1", "panel-title", title);
        h1.id = "command-panel-title";
        h1.tabIndex = -1;
        heading.append(h1);
        if (subtitle) heading.append(el("p", "panel-subtitle", subtitle));
        panel.append(heading);
        const body = el("div", "panel-content");
        if (content) body.append(content);
        panel.append(body);
        return panel;
    };
    const makeTabs = (items, selected) => {
        const tabs = el("nav", "panel-tabs");
        tabs.setAttribute("aria-label", "Panel views");
        items.forEach((item) => {
            const tab = routeButton(item.label, item.route, "panel-tab");
            if (item.id === selected) {
                tab.setAttribute("aria-current", "page");
                tab.setAttribute("aria-label", item.label + ", selected");
            }
            tabs.append(tab);
        });
        return tabs;
    };
    const pager = (page, count, routeFor) => {
        if (count < 2) return null;
        const nav = el("nav", "page-controls");
        nav.setAttribute("aria-label", "Information pages");
        const previous = routeButton("← PREVIOUS", routeFor(Math.max(1, page - 1)), "page-step");
        const next = routeButton("NEXT →", routeFor(Math.min(count, page + 1)), "page-step");
        previous.disabled = page <= 1;
        next.disabled = page >= count;
        nav.append(previous, el("span", "page-indicator", String(page).padStart(2, "0") + " / " + String(count).padStart(2, "0")), next);
        return nav;
    };
    const selectionList = (items, routeFor, className) => {
        const list = el("div", className || "selection-grid");
        items.forEach((item) => {
            const entry = makeButton("", routeFor(item), "selection-item");
            entry.append(el("span", "selection-index", item.index || "—"));
            const copy = el("span", "selection-copy");
            copy.append(el("strong", "selection-title", item.title || item.name));
            if (item.label || item.role) copy.append(el("small", "selection-meta", item.label || item.role));
            entry.append(copy, el("span", "selection-arrow", "↗"));
            list.append(entry);
        });
        return list;
    };

    const makeShell = () => {
        if (shell) return;
        shell = el("div", "command-interface");
        const header = el("header", "command-header");
        header.innerHTML = [
            '<a class="command-brand" href="#pd/home" data-route="home" aria-label="Peacock Dynamics command home">',
            '<img src="assets/logo/dark_full.png" alt="Peacock Dynamics" width="80" height="50">',
            '<span class="command-wordmark">PEACOCK <strong>DYNAMICS</strong><small>MARINE AUTONOMY · SWARM CONTROL · ROBOTIC EXPLORATION</small></span></a>'
        ].join("");
        const main = el("main", "command-main");
        main.id = "modern-main";
        main.tabIndex = -1;
        view = el("div", "command-view");
        view.setAttribute("aria-live", "polite");
        main.append(view);
        const ambient = el("div", "command-ambient");
        ambient.setAttribute("aria-hidden", "true");
        ambient.innerHTML = [
            '<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">',
            '<defs><linearGradient id="command-contour" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#9f83d2" stop-opacity=".1"/><stop offset="1" stop-color="#5b557e" stop-opacity=".03"/></linearGradient></defs>',
            '<g fill="none" stroke="url(#command-contour)" stroke-width="1">',
            '<path d="M-120 580c165-112 300-146 452-103s242 57 377-28 275-104 472-12 246 74 395-6"/>',
            '<path d="M-122 612c165-112 300-146 452-103s242 57 377-28 275-104 472-12 246 74 395-6"/>',
            '<path d="M-124 644c165-112 300-146 452-103s242 57 377-28 275-104 472-12 246 74 395-6"/>',
            '<path d="M-126 676c165-112 300-146 452-103s242 57 377-28 275-104 472-12 246 74 395-6"/>',
            '<path d="M-128 708c165-112 300-146 452-103s242 57 377-28 275-104 472-12 246 74 395-6"/>',
            '</g><g class="ambient-points"><circle cx="238" cy="286" r="2"/><circle cx="1097" cy="210" r="2"/><circle cx="940" cy="590" r="2"/><circle cx="388" cy="738" r="2"/></g></svg>'
        ].join("");
        const status = el("div", "command-status");
        status.innerHTML = '<span class="status-light"></span><span>MARINE SYSTEMS</span><i></i><span class="status-context">AUTONOMOUS RESEARCH INTERFACE</span>';
        shell.append(ambient, header, main, status);
        modernRoot.replaceChildren(shell);
        modernRoot.hidden = false;
        shell.addEventListener("click", (event) => {
            const routeTarget = event.target.closest("[data-route]");
            if (routeTarget) {
                if (routeTarget.tagName === "A") event.preventDefault();
                go(routeTarget.dataset.route);
                return;
            }
            if (event.target.closest("[data-home]")) {
                go("home");
                return;
            }
            const back = event.target.closest("[data-command-back]");
            if (back) {
                if (routeTrail.length) window.history.back();
                else go(back.dataset.fallback || "home");
            }
        });
        shell.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && currentRoute !== "home") {
                event.preventDefault();
                go("home");
                return;
            }
            if (currentRoute !== "home" || !["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
            const nodes = Array.from(shell.querySelectorAll(".dial-node"));
            const index = nodes.indexOf(document.activeElement);
            if (index < 0) return;
            event.preventDefault();
            const delta = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
            nodes[(index + delta + nodes.length) % nodes.length].focus();
        });
    };

    const makeDial = () => {
        const home = el("section", "dial-screen");
        home.setAttribute("aria-label", "Main navigation");
        const intro = el("div", "dial-intro");
        const dialTitle = el("h1", "dial-title", "Select a channel");
        dialTitle.tabIndex = -1;
        intro.append(el("p", "dial-eyebrow", "SUBSEA AUTONOMY SYSTEMS"), dialTitle);
        home.append(intro);
        const dial = el("div", "sonar-dial");
        dial.setAttribute("role", "group");
        dial.setAttribute("aria-label", "Peacock Dynamics navigation dial");
        dial.innerHTML = [
            '<svg class="dial-rings" viewBox="0 0 520 520" aria-hidden="true" focusable="false">',
            '<circle class="dial-ring ring-outer" cx="260" cy="260" r="224"/><circle class="dial-ring ring-middle" cx="260" cy="260" r="190"/><circle class="dial-ring ring-inner" cx="260" cy="260" r="154"/><circle class="dial-center-rule" cx="260" cy="260" r="112"/>',
            '<path class="dial-radials" d="M260 22V106M498 260H414M260 498V414M22 260H106M91.7 91.7l59.4 59.4M428.3 91.7l-59.4 59.4M428.3 428.3l-59.4-59.4M91.7 428.3l59.4-59.4"/>',
            '<path class="dial-crosshair" d="M260 125v31M260 364v31M125 260h31M364 260h31"/><circle class="dial-sweep" cx="260" cy="260" r="180"/></svg>',
            '<div class="dial-center" aria-hidden="true"><svg viewBox="34 35 192 193" role="presentation">',
            '<g class="dial-mark-lines"><path d="M130 45V85 M91 57 118 111 M169 57 142 111 M63 87 112 122 M197 87 148 122 M54 126 112 132 M206 126 148 132 M130 92V117 M122 97 125 117 M138 97 135 117 M120 117H140L130 138Z M130 138V218 M119 218H141"/></g>',
            '<g class="dial-mark-nodes"><circle cx="130" cy="45" r="5"/><circle cx="91" cy="57" r="5"/><circle cx="169" cy="57" r="5"/><circle cx="63" cy="87" r="5"/><circle cx="197" cy="87" r="5"/><circle cx="54" cy="126" r="5"/><circle cx="206" cy="126" r="5"/><circle cx="122" cy="97" r="3.4"/><circle cx="130" cy="92" r="4.2"/><circle cx="138" cy="97" r="3.4"/><circle cx="130" cy="138" r="4.2"/><circle cx="130" cy="218" r="4.2"/><circle cx="119" cy="218" r="3.3"/><circle cx="141" cy="218" r="3.3"/></g></svg><span>PD / 05</span></div>',
            '<div class="dial-nodes"></div><span class="dial-bearing bearing-n">N</span><span class="dial-bearing bearing-e">E</span><span class="dial-bearing bearing-s">S</span><span class="dial-bearing bearing-w">W</span>'
        ].join("");
        [
            ["01", "MISSION", "mission/current/1", "node-mission"],
            ["02", "TECHNOLOGY", "technology", "node-technology"],
            ["03", "RESEARCH & PROJECTS", "projects", "node-projects"],
            ["04", "ORGANIZATION", "organization", "node-organization"],
            ["05", "CONTACT", "contact", "node-contact"]
        ].forEach(([number, label, route, position]) => {
            const node = makeButton("", route, "dial-node " + position);
            node.setAttribute("aria-label", number + ": " + label);
            node.append(el("span", "dial-node-index", number), el("span", "dial-node-dot"), el("span", "dial-node-label", label));
            dial.querySelector(".dial-nodes").append(node);
        });
        home.append(dial);
        const instruction = el("p", "dial-instruction");
        instruction.innerHTML = 'SELECT A CHANNEL <span>·</span> ESC TO RETURN TO DIAL';
        home.append(instruction);
        return home;
    };

    const renderMission = (parts) => {
        const section = parts[1] || "current";
        if (section === "progress") {
            const page = textPage(mission.progress, parts[2], 285);
            const content = el("div", "detail-copy");
            content.append(el("span", "detail-index", "CURRENT PHASE / " + mission.status[1]), page.content);
            const panel = makePanel({ category: "Mission / Validation", title: "Simulation-first development", back: "mission/current/1", content });
            const pages = pager(page.current, page.pages.length, (n) => "mission/progress/" + n);
            if (pages) panel.append(pages);
            return panel;
        }
        if (section === "focus") {
            const content = el("div", "focus-grid");
            facts.forEach((item) => {
                const card = makeButton("", "technology/capability/" + item.id, "focus-card");
                card.append(el("span", "selection-index", item.index), el("strong", "focus-title", item.title), el("span", "focus-summary", item.description), el("span", "selection-arrow", "↗"));
                content.append(card);
            });
            const panel = makePanel({ category: "Mission / Research focus", title: "Research priorities", back: "mission/current/1", content });
            panel.append(makeTabs([{ id: "current", label: "Mission", route: "mission/current/1" }, { id: "focus", label: "Research focus", route: "mission/focus" }, { id: "constraints", label: "Constraints", route: "mission/constraints" }], "focus"));
            return panel;
        }
        if (section === "constraints" && parts[2]) {
            const item = challenges.find((record) => record.id === parts[2]);
            if (!item) return renderMission(["mission", "constraints"]);
            const content = el("div", "detail-copy");
            content.append(el("span", "detail-index", "CONSTRAINT " + item.index + " / 04"), el("p", "paged-copy", item.description));
            return makePanel({ category: "Mission / Operating constraints", title: item.title, back: "mission/constraints", content });
        }
        if (section === "constraints") {
            const content = el("div", "list-view");
            content.append(el("p", "list-introduction", mission.challengeIntro));
            content.append(selectionList(challenges, (item) => "mission/constraints/" + item.id, "selection-grid compact-grid"));
            const panel = makePanel({ category: "Mission / Operating constraints", title: mission.challengeTitle, back: "mission/current/1", content });
            panel.append(makeTabs([{ id: "current", label: "Mission", route: "mission/current/1" }, { id: "focus", label: "Research focus", route: "mission/focus" }, { id: "constraints", label: "Constraints", route: "mission/constraints" }], "constraints"));
            return panel;
        }
        const page = textPage(mission.lead, parts[2], 285);
        const content = el("div", "mission-reading");
        content.append(page.content);
        const status = el("div", "mission-status-grid");
        [["ACTIVE TRACK", mission.status[0]], ["CURRENT PHASE", mission.status[1]]].forEach(([label, value]) => {
            const item = el("div", "mission-status-unit");
            item.append(el("small", "status-label", label), el("strong", "status-value", value || "ACTIVE RESEARCH"));
            status.append(item);
        });
        content.append(status);
        const panel = makePanel({ category: "Mission", title: mission.title, subtitle: "Distributed autonomy under limited sensing and communication.", back: "home", content });
        panel.append(makeTabs([{ id: "current", label: "Mission", route: "mission/current/1" }, { id: "focus", label: "Research focus", route: "mission/focus" }, { id: "constraints", label: "Constraints", route: "mission/constraints" }], "current"));
        const pages = pager(page.current, page.pages.length, (n) => "mission/current/" + n);
        if (pages) panel.append(pages);
        panel.querySelector(".panel-content").append(makeButton("CURRENT VALIDATION PHASE ↗", "mission/progress/1", "inline-route"));
        return panel;
    };

    const cloneArchitecture = (sourcePanel, compact, page) => {
        const panel = sourcePanel.cloneNode(true);
        const requested = panel.querySelector(compact ? ".product-architecture-svg-mobile" : ".product-architecture-svg-desktop");
        panel.querySelectorAll("svg").forEach((svg) => {
            if (svg !== requested) svg.remove();
        });
        if (compact && requested) requested.setAttribute("viewBox", page === 2 ? "0 285 420 355" : "0 0 420 340");
        panel.querySelectorAll("svg").forEach((svg, viewport) => {
            const ids = new Map();
            svg.querySelectorAll("[id]").forEach((node) => {
                const next = "command-architecture-" + viewport + "-" + node.id;
                ids.set(node.id, next);
                node.id = next;
            });
            svg.querySelectorAll("*").forEach((node) => Array.from(node.attributes).forEach((attribute) => {
                node.setAttribute(attribute.name, attribute.value.replace(/#([\w-]+)/g, (match, id) => ids.has(id) ? "#" + ids.get(id) : match));
            }));
            svg.classList.add("command-architecture-svg", "command-architecture-active");
        });
        return panel;
    };

    const renderTechnology = (parts) => {
        if (parts[1] === "progress") return renderMission(["mission", "progress", parts[2]]);
        if (parts[1] === "capability" && parts[2]) {
            const item = facts.find((record) => record.id === parts[2]);
            if (!item) return renderTechnology(["technology", "capabilities"]);
            const content = el("div", "detail-copy");
            content.append(el("span", "detail-index", "CAPABILITY / " + item.index), el("p", "paged-copy", item.description));
            return makePanel({ category: "Technology / Capability", title: item.title, back: "technology/capabilities", content });
        }
        if (parts[1] === "platform") return renderPlatform(parts.slice(2));
        if (parts[1] === "access") {
            const content = el("div", "detail-copy");
            content.append(el("p", "paged-copy", mission.productAccess));
            const email = el("a", "contact-email", mission.email.replace(/^mailto:/i, ""));
            email.href = mission.email;
            content.append(email);
            return makePanel({ category: "Technology / Product access", title: "Using the simulators", back: "technology/platforms", content });
        }
        const tab = parts[1] === "platforms" ? "platforms" : "capabilities";
        const content = el("div", "list-view");
        if (tab === "capabilities") {
            content.append(el("p", "list-introduction", "Research areas drawn from Peacock Dynamics’ current mission."));
            content.append(selectionList(facts, (item) => "technology/capability/" + item.id, "selection-grid"));
        } else {
            content.append(el("p", "list-introduction", mission.productsIntro));
            content.append(selectionList(products, (item) => "technology/platform/" + item.id + "/overview/1", "selection-grid"));
            content.append(makeButton("PRODUCT ACCESS & LICENSING ↗", "technology/access", "inline-route"));
        }
        const panel = makePanel({ category: "Technology", title: tab === "platforms" ? mission.productsTitle : "Research capabilities", subtitle: "Select a system to inspect its details.", back: "home", content });
        panel.append(makeTabs([{ id: "capabilities", label: "Capabilities", route: "technology/capabilities" }, { id: "platforms", label: "Platforms", route: "technology/platforms" }], tab));
        return panel;
    };

    const renderPlatform = (parts) => {
        const item = products.find((record) => record.id === parts[0]);
        if (!item) return renderTechnology(["technology", "platforms"]);
        const tab = ["overview", "architecture", "resources"].includes(parts[1]) ? parts[1] : "overview";
        const page = Number(parts[2]) || 1;
        const base = "technology/platform/" + item.id;
        const content = el("div", "record-overview");
        let pages = null;
        if (tab === "overview") {
            const compact = window.matchMedia("(max-width: 620px), (max-height: 650px)").matches;
            const data = textPage(item.description, page, compact ? 195 : 275);
            content.append(el("span", "detail-index", item.label));
            if (item.image) appendImage(content, item.image, "record-image platform-image");
            content.append(data.content);
            pages = pager(data.current, data.pages.length, (n) => base + "/overview/" + n);
        } else if (tab === "architecture") {
            const compact = window.matchMedia("(max-width: 620px), (max-height: 650px)").matches;
            const diagramPage = Math.min(2, Math.max(1, page));
            if (item.architecture && !(window.innerHeight < 520 && compact)) content.append(cloneArchitecture(item.architecture, compact, diagramPage));
            if (item.architecture && window.innerHeight < 520 && compact) {
                const mobileSvg = item.architecture.querySelector(".product-architecture-svg-mobile");
                const labels = Array.from(mobileSvg.querySelectorAll("text"), (node) => Array.from(node.querySelectorAll("tspan")).map(text).filter(Boolean).join(" · ") || text(node));
                const labelsPerPage = 5;
                const pageLabels = labels.slice((diagramPage - 1) * labelsPerPage, diagramPage * labelsPerPage);
                const notes = el("div", "architecture-notes");
                notes.append(el("p", "paged-copy", mobileSvg.getAttribute("aria-label") || "System architecture flow."));
                const labelGrid = el("div", "architecture-label-grid");
                pageLabels.forEach((label, index) => labelGrid.append(el("span", "architecture-label-item", label)));
                notes.append(labelGrid);
                content.append(notes);
            }
            content.append(el("p", "architecture-caption", compact ? "SYSTEM ARCHITECTURE / SEGMENT " + String(diagramPage).padStart(2, "0") + " OF 02" : "SYSTEM ARCHITECTURE / simulator flow"));
            if (compact) pages = pager(diagramPage, 2, (n) => base + "/architecture/" + n);
        } else appendLinks(content, item.links);
        const panel = makePanel({ category: "Technology / Platform", title: item.title, back: "technology/platforms", content });
        panel.append(makeTabs([{ id: "overview", label: "Overview", route: base + "/overview/1" }, { id: "architecture", label: "Architecture", route: base + "/architecture/1" }, { id: "resources", label: "Resources", route: base + "/resources" }], tab));
        if (pages) panel.append(pages);
        return panel;
    };

    const projectIndex = (kind) => {
        const isLineage = kind === "lineage";
        const records = isLineage ? lineage : projects;
        const content = el("div", "list-view");
        content.append(el("p", "list-introduction", isLineage ? mission.lineageIntro : mission.projectIntro));
        if (isLineage && mission.lineageIndex) content.append(el("span", "detail-index lineage-count", mission.lineageIndex));
        content.append(selectionList(records, (item) => "projects/" + kind + "/" + item.id + "/overview/1", "selection-grid project-grid"));
        const panel = makePanel({ category: "Research & Projects", title: isLineage ? mission.lineageTitle : mission.projectsTitle, back: "home", content });
        panel.append(makeTabs([{ id: "current", label: "Current work", route: "projects/current" }, { id: "lineage", label: "Research lineage", route: "projects/lineage" }, { id: "challenges", label: "Challenges", route: "projects/challenges" }], kind));
        return panel;
    };
    const challengesIndex = () => {
        const content = el("div", "list-view");
        content.append(el("p", "list-introduction", mission.challengeIntro));
        content.append(selectionList(challenges, (item) => "mission/constraints/" + item.id, "selection-grid compact-grid"));
        const panel = makePanel({ category: "Research & Projects / Challenges", title: mission.challengeTitle, back: "home", content });
        panel.append(makeTabs([{ id: "current", label: "Current work", route: "projects/current" }, { id: "lineage", label: "Research lineage", route: "projects/lineage" }, { id: "challenges", label: "Challenges", route: "projects/challenges" }], "challenges"));
        return panel;
    };
    const renderProject = (parts) => {
        const kind = parts[0] === "lineage" ? "lineage" : "current";
        const records = kind === "lineage" ? lineage : projects;
        const item = records.find((record) => record.id === parts[1]);
        if (!item) return projectIndex(kind);
        const tab = ["overview", "visual", "resources"].includes(parts[2]) ? parts[2] : "overview";
        const page = Number(parts[3]) || 1;
        const base = "projects/" + kind + "/" + item.id;
        const content = el("div", "record-overview");
        let pages = null;
        if (tab === "overview") {
            const data = textPage(item.description, page, 280);
            content.append(el("span", "detail-index", (kind === "lineage" ? "TECHNICAL LINEAGE" : item.label) + " / " + item.index), data.content);
            pages = pager(data.current, data.pages.length, (n) => base + "/overview/" + n);
        } else if (tab === "visual") appendImage(content, item.image);
        else appendLinks(content, item.links);
        const panel = makePanel({ category: kind === "lineage" ? "Research & Projects / Lineage" : "Research & Projects / Current work", title: item.title, back: "projects/" + kind, content });
        panel.append(makeTabs([{ id: "overview", label: "Information", route: base + "/overview/1" }, { id: "visual", label: "Visual", route: base + "/visual" }, { id: "resources", label: "Links", route: base + "/resources" }], tab));
        if (pages) panel.append(pages);
        return panel;
    };

    const organizationIndex = () => {
        const content = el("div", "list-view organization-index");
        content.append(el("p", "list-introduction", "Founding team and technical direction."));
        content.append(selectionList(people, (person) => "organization/" + person.id + "/profile/1", "selection-grid people-grid"));
        return makePanel({ category: "Organization", title: mission.organizationTitle, back: "home", content });
    };
    const renderPerson = (parts) => {
        const person = people.find((record) => record.id === parts[0]);
        if (!person) return organizationIndex();
        const tab = parts[1] === "resources" ? "resources" : "profile";
        const page = Number(parts[2]) || 1;
        const pages = person.paragraphs.flatMap((paragraph) => splitText(paragraph, 270));
        const current = Math.min(Math.max(1, page), pages.length);
        const content = el("div", "record-overview person-profile");
        let controls = null;
        if (tab === "profile") {
            content.append(el("span", "detail-index", person.role), el("p", "paged-copy", pages[current - 1]));
            controls = pager(current, pages.length, (n) => "organization/" + person.id + "/profile/" + n);
        } else appendLinks(content, person.links);
        const panel = makePanel({ category: "Organization / Founder", title: person.name, back: "organization", content });
        panel.append(makeTabs([{ id: "profile", label: "Profile", route: "organization/" + person.id + "/profile/1" }, { id: "resources", label: "Links", route: "organization/" + person.id + "/resources" }], tab));
        if (controls) panel.append(controls);
        return panel;
    };

    const renderContact = (parts) => {
        const compact = window.matchMedia("(max-width: 620px), (max-height: 650px)").matches;
        const statement = textPage(mission.partnership, parts[1], compact ? 185 : 320);
        const content = el("div", "contact-view");
        content.append(el("p", "contact-copy", statement.content.textContent));
        const email = el("a", "contact-email", mission.email.replace(/^mailto:/i, ""));
        email.href = mission.email;
        content.append(email);
        content.append(el("small", "contact-copyright", "© " + new Date().getFullYear() + " Peacock Dynamics"));
        const shortcuts = el("nav", "contact-shortcuts");
        shortcuts.setAttribute("aria-label", "Interface sections");
        [["Mission", "mission/current/1"], ["Technology", "technology"], ["Research & Projects", "projects"], ["Organization", "organization"]].forEach(([label, route]) => shortcuts.append(routeButton(label, route, "shortcut-link")));
        content.append(shortcuts);
        const panel = makePanel({ category: "Contact", title: "Continue the conversation", subtitle: "Research partnerships · Technical collaboration", back: "home", content });
        const controls = pager(statement.current, statement.pages.length, (n) => "contact/" + n);
        if (controls) panel.append(controls);
        return panel;
    };

    const routeView = (route) => {
        const parts = route.split("/").filter(Boolean);
        if (!parts.length || parts[0] === "home") return makeDial();
        if (parts[0] === "mission") return renderMission(parts);
        if (parts[0] === "technology") return renderTechnology(parts);
        if (parts[0] === "projects") {
            if (parts[1] === "challenges") return challengesIndex();
            return parts.length > 2 ? renderProject(parts.slice(1)) : projectIndex(parts[1] === "lineage" ? "lineage" : "current");
        }
        if (parts[0] === "organization") return parts.length > 1 ? renderPerson(parts.slice(1)) : organizationIndex();
        if (parts[0] === "contact") return renderContact(parts);
        return makeDial();
    };
    const normalizeRoute = (route) => {
        const value = route.replace(/^#?\/?(?:pd\/)?/, "").replace(/^\/+|\/+$/g, "");
        if (!value || value === "home") return "home";
        return ["mission", "technology", "projects", "organization", "contact"].includes(value.split("/")[0]) ? value : "home";
    };
    const renderRoute = (route, animate) => {
        const nextRoute = normalizeRoute(route);
        const swap = () => {
            currentRoute = nextRoute;
            view.replaceChildren(routeView(nextRoute));
            view.classList.remove("is-changing");
            if (animate) view.querySelector(".panel-title, .dial-title")?.focus({ preventScroll: true });
        };
        if (transitionTimer) window.clearTimeout(transitionTimer);
        if (!animate || reducedMotion.matches) {
            swap();
            return;
        }
        view.classList.add("is-changing");
        transitionTimer = window.setTimeout(() => {
            swap();
            window.requestAnimationFrame(() => view.classList.remove("is-changing"));
        }, 130);
    };
    const routeFromHash = () => {
        const match = window.location.hash.match(/^#pd\/(.*)$/);
        return match ? normalizeRoute(match[1]) : null;
    };
    const go = (route, options = {}) => {
        const next = normalizeRoute(route);
        if (options.push !== false && next !== currentRoute) {
            routeTrail.push(currentRoute);
            const hash = "#pd/" + next;
            window.history.pushState({ pdRoute: next }, "", hash);
            lastHandledHash = hash;
        }
        renderRoute(next, options.animate !== false);
    };
    const syncRoute = () => {
        if (active !== "modern" || !shell || window.location.hash === lastHandledHash) return;
        const next = routeFromHash() || "home";
        if (routeTrail[routeTrail.length - 1] === next) routeTrail.pop();
        else if (next !== currentRoute) routeTrail.push(currentRoute);
        lastHandledHash = window.location.hash;
        renderRoute(next, true);
    };

    const setModeMetadata = (mode) => {
        if (skipLink) skipLink.href = mode === "modern" ? "#modern-main" : "#main-content";
        if (themeColor) themeColor.content = mode === "modern" ? "#080610" : "#050505";
    };
    const applyMode = (mode) => {
        active = mode;
        root.classList.toggle("experience-modern", mode === "modern");
        root.classList.remove("device-choice-active");
        setModeMetadata(mode);
        deviceChoice.setAttribute("aria-hidden", "true");
        deviceChoice.inert = true;
        classicFrame.inert = mode === "modern";
        modernRoot.inert = mode !== "modern";
        if (mode === "classic" && window.location.hash.startsWith("#pd/")) {
            window.history.replaceState({}, "", window.location.pathname + window.location.search);
            routeTrail = [];
            lastHandledHash = "";
        }
    };
    const focusDeviceChoice = () => {
        if (root.classList.contains("device-choice-active")) {
            deviceChoice.querySelector(".device-choice-panel")?.focus({ preventScroll: true });
        }
    };
    const showDeviceChoice = (message) => {
        root.classList.add("device-choice-active");
        deviceChoice.setAttribute("aria-hidden", "false");
        deviceChoice.inert = false;
        classicFrame.inert = true;
        modernRoot.inert = true;
        if (deviceChoiceError) deviceChoiceError.textContent = message || "";
        focusDeviceChoice();
    };
    let choosingDevice = false;
    const chooseDevice = async (choice) => {
        if (choosingDevice || !["computer", "mobile"].includes(choice)) return;
        choosingDevice = true;
        const mode = choice === "mobile" ? "modern" : "classic";
        if (mode === "modern") {
            try {
                await loadStyles();
                makeShell();
                const route = routeFromHash() || "home";
                if (/^#pd\//.test(initialHash)) window.history.replaceState({ pdRoute: route }, "", initialHash);
                renderRoute(route, false);
            } catch {
                choosingDevice = false;
                if (deviceChoiceError) deviceChoiceError.textContent = "The mobile interface could not load. Please try again.";
                return;
            }
        }
        if (!reducedMotion.matches) document.body.classList.add("experience-transitioning");
        applyMode(mode);
        try { window.sessionStorage.setItem("peacock-dynamics-device-choice", choice); } catch { /* This page view still changes. */ }
        if (!reducedMotion.matches) window.requestAnimationFrame(() => window.setTimeout(() => document.body.classList.remove("experience-transitioning"), 300));
        const destination = document.querySelector(mode === "modern" ? "#modern-main" : "#main-content");
        if (destination) {
            destination.tabIndex = -1;
            destination.focus({ preventScroll: true });
        }
        choosingDevice = false;
    };
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("hashchange", syncRoute);
    deviceChoice.addEventListener("click", (event) => {
        const option = event.target.closest("[data-device-choice]");
        if (option) chooseDevice(option.dataset.deviceChoice);
    });
    deviceChoice.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            return;
        }
        if (event.key !== "Tab") return;
        const options = Array.from(deviceChoice.querySelectorAll("[data-device-choice]:not(:disabled)"));
        const first = options[0];
        const last = options[options.length - 1];
        const panel = deviceChoice.querySelector(".device-choice-panel");
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
            event.preventDefault();
            last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    });
    window.addEventListener("resize", () => {
        if (active === "modern" && currentRoute.includes("/architecture/")) renderRoute(currentRoute, false);
    });

    const directRoute = /^#pd\//.test(initialHash);
    setModeMetadata(active);
    const awaitingChoice = root.classList.contains("device-choice-active");
    if (awaitingChoice) {
        showDeviceChoice();
        if (root.classList.contains("intro-active")) window.addEventListener("pd-intro-dismissed", focusDeviceChoice, { once: true });
    } else {
        classicFrame.inert = active === "modern";
        modernRoot.inert = active !== "modern";
        deviceChoice.inert = true;
    }
    if (!awaitingChoice && active === "modern") {
        loadStyles().then(() => {
            makeShell();
            const route = routeFromHash() || "home";
            if (directRoute) window.history.replaceState({ pdRoute: route }, "", initialHash);
            renderRoute(route, false);
        }).catch(() => {
            root.classList.remove("experience-modern");
            active = "classic";
            setModeMetadata(active);
            showDeviceChoice("The mobile interface could not load. Please choose an experience again.");
        });
    }
    window.__pdExperienceReady = true;
    if (window.__pdExperienceFailsafe) {
        window.clearTimeout(window.__pdExperienceFailsafe);
        window.__pdExperienceFailsafe = null;
    }
})();
