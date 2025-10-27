// keyboard-offset.js
// Small utility to detect virtual keyboard presence and set a CSS variable
// (--keyboard-offset) with the keyboard height in pixels so CSS can adapt.
// Intended for mobile browsers (iOS Safari, Android Chrome). No framework code.
(function () {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  function setOffset(value) {
    try {
      root.style.setProperty('--keyboard-offset', value + 'px');
    } catch (e) {
      // ignore
    }
  }

  function setViewportHeight(h) {
    try {
      // expose visual viewport height in px so CSS can size fixed elements correctly
      root.style.setProperty('--vvh', Math.round(h) + 'px');
    } catch (e) {
      // ignore
    }
  }

  function updateOffset() {
    // Prefer visualViewport when available
    if (window.visualViewport) {
      const vv = window.visualViewport;
      const keyboard = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      // Some browsers may report small differences; clamp to integer
      setOffset(Math.round(keyboard));
      // publish visual viewport height so CSS can use it instead of 100vh
      setViewportHeight(vv.height);
    } else {
      // Fallback: no reliable API; assume 0
      setOffset(0);
      // fallback to window.innerHeight
      setViewportHeight(window.innerHeight || 0);
    }
  }

  let ticking = false;
  function rAFUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateOffset();
      ticking = false;
    });
  }

  // Listen to visualViewport resize for keyboard open/close
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', rAFUpdate, { passive: true });
    window.visualViewport.addEventListener('scroll', rAFUpdate, { passive: true });
    // also update immediate on resize to keep visual viewport var current
    window.visualViewport.addEventListener('resize', () => setViewportHeight(window.visualViewport.height), { passive: true });
  }

  // Also watch focusin/out so we react when inputs are focused
  document.addEventListener('focusin', (ev) => {
    // Delay a bit to allow viewport to settle on some browsers
    setTimeout(rAFUpdate, 50);
  });

  document.addEventListener('focusout', () => {
    // On blur, reset offset after short delay
    setTimeout(() => setOffset(0), 120);
  });

  // On resize/orientation change
  window.addEventListener('resize', rAFUpdate, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(rAFUpdate, 120));

  // Initial set
  updateOffset();
  // set initial vvh
  if (window.visualViewport) {
    setViewportHeight(window.visualViewport.height);
  } else {
    setViewportHeight(window.innerHeight || 0);
  }
})();
