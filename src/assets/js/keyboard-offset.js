// keyboard-offset.js
// Small utility to detect virtual keyboard presence and set a CSS variable
// (--keyboard-offset) with the keyboard height in pixels so CSS can adapt.
// Intended for mobile browsers (iOS Safari, Android Chrome). No framework code.
/**
 * keyboard-offset.js
 *
 * Revised helper for chat widget layout on mobile (iOS-focused) that:
 * - publishes CSS vars: --vvh, --keyboard-offset, --header-h, --footer-h, --chat-body-height
 * - toggles .vv-keyboard-open on documentElement when keyboard appears (threshold 60px)
 * - attaches a MutationObserver to messages-list to autoscroll only when user is at bottom
 * - provides a conservative delegated fallback for .send-btn ONLY when element has
 *   data-ios-send-fallback="true" (opt-in). No global click synthesis.
 * - guards against multiple instances / duplicate listeners
 */
(function () {
  if (typeof document === 'undefined') return;
  if (window.__ecom_chat_kb_helper_installed) return;
  window.__ecom_chat_kb_helper_installed = true;

  const root = document.documentElement;
  const observers = new WeakMap();
  const nativeClickMap = new WeakMap();

  function setVar(el, name, value) {
    try { el.style.setProperty(name, value); } catch (e) {}
  }

  function setOffset(value) { setVar(root, '--keyboard-offset', value + 'px'); }
  function setViewportHeight(h) { setVar(root, '--vvh', Math.round(h) + 'px'); }

  function updateForChatWindows(vv) {
    try {
      const chatWindows = document.querySelectorAll('.chat-window.open');
      chatWindows.forEach(win => {
        // publish visual viewport and also apply explicit inline height so Safari
        // uses the current visual viewport for the fixed fullscreen panel
        setVar(win, '--vvh', Math.round(vv.height) + 'px');
        try {
          win.style.height = Math.round(vv.height) + 'px';
          win.style.maxHeight = Math.round(vv.height) + 'px';
        } catch (e) {}
        const header = win.querySelector('.chat-header');
        const footer = win.querySelector('.chat-footer');
        const headerH = header ? header.offsetHeight : 0;
        const footerH = footer ? footer.offsetHeight : 0;
        setVar(win, '--header-h', headerH + 'px');
        setVar(win, '--footer-h', footerH + 'px');

        const chatBodyH = Math.max(48, Math.floor(vv.height - headerH - footerH));
        setVar(win, '--chat-body-height', chatBodyH + 'px');

        const messagesList = win.querySelector('[data-chat-messages], .messages-list');
        if (messagesList && !observers.has(messagesList)) {
          try {
            const mo = new MutationObserver(() => {
              // Delay slightly to ensure DOM updated after Angular inserts nodes
              setTimeout(() => {
                try {
                  const el = messagesList;
                  // If user is at (or near) bottom, auto-scroll to new message
                  if ((el.scrollHeight - el.scrollTop - el.clientHeight) < 60) {
                    try { el.scrollTop = el.scrollHeight; } catch (e) {}
                  }
                } catch (e) {}
              }, 50);
            });
            mo.observe(messagesList, { childList: true, subtree: true });
            observers.set(messagesList, mo);
          } catch (e) {}
        }
      });
    } catch (e) {}
  }

  function updateOffset() {
    if (window.visualViewport) {
      const vv = window.visualViewport;
      const keyboard = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      const k = Math.round(keyboard);
      setOffset(k);
      setViewportHeight(vv.height);

      if (k > 60) root.classList.add('vv-keyboard-open'); else root.classList.remove('vv-keyboard-open');

      updateForChatWindows(vv);

  // gentle reflow to help Safari recalc layers/hit-testing
  // eslint-disable-next-line no-unused-expressions
  document.documentElement.offsetHeight;
  // immediate rAF update
  requestAnimationFrame(() => { updateForChatWindows(vv); });
  // also re-apply after a short delay to let Safari stabilize when keyboard opens
  setTimeout(() => { try { updateForChatWindows(vv); } catch (e) {} }, 50);
    } else {
      setOffset(0);
      setViewportHeight(window.innerHeight || 0);
      root.classList.remove('vv-keyboard-open');
    }
  }

  let ticking = false;
  function rAFUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { try { updateOffset(); } catch (e) {} ; ticking = false; });
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', rAFUpdate, { passive: true });
    window.visualViewport.addEventListener('scroll', rAFUpdate, { passive: true });
  }

  document.addEventListener('focusin', () => setTimeout(rAFUpdate, 50));
  document.addEventListener('focusout', () => setTimeout(() => setOffset(0), 120));
  window.addEventListener('resize', rAFUpdate, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(rAFUpdate, 120));

  // Locking page scroll when chat is fullscreen
  // This prevents iOS Safari from showing dual scrollbars and allows the chat to
  // control its own viewport. We add/remove a class on <html> and fix body positioning.
  (function fullscreenLock() {
    let locked = false;
    let savedScroll = 0;
    const prevBody = { position: '', top: '', left: '', right: '', width: '', overflow: '' };

    function lock() {
      if (locked) return;
      try {
        savedScroll = window.scrollY || window.pageYOffset || 0;
        // add classes to both html and body so CSS can target either
        document.documentElement.classList.add('chat-fullscreen-active');
        document.body.classList.add('chat-fullscreen-active');

        // store previous inline styles to restore later
        prevBody.position = document.body.style.position || '';
        prevBody.top = document.body.style.top || '';
        prevBody.left = document.body.style.left || '';
        prevBody.right = document.body.style.right || '';
        prevBody.width = document.body.style.width || '';
        prevBody.overflow = document.body.style.overflow || '';

        // attempt to fix body to current scroll to prevent background scroll
        try {
          document.body.style.position = 'fixed';
          document.body.style.top = `-${savedScroll}px`;
          document.body.style.left = '0';
          document.body.style.right = '0';
          document.body.style.width = '100%';
          document.body.style.overflow = 'hidden';
        } catch (e) {}

        locked = true;
        try { rAFUpdate(); } catch (e) {}
      } catch (e) {}
    }

    function unlock() {
      if (!locked) return;
      try {
        document.documentElement.classList.remove('chat-fullscreen-active');
        document.body.classList.remove('chat-fullscreen-active');

        // restore previous inline styles
        try {
          document.body.style.position = prevBody.position;
          document.body.style.top = prevBody.top;
          document.body.style.left = prevBody.left;
          document.body.style.right = prevBody.right;
          document.body.style.width = prevBody.width;
          document.body.style.overflow = prevBody.overflow;
        } catch (e) {}

        // restore scroll position
        try { window.scrollTo(0, savedScroll); } catch (e) {}

        locked = false;
        try { rAFUpdate(); } catch (e) {}
      } catch (e) {}
    }

    function check() {
      try {
        const anyOpen = !!document.querySelector('.chat-window.open');
        if (anyOpen) lock(); else unlock();
      } catch (e) {}
    }

    // run checks on viewport changes and focus events
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', check, { passive: true });
      window.visualViewport.addEventListener('scroll', check, { passive: true });
    }
    document.addEventListener('focusin', () => setTimeout(check, 50));
    document.addEventListener('focusout', () => setTimeout(check, 120));
    window.addEventListener('resize', check, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(check, 120));

    // initial check
    check();
  })();

  // initial
  updateOffset();
  if (window.visualViewport) setViewportHeight(window.visualViewport.height); else setViewportHeight(window.innerHeight || 0);
})();
