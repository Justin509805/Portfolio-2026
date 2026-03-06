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
  nameEl.textContent = fullName;
  nameEl.setAttribute("aria-label", fullName);

  const done = () => {
    root.classList.add("anim-done");
  };

  if (prefersReducedMotion) {
    nameEl.style.setProperty("--reveal", "100%");
    nameEl.classList.add("is-zoomed");
    done();
    return;
  }

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
  const zoomDelayMs = 80;
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
    nameEl.style.setProperty("--reveal", "100%");
    window.setTimeout(() => {
      nameEl.classList.add("is-zoomed");
      window.setTimeout(done, zoomSettleMs);
    }, zoomDelayMs);
  };

  nameEl.style.setProperty("--reveal", "0%");
  requestAnimationFrame(tick);
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

      center.style.transform = `translateY(-50%) scale(${scale})`;
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
          centerName.style.transform = `translateY(-50%) scale(${centerScale})`;
          centerName.style.filter = `blur(${centerBlur}px)`;
          centerName.style.opacity = `${centerOpacity}`;
        }

        if (bottomNote) {
          bottomNote.style.transform = `scale(${1 - 0.06 * progress})`;
          bottomNote.style.filter = `blur(${progress * 2}px)`;
          bottomNote.style.opacity = `${1 - 0.4 * progress}`;
        }
      } else {
        // Clear inline styles to preserve initial reveal animation styles
        [centerName, bottomNote].forEach((el) => {
          if (!el) return;
          el.style.transform = '';
          el.style.filter = '';
          el.style.opacity = '';
        });
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

