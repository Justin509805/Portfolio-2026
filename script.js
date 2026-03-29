/**
 * Shared image pool for hero interactions.
 */
const PORTFOLIO_IMAGE_FILES = [
  "newfunnelflow-1.png",
  "newfunnelflow-2.png",
  "newfunnelflow-3.png",
  "newfunnelflow-4.png",
  "newstrive-1.png",
  "newstrive-2.png",
  "newstrive-3.png",
  "newstudentevents-1.png",
  "newstudentevents-2.png",
  "newsynq-1.png",
  "newsynq-2.png",
  "newsynq-3.png",
  "newhwwig-1.png",
  "newhwwig-2.png",
  "newhwwig-3.png"
];

const getImageSeriesKey = (fileName) =>
  fileName.replace(/\.[^.]+$/, "").replace(/-\d+$/, "").toLowerCase();

const pickNextPortfolioImage = (previousFile) => {
  const previousSeries = previousFile ? getImageSeriesKey(previousFile) : "";
  let candidates = PORTFOLIO_IMAGE_FILES.filter(
    (fileName) =>
      fileName !== previousFile && getImageSeriesKey(fileName) !== previousSeries
  );

  if (!candidates.length) {
    candidates = PORTFOLIO_IMAGE_FILES.filter(
      (fileName) => fileName !== previousFile
    );
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
};

/* How long to wait for the page-transition overlay to finish before
   starting content animations (0 when no transition is in progress). */
var PAGE_ENTER_DELAY = sessionStorage.getItem('pt') ? 480 : 0;

if (PAGE_ENTER_DELAY) {
  document.documentElement.classList.add('page-entering');
}

/**
 * Name reveal animation for the first screen.
 * Requirements:
 * - Name starts smaller + lower opacity
 * - Reveal left→right (letters "fill" to white) with variable velocity:
 *   slightly slower after JUSTIN, slightly faster starting VEENHUIS
 * - When fully white, smoothly zoom to final size
 * - All other text appears only after the animation finishes
 */

(function () {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const nameEl = document.querySelector(".center-name");
  if (!nameEl) {
    setTimeout(function () {
      root.classList.add('reveal-done');
      root.classList.add('anim-done');
    }, PAGE_ENTER_DELAY);
    return;
  }

  const pageUrl = new URL(window.location.href);
  const isLogoReturn = pageUrl.searchParams.get("from") === "logo";
  if (isLogoReturn) {
    root.classList.add("home-from-logo");
  }

  const fullName = (nameEl.getAttribute("data-name") || "JUSTIN VEENHUIS").trim();
  const [firstName = "JUSTIN", ...restParts] = fullName.split(/\s+/);
  const lastName = restParts.join(" ") || "VEENHUIS";
  nameEl.setAttribute("aria-label", fullName);
  nameEl.setAttribute("data-first", firstName);
  nameEl.setAttribute("data-last", lastName);

  nameEl.innerHTML = `
    <div class="name-content" aria-hidden="true">
      <div class="name-inline-wrap">
        <span class="name-text name-text--dim">${fullName}</span>
        <span class="name-text name-text--reveal">${fullName}</span>
      </div>
      <div class="name-stack">
        <div class="name-line-wrap name-line-wrap--first">
          <span class="name-line name-line--dim">${firstName}</span>
          <span class="name-line name-line--reveal">${firstName}</span>
        </div>
        <div class="name-image-shell" aria-hidden="true">
          <img class="name-rotator" src="./img/funnelflow-1.png" alt="" />
        </div>
        <div class="name-line-wrap name-line-wrap--last">
          <span class="name-line name-line--dim">${lastName}</span>
          <span class="name-line name-line--reveal">${lastName}</span>
        </div>
      </div>
    </div>
  `;

  const nameImage = nameEl.querySelector(".name-rotator");

  let currentImage = "funnelflow-1.png";

  const swapCenterImage = () => {
    if (!nameImage) return;
    const nextImage = pickNextPortfolioImage(currentImage);
    if (!nextImage || nextImage === currentImage) return;
    nameImage.src = `./img/${nextImage}`;
    currentImage = nextImage;
  };

  const done = () => {
    root.classList.add("anim-done");
  };

  if (prefersReducedMotion) {
    setTimeout(function () {
      nameEl.style.setProperty("--reveal", "100%");
      nameEl.classList.add("is-zoomed");
      root.classList.add('reveal-done');
      done();
    }, PAGE_ENTER_DELAY);
    return;
  }

  window.setInterval(swapCenterImage, 1200);

  // Smooth continuous reveal using a CSS mask variable (--reveal: 0% → 100%).
  // Timing model:
  // - Phase 1 (JUSTIN): a touch slower with easing out
  // - Small hold/pause after JUSTIN
  // - Phase 2 (VEENHUIS): a touch faster with easing in
  const indexOfSpace = fullName.indexOf(" ");
  const justinChars = indexOfSpace > -1 ? indexOfSpace : Math.min(6, fullName.length);
  const totalCharsNoSpace = fullName.replace(/\s+/g, "").length || 1;
  const justinProgress = Math.max(0.2, Math.min(0.7, justinChars / totalCharsNoSpace));

  // Faster wipe overall (requested), with a subtle hold after JUSTIN
  // and a quicker second phase into VEENHUIS.
  const baseTotalMs = 1500;
  const holdMs = 160;
  // once the white wipe is finished we want to show nav/note right away
  // and start the zoom immediately (no visible delay).
  const zoomDelayMs = 0;
  const zoomSettleMs = 820;

  const phase1Ms = Math.round(baseTotalMs * 0.62);
  const phase2Ms = Math.max(260, baseTotalMs - phase1Ms);

  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const easeInCubic = (x) => x * x * x;

  const start = performance.now();
  const tick = (now) => {
    const elapsed = now - start;

    let reveal = 0;
    if (elapsed <= phase1Ms) {
      const t = Math.max(0, Math.min(1, elapsed / phase1Ms));
      reveal = justinProgress * easeOutCubic(t);
    } else if (elapsed <= phase1Ms + holdMs) {
      reveal = justinProgress;
    } else {
      const t = Math.max(
        0,
        Math.min(1, (elapsed - phase1Ms - holdMs) / phase2Ms)
      );
      reveal = justinProgress + (1 - justinProgress) * easeInCubic(t);
    }

    nameEl.style.setProperty("--reveal", `${Math.round(reveal * 10000) / 100}%`);

    if (elapsed < phase1Ms + holdMs + phase2Ms) {
      requestAnimationFrame(tick);
      return;
    }

    // Finish reveal, then zoom and finally show the rest of the UI.
    // finalise the wipe and immediately release the rest of the UI
    nameEl.style.setProperty("--reveal", "100%");
    // fire off the nav/note reveal immediately
    root.classList.add('reveal-done');

    // start the zoom immediately (no delay) and mark full animation done
    // after the zoom has settled
    nameEl.classList.add("is-zoomed");
    window.setTimeout(done, zoomSettleMs);
  };

  nameEl.style.setProperty("--reveal", "0%");
  setTimeout(function () {
    requestAnimationFrame(tick);
  }, PAGE_ENTER_DELAY);
})();

/* Text-swap setup: wrap hoverable link text with two layers for the slide animation */
(function () {
  function applyTextSwap(el, textOverride) {
    if (!el) return;

    var text = (typeof textOverride === 'string' ? textOverride : el.textContent).trim();
    if (!text) return;

    var wrap = el.querySelector('.text-swap-wrap');
    if (!wrap) {
      wrap = document.createElement('span');
      wrap.className = 'text-swap-wrap';
      el.textContent = '';
      el.appendChild(wrap);
    }

    wrap.innerHTML =
      '<span class="swap-out">' + text + '</span>' +
      '<span class="swap-in" aria-hidden="true">' + text + '</span>';
  }

  window.applyTextSwap = applyTextSwap;

  var targets = document.querySelectorAll(
    '.nav-links a, .nav-name, .nav-toggle, .site-footer .footer-links .contact-link, .mobile-links a, .image-preview-close, .image-preview-download'
  );

  targets.forEach(function (el) {
    applyTextSwap(el);
  });
})();

/* Desktop cursor image interaction for the first screen */
(function () {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const desktopQuery = window.matchMedia("(min-width: 1200.01px)");

  const stage = document.querySelector(".cursor-image-stage");
  const firstScreen = document.querySelector(".first-screen");

  if (!stage || !firstScreen || prefersReducedMotion) return;

  let pointerInside = false;
  let currentFile = "funnelflow-1.png";
  let activeCard = null;
  let lastSpawnAt = 0;
  let lastMoveAt = 0;
  let lastX = 0;
  let lastY = 0;
  let cardIndex = 0;

  const updateStageVisibility = () => {
    const rect = firstScreen.getBoundingClientRect();
    const inHero = rect.bottom > 0 && rect.top < window.innerHeight;
    const shouldShow = desktopQuery.matches && pointerInside && inHero;
    stage.classList.toggle("is-active", shouldShow);
  };

  const closeCard = (card) => {
    if (!card) return;
    if (card.classList.contains("is-closing")) return;
    if (card._closeTimer) {
      window.clearTimeout(card._closeTimer);
      card._closeTimer = null;
    }
    card.classList.remove("is-visible");
    card.classList.add("is-closing");
    window.setTimeout(() => {
      if (card.parentNode) {
        card.parentNode.removeChild(card);
      }
    }, 560);
  };

  const closeAllCards = () => {
    stage.querySelectorAll(".cursor-image-card").forEach((card) => {
      closeCard(card);
    });
  };

  const openCardAt = (x, y) => {
    const nextFile = pickNextPortfolioImage(currentFile);
    if (!nextFile) return;

    const card = document.createElement("div");
    card.className = "cursor-image-card";
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    card.style.zIndex = `${cardIndex++}`;

    const img = document.createElement("img");
    img.src = `./img/${nextFile}`;
    img.alt = "";
    img.draggable = false;
    card.appendChild(img);

    stage.appendChild(card);
    currentFile = nextFile;

    activeCard = card;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        card.classList.add("is-visible");
      });
    });

    card._closeTimer = window.setTimeout(() => {
      closeCard(card);
      if (activeCard === card) {
        activeCard = null;
      }
    }, 500);
  };

  const handlePointerMove = (event) => {
    if (!desktopQuery.matches || !pointerInside) return;

    const now = performance.now();
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    const dt = Math.max(now - lastMoveAt, 16);
    const distance = Math.hypot(dx, dy);
    const speed = distance / dt;

    lastX = event.clientX;
    lastY = event.clientY;
    lastMoveAt = now;

    // Faster movement lowers the delay aggressively, while smaller/slower
    // movement still produces images with a short pause between them.
    const spawnCooldown = Math.max(42, Math.min(165, 128 - speed * 62));
    const minDistance = Math.max(3, Math.min(10, 8 - speed * 1.8));

    if (now - lastSpawnAt < spawnCooldown || distance < minDistance) {
      return;
    }

    lastSpawnAt = now;
    openCardAt(event.clientX + 24, event.clientY + 18);
  };

  firstScreen.addEventListener("pointerenter", (event) => {
    pointerInside = true;
    lastX = event.clientX;
    lastY = event.clientY;
    lastMoveAt = performance.now();
    updateStageVisibility();
  });

  firstScreen.addEventListener("pointerleave", () => {
    pointerInside = false;
    updateStageVisibility();
    closeAllCards();
    activeCard = null;
  });

  firstScreen.addEventListener("pointermove", handlePointerMove);

  window.addEventListener("scroll", updateStageVisibility, { passive: true });
  window.addEventListener("resize", updateStageVisibility);
  desktopQuery.addEventListener("change", () => {
    if (!desktopQuery.matches) {
      closeAllCards();
      activeCard = null;
    }
    updateStageVisibility();
  });

  updateStageVisibility();
})();

/* Mobile menu toggle: show/hide mobile full-screen menu and swap button text */
(function () {
  const navToggle = document.querySelector('.nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!navToggle || !mobileMenu) return;

  function setMenuOpen(open) {
    document.documentElement.classList.toggle('menu-open', open);
    if (typeof window.applyTextSwap === 'function') {
      window.applyTextSwap(navToggle, open ? 'CLOSE' : 'MENU');
    } else {
      navToggle.textContent = open ? 'CLOSE' : 'MENU';
    }
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      // prevent body scroll while menu open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  navToggle.addEventListener('click', () => {
    const isOpen = document.documentElement.classList.contains('menu-open');
    setMenuOpen(!isOpen);
  });

  // Close menu when clicking a link
  mobileMenu.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    setMenuOpen(false);
  });

  // Close on escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.documentElement.classList.contains('menu-open')) {
      setMenuOpen(false);
    }
  });
})();

/* Keep the navbar visually stuck once the page scrolls */
(function () {
  const nav = document.querySelector('.top-nav');
  if (!nav) return;

  const updateStickyState = () => {
    nav.classList.toggle('is-stuck', window.scrollY > 12);
  };

  window.addEventListener('scroll', updateStickyState, { passive: true });
  window.addEventListener('load', updateStickyState);
  updateStickyState();
})();

/* Image preview modal for resume links */
(function () {
  const modal = document.querySelector("[data-image-preview-modal]");
  if (!modal) return;

  const previewImage = modal.querySelector("[data-image-preview-image]");
  const downloadLink = modal.querySelector("[data-image-preview-download]");
  const closeTargets = Array.from(
    modal.querySelectorAll("[data-image-preview-close]")
  );
  const triggers = Array.from(
    document.querySelectorAll("[data-preview-image-trigger]")
  );

  if (!previewImage || !downloadLink || !triggers.length) return;

  let closeTimer = 0;

  const closeModal = () => {
    modal.classList.remove("is-visible");
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      modal.hidden = true;
      previewImage.src = "";
      previewImage.alt = "";
      downloadLink.href = "";
      document.body.style.overflow = "";
    }, 280);
  };

  const openModal = ({ src, alt, downloadName }) => {
    window.clearTimeout(closeTimer);
    previewImage.src = src;
    previewImage.alt = alt || "Preview image";
    downloadLink.href = src;
    if (downloadName) {
      downloadLink.setAttribute("download", downloadName);
    } else {
      downloadLink.removeAttribute("download");
    }
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        modal.classList.add("is-visible");
      });
    });
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal({
        src: trigger.getAttribute("data-preview-image-src") || trigger.getAttribute("href") || "",
        alt: trigger.getAttribute("data-preview-image-alt") || "",
        downloadName: trigger.getAttribute("data-preview-download-name") || ""
      });
    });
  });

  closeTargets.forEach((target) => {
    target.addEventListener("click", closeModal);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
})();

/* Desktop custom cursor: blend-mode dot that expands on interactive elements */
(function () {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (prefersReducedMotion || !finePointerQuery.matches) return;

  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";

  const cursorLabel = document.createElement("div");
  cursorLabel.className = "custom-cursor-label";

  document.body.appendChild(cursor);
  document.body.appendChild(cursorLabel);

  document.documentElement.classList.add("has-custom-cursor");

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let rafId = 0;

  const interactiveSelector = "a, button, .project-link, .project-card";

  const render = () => {
    cursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    cursorLabel.style.transform = cursorLabel.classList.contains("is-visible")
      ? `translate(${x}px, ${y}px) translate(-50%, -50%) scale(1)`
      : `translate(${x}px, ${y}px) translate(-50%, -50%) scale(0.9)`;
    rafId = 0;
  };

  const queueRender = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(render);
  };

  const setState = (element) => {
    const projectTarget = element?.closest(".project-link, .project-card");
    const linkTarget = element?.closest(
      ".see-all, .nav-links a, .mobile-links a, .contact-link, .nav-name, .nav-toggle, .image-preview-close, .image-preview-download, a, button"
    );

    cursor.classList.remove("is-project", "is-link");
    cursorLabel.classList.remove("is-visible");
    cursorLabel.textContent = "";

    if (projectTarget) {
      cursor.classList.add("is-project");
      cursorLabel.classList.add("is-visible");
      cursorLabel.textContent = "View";
      return;
    }

    if (linkTarget) {
      cursor.classList.add("is-link");
    }
  };

  document.addEventListener("pointermove", (event) => {
    x = event.clientX;
    y = event.clientY;
    cursor.classList.add("is-visible");
    setState(event.target);
    queueRender();
  });

  document.addEventListener("pointerleave", () => {
    cursor.classList.remove("is-visible", "is-project", "is-link");
    cursorLabel.classList.remove("is-visible");
  });

  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest(interactiveSelector);
    setState(target || event.target);
  });

  finePointerQuery.addEventListener("change", (event) => {
    if (event.matches) return;
    cursor.remove();
    cursorLabel.remove();
  });
})();

/* Reveal-on-scroll behavior for content below the first screen
   - Observes elements with the `reveal-on-scroll` class and adds `revealed`.
   - Respects `prefers-reduced-motion` by revealing instantly.
   - Supports optional `data-reveal-delay` (ms) or CSS `--reveal-delay`.
*/
(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const root = document.documentElement;
  const container = document.querySelector('.content-container') || document;
  const items = Array.from(container.querySelectorAll('.reveal-on-scroll'));
  if (!items.length) return;

  if (prefersReducedMotion) {
    items.forEach((el) => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // prefer explicit data attribute, fall back to CSS var or 0
        const attr = el.getAttribute('data-reveal-delay');
        const delay = attr ? parseInt(attr, 10) || 0 : 0;

        if (delay) {
          // set CSS var too so transitions respect it
          el.style.setProperty('--reveal-delay', `${delay}ms`);
        }

        // small timeout to allow delay to apply
        window.setTimeout(() => {
          el.classList.add('revealed');
        }, delay);

        observer.unobserve(el);
      });
    },
    { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );

  setTimeout(function () {
    items.forEach((el) => observer.observe(el));
  }, PAGE_ENTER_DELAY);
})();

/* Scroll-driven parallax: blur/scale the hero name and bottom note as user
   scrolls toward the work section. Single consolidated handler. */
(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const centerName = document.querySelector('.center-name');
  const centerContent = centerName ? centerName.querySelector('.name-content') : null;
  const bottomNote = document.querySelector('.bottom-note');
  const firstScreen = document.querySelector('.first-screen');
  if (!centerName || !centerContent || !firstScreen) return;

  let ticking = false;

  function onScroll() {
    if (!centerName.classList.contains('is-zoomed')) return;
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const scrollY = window.scrollY || window.pageYOffset;
      const heroH = firstScreen.offsetHeight || window.innerHeight;
      const progress = Math.min(Math.max(scrollY / heroH, 0), 1);

      if (progress > 0.0001) {
        const scale = 1 - 0.18 * progress;
        const blur = 6 * progress;
        const opacity = 1 - 0.35 * progress;
        centerContent.style.transform = `translateY(0) scale(${scale})`;
        centerContent.style.filter = `blur(${blur}px)`;
        centerContent.style.opacity = `${opacity}`;

        if (bottomNote) {
          bottomNote.style.transform = `scale(${1 - 0.06 * progress})`;
          bottomNote.style.filter = `blur(${progress * 2}px)`;
          bottomNote.style.opacity = `${1 - 0.4 * progress}`;
        }
      } else {
        [centerContent, bottomNote].forEach((el) => {
          if (!el) return;
          el.style.transform = '';
          el.style.filter = '';
          el.style.opacity = '';
        });
      }

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', onScroll);
})();

/* Page transition: wipe overlay on navigate */
(function () {
  var overlay = document.createElement('div');
  overlay.className = 'page-transition';
  document.body.appendChild(overlay);

  var duration = 460;

  if (sessionStorage.getItem('pt')) {
    sessionStorage.removeItem('pt');
    overlay.style.transform = 'translateY(0)';
    overlay.style.transition = 'none';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.style.transition = '';
        overlay.classList.add('is-revealing');
      });
    });

    setTimeout(function () {
      overlay.classList.remove('is-revealing');
      overlay.style.transform = '';
      document.documentElement.classList.remove('page-entering');
      document.documentElement.classList.add('page-entered');
    }, duration + 20);

    setTimeout(function () {
      document.documentElement.classList.remove('page-entered');
    }, duration + 620);
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;

    var href = link.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') ||
        href.startsWith('http') || link.target === '_blank' ||
        link.hasAttribute('download') || link.hasAttribute('data-preview-image-trigger') ||
        link.closest('[data-image-preview-modal]')) return;

    e.preventDefault();
    sessionStorage.setItem('pt', '1');
    overlay.classList.add('is-covering');

    setTimeout(function () {
      window.location.href = href;
    }, duration);
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      overlay.classList.remove('is-covering');
      overlay.style.transform = '';
      sessionStorage.removeItem('pt');
    }
  });
})();
