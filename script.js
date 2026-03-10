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
  if (!nameEl) return;

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
    nameEl.style.setProperty("--reveal", "100%");
    nameEl.classList.add("is-zoomed");
    done();
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
  requestAnimationFrame(tick);
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
    navToggle.textContent = open ? 'CLOSE' : 'MENU';
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

  items.forEach((el) => observer.observe(el));
})();

/* Sticky-like center name behavior: shrink + blur as the #work section scrolls up
   The center name stays fixed in the viewport; when the work section's top
   moves from the bottom of the viewport into the top, we map that progress
   (0 → 1) to scale/blur values.
*/
(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const center = document.querySelector('.center-name');
  const work = document.querySelector('#work');
  if (!center || !work) return;

  let ticking = false;

  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }

  function onScroll() {
    // don't disturb the intro state; only allow scroll-driven transforms
    // after the name has been allowed to zoom up
    if (center && !center.classList.contains('is-zoomed')) return;

    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const rect = work.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;

      // progress = 0 when work.top === vh (just below viewport)
      // progress = 1 when work.top === 0 (aligned with viewport top)
      let progress = (vh - rect.top) / vh;
      progress = clamp(progress, 0, 1);

      // Map progress to scale (1 -> 0.82) and blur (0 -> 6px)
      const scale = 1 - 0.18 * progress;
      const blur = 6 * progress;
      const opacity = 1 - 0.35 * progress;

      center.style.transform = `translate(-50%, -50%) scale(${scale})`;
      center.style.filter = `blur(${blur}px)`;
      center.style.opacity = `${opacity}`;

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  // Run once on load to set initial state
  window.addEventListener('load', onScroll);
})();

/* Sliding selected work overlay + scroll-driven blur/scale
   - Pins .work-overlay and moves its top from 100vh → 0vh while scrolling
   - Applies blur/scale to .center-name, .top-nav, .bottom-note based on progress
   - Computes .work-spacer height so the document scroll covers overlay content
*/
(function () {
  const workSection = document.querySelector('.section-work');
  if (!workSection) return;

  const workOverlay = workSection.querySelector('.work-overlay');
  const workSpacer = workSection.querySelector('.work-spacer');
  if (!workOverlay || !workSpacer) return;

  const firstScreen = document.querySelector('.first-screen');
  const centerName = document.querySelector('.center-name');
  const topNav = document.querySelector('.top-nav');
  const navName = document.querySelector('.nav-name');
  const navLinkItems = document.querySelectorAll('.nav-links a');
  const bottomNote = document.querySelector('.bottom-note');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    // If user prefers reduced motion, keep overlay in normal flow and don't pin it.
    workOverlay.style.position = 'relative';
    workOverlay.style.top = '';
    workOverlay.style.height = 'auto';
    workOverlay.style.overflow = 'visible';
    workSpacer.style.height = 'auto';
    return;
  }

  let ticking = false;

  function updateSpacer() {
    // Make spacer large enough so the document scroll covers the overlay content.
    // Total scroll for this section should allow the overlay's internal scroll.
    const overlayContentHeight = workOverlay.scrollHeight;
    // spacer = viewport + overlay content height gives room for pinning + internal scroll
    workSpacer.style.height = `${window.innerHeight + overlayContentHeight}px`;
  }

  function onScroll() {
    // do not disturb the intro state; scrolling should only affect the name
    // after it has been allowed to zoom
    if (centerName && !centerName.classList.contains('is-zoomed')) return;

    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      const scrollY = window.scrollY || window.pageYOffset;
      const firstH = firstScreen ? firstScreen.offsetHeight : window.innerHeight;
      const progress = Math.min(Math.max(scrollY / firstH, 0), 1);

      // Move overlay top from 100vh -> 0vh
      workOverlay.style.top = `${100 - progress * 100}vh`;

      if (progress > 0.0001) {
        const centerScale = 1 - 0.18 * progress;
        const centerBlur = progress * 6; // px
        const centerOpacity = 1 - 0.35 * progress;
        if (centerName) {
          // preserve vertical centering while scaling
          centerName.style.transform = `translate(-50%, -50%) scale(${centerScale})`;
          centerName.style.filter = `blur(${centerBlur}px)`;
          centerName.style.opacity = `${centerOpacity}`;
        }

        if (bottomNote) {
          bottomNote.style.transform = `scale(${1 - 0.06 * progress})`;
          bottomNote.style.filter = `blur(${progress * 2}px)`;
          bottomNote.style.opacity = `${1 - 0.4 * progress}`;
        }

        // Nav-name subtle lift + tilt for a clean, unique scroll effect
        if (navName) {
          const nameLift = -10 * progress; // px upward
          const nameScale = 1 - 0.02 * progress;
          const nameTilt = -3 * progress; // deg
          navName.style.transform = `translateY(${nameLift}px) scale(${nameScale}) rotateX(${nameTilt}deg)`;
          navName.style.opacity = `${1 - 0.18 * progress}`;
        }

        // Nav links: staggered subtle parallax + tilt
        if (navLinkItems && navLinkItems.length) {
          navLinkItems.forEach((el, i) => {
            const idx = i + 1;
            const factor = idx / navLinkItems.length;
            const y = -6 * progress * (1 + factor * 0.6); // staggered lift
            const rot = -4 * progress * factor; // small rotation
            const opa = 1 - 0.5 * progress * (0.6 + factor * 0.4);
            el.style.transform = `translateY(${y}px) rotateX(${rot}deg)`;
            el.style.opacity = `${opa}`;
          });
        }
      } else {
        // Clear inline styles to preserve initial reveal animation styles
        [centerName, bottomNote].forEach((el) => {
          if (!el) return;
          el.style.transform = '';
          el.style.filter = '';
          el.style.opacity = '';
        });
        if (navName) {
          navName.style.transform = '';
          navName.style.opacity = '';
        }
        if (navLinkItems && navLinkItems.length) {
          navLinkItems.forEach((el) => {
            el.style.transform = '';
            el.style.opacity = '';
          });
        }
      }

      ticking = false;
    });
  }

  window.addEventListener('load', () => {
    updateSpacer();
    onScroll();
  });

  window.addEventListener('resize', () => {
    updateSpacer();
    onScroll();
  });

  window.addEventListener('scroll', onScroll, { passive: true });
})();

