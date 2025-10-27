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
        setVar(win, '--vvh', Math.round(vv.height) + 'px');
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
              const el = messagesList;
              const atBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 80;
              if (atBottom) {
                requestAnimationFrame(() => { try { el.scrollTop = el.scrollHeight; } catch (e) {} });
              }
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
      requestAnimationFrame(() => { updateForChatWindows(vv); });
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

  // Conservative delegated iOS fallback for .send-btn ONLY when element opts-in with
  // data-ios-send-fallback="true". Does not prevent native events; synthesizes click
  // only if no native click arrives shortly after touchend.
  (function delegatedSendFallback() {
    const isIOS = typeof navigator !== 'undefined' && /iP(hone|od|ad)/i.test(navigator.userAgent);
    if (!isIOS) return;

    document.addEventListener('click', function (ev) {
      try {
        const btn = ev.target && ev.target.closest ? ev.target.closest('[data-send-btn], .send-btn') : null;
        if (btn) nativeClickMap.set(btn, Date.now());
      } catch (e) {}
    }, true);

    document.addEventListener('touchstart', function (ev) {
      try {
        const btn = ev.target && ev.target.closest ? ev.target.closest('[data-send-btn], .send-btn') : null;
        if (!btn) return;
        btn.__ecom_touch_started = Date.now();
      } catch (e) {}
    }, { passive: true });

    document.addEventListener('touchend', function (ev) {
      try {
        const target = ev.target || ev.srcElement;
        const btn = target && target.closest ? target.closest('[data-send-btn], .send-btn') : null;
        if (!btn) return;
        if (btn.getAttribute('data-ios-send-fallback') !== 'true') return; // opt-in only
        const keyboardOpen = root.classList.contains('vv-keyboard-open');
        if (!keyboardOpen) return;

        const lastNative = nativeClickMap.get(btn) || 0;
        const now = Date.now();
        if (now - lastNative < 150) return;

        const lastSynth = parseInt(btn.getAttribute('data-ecom-last-synth') || '0', 10);
        if (now - lastSynth < 500) return;

        setTimeout(() => {
          const lastNativeLater = nativeClickMap.get(btn) || 0;
          if (Date.now() - lastNativeLater < 150) return; // native arrived
          try {
            btn.setAttribute('data-ecom-last-synth', String(Date.now()));
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            btn.dispatchEvent(clickEvent);
          } catch (e) {}
        }, 90);
      } catch (e) {}
    }, { passive: true });
  })();

  // initial
  updateOffset();
  if (window.visualViewport) setViewportHeight(window.visualViewport.height); else setViewportHeight(window.innerHeight || 0);
})();
