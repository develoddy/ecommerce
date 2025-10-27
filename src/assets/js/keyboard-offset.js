// keyboard-offset.js (conservative)
// Purpose: publish visual-viewport height (--vvh) for CSS to use, and
// provide a conservative MutationObserver for message lists that
// auto-scrolls only when the user is already at/near the bottom.
// IMPORTANT: this file intentionally does NOT modify inline styles
// on body/html (no position:fixed, no inline height changes). CSS
// should rely on `height: var(--vvh, 100vh)` and other rules.
(function () {
  if (typeof document === 'undefined') return;
  if (window.__ecom_chat_kb_helper_installed) return;
  window.__ecom_chat_kb_helper_installed = true;

  const root = document.documentElement;

  function setVar(name, value) {
    try { root.style.setProperty(name, value); } catch (e) {}
  }

  function setVVH(px) { setVar('--vvh', Math.round(px) + 'px'); }

  // Publish visual viewport height. Do NOT calculate offsets that would
  // encourage CSS to add space for keyboards. The CSS should use --vvh
  // and not rely on any JS to move footers or inputs.
  function updateVVH() {
    try {
      if (window.visualViewport) {
        setVVH(window.visualViewport.height || window.innerHeight || 0);
      } else {
        setVVH(window.innerHeight || 0);
      }
    } catch (e) {}
  }

  // --- Messages-list observer: conservative auto-scroll ---
  // Behavior:
  // - Track whether the user is presently at/near the bottom (on scroll).
  // - When new nodes are added, auto-scroll ONLY when the user was at/near the
  //   bottom prior to the change. If the user scrolled up to read history, we
  //   preserve their position.
  const tracked = new WeakMap(); // element -> { atBottom: boolean, observer: MutationObserver }

  function isNearBottom(el, threshold = 60) {
    try {
      return (el.scrollHeight - (el.scrollTop || 0) - el.clientHeight) <= threshold;
    } catch (e) { return true; }
  }

  function attachMessagesObserver(el) {
    if (!el || tracked.has(el)) return;

    // initialize atBottom state from current scroll position
    const state = { atBottom: isNearBottom(el), observer: null };
    tracked.set(el, state);

    // track user scrolls to update atBottom flag
    const onScroll = () => { state.atBottom = isNearBottom(el); };
    el.addEventListener('scroll', onScroll, { passive: true });

    // MutationObserver: only auto-scroll if user was at bottom before the change
    try {
      const mo = new MutationObserver((mutations) => {
        try {
          // If the user was at bottom, scroll to bottom once the mutation settles.
          if (state.atBottom) {
            // schedule in next frame to let rendering settle
            requestAnimationFrame(() => {
              try { el.scrollTop = el.scrollHeight; } catch (e) {}
            });
          }
        } catch (e) {}
      });
      mo.observe(el, { childList: true, subtree: true });
      state.observer = mo;
    } catch (e) {}
  }

  function scanAndAttach() {
    try {
      const lists = document.querySelectorAll('[data-chat-messages], .messages-list');
      lists.forEach((el) => attachMessagesObserver(el));
    } catch (e) {}
  }

  // Keep var up-to-date on viewport changes
  let tick = false;
  function scheduleVVHUpdate() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(() => { try { updateVVH(); } catch (e) {} ; tick = false; });
  }

  // Initial publish
  updateVVH();

  // Listen for visualViewport and window events to update --vvh (no layout side-effects)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleVVHUpdate, { passive: true });
    window.visualViewport.addEventListener('scroll', scheduleVVHUpdate, { passive: true });
  }
  window.addEventListener('resize', scheduleVVHUpdate, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(updateVVH, 120));

  // Attach observers for messages lists when DOM changes (e.g. Angular renders)
  const domMo = new MutationObserver(() => {
    try { scanAndAttach(); } catch (e) {}
  });
  try {
    domMo.observe(document.body || document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  // Also attempt a scan right away
  scanAndAttach();

  // Expose a tiny debug hook (optional) so devs can inspect current --vvh
  try { window.__ecom_chat_kb_helper = { updateVVH, attachMessagesObserver }; } catch (e) {}
})();
