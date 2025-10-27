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
      const k = Math.round(keyboard);
      setOffset(k);
      // publish visual viewport height so CSS can use it instead of 100vh
      setViewportHeight(vv.height);

      // Toggle a class on the root when keyboard appears (threshold > 60px)
      if (k > 60) {
        document.documentElement.classList.add('vv-keyboard-open');
      } else {
        document.documentElement.classList.remove('vv-keyboard-open');
      }

      // Adjust any open chat-window and its chat-body to match the visual viewport
      try {
        const chatWindows = document.querySelectorAll('.chat-window.open');
        chatWindows.forEach(win => {
          // Set the panel height to visual viewport height so fixed/fullscreen matches
          win.style.height = vv.height + 'px';
          win.style.maxHeight = vv.height + 'px';
          // compute available body height (subtract header/footer if present)
          const header = win.querySelector('.chat-header');
          const footer = win.querySelector('.chat-footer');
          const body = win.querySelector('.chat-body');
          const headerH = header ? header.offsetHeight : 0;
          const footerH = footer ? footer.offsetHeight : 0;
          if (body) {
            const avail = Math.max(48, vv.height - headerH - footerH);
            body.style.height = avail + 'px';
            body.style.maxHeight = avail + 'px';
            body.style.overflowY = 'auto';
            body.style['-webkit-overflow-scrolling'] = 'touch';
          }
        });
      } catch (e) {
        // ignore DOM errors
      }

      // Force a tiny reflow to help Safari update hit testing/layers
      // eslint-disable-next-line no-unused-expressions
      document.documentElement.offsetHeight;
    } else {
      // Fallback: no reliable API; assume 0
      setOffset(0);
      // fallback to window.innerHeight
      setViewportHeight(window.innerHeight || 0);
      document.documentElement.classList.remove('vv-keyboard-open');
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

  // iOS Safari touch workaround: ensure send button receives taps while keyboard visible
  (function ensureSendButtonTouch() {
    const isIOS = typeof navigator !== 'undefined' && /iP(hone|od|ad)/i.test(navigator.userAgent);
    if (!isIOS) return;

    // Delegate touchend on send buttons to guarantee click
    document.addEventListener('touchend', function (ev) {
      try {
        const target = ev.target || ev.srcElement;
        const btn = target.closest ? target.closest('.send-btn') : null;
        if (btn) {
          // If the visual viewport indicates keyboard open, synthesize a click to ensure handler runs
          const keyboardOpen = document.documentElement.classList.contains('vv-keyboard-open');
          if (keyboardOpen) {
            // prevent duplicate activation if the element already handled the touch
            ev.preventDefault();
            btn.click();
          }
        }
      } catch (e) {
        // ignore
      }
    }, { passive: false });
  })();

  // Initial set
  updateOffset();
  // set initial vvh
  if (window.visualViewport) {
    setViewportHeight(window.visualViewport.height);
  } else {
    setViewportHeight(window.innerHeight || 0);
  }
})();
