/* /js/pixel.js — stable single-source loader */
(function () {
  try {
    if (!window.fbq) {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = !0; n.version = '2.0';
        n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    }

    var PIXEL_ID = '1051611783243364';

    if (!window.__META_PIXEL_INITED__) {
      window.__META_PIXEL_INITED__ = true;
      window.__FB_PIXEL_ID__ = PIXEL_ID;
      fbq('init', PIXEL_ID);
      fbq('track', 'PageView');
    }
  } catch (e) {
    // swallow errors to avoid breaking checkout
    console && console.warn && console.warn('[pixel.js] init error', e);
  }
})();
