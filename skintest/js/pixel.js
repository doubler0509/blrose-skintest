/*
 * 메타 픽셀 이벤트 + UTM 저장
 * - UTM 은 처음 들어온 순간 저장해 가입 완료까지 유지한다 (first-touch)
 * - 픽셀 ID(config.pixel.id)가 없고 페이지에 fbq 도 없으면 이벤트를 콘솔에만 남긴다
 */
(function () {
  'use strict';
  var C = window.SKINTEST_CONFIG;
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  var log = [];

  function readUtm() {
    try { return JSON.parse(localStorage.getItem(C.storage.utmKey) || 'null'); } catch (e) { return null; }
  }

  function captureUtm() {
    if (readUtm()) return;            // 이미 저장돼 있으면 덮어쓰지 않는다
    var p = new URLSearchParams(location.search), utm = {}, found = false;
    UTM_KEYS.forEach(function (k) { if (p.get(k)) { utm[k] = p.get(k); found = true; } });
    if (!found) return;
    utm.landed_at = new Date().toISOString();
    try { localStorage.setItem(C.storage.utmKey, JSON.stringify(utm)); } catch (e) { /* 저장 불가 환경 */ }
  }

  function ensureFbq() {
    if (window.fbq || !C.pixel.id) return;
    /* 메타 픽셀 기본 코드 (카페24 메타 연동이 이미 넣어 주면 실행되지 않는다) */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', C.pixel.id);
    window.fbq('track', 'PageView');
  }

  /* name: 이벤트명, params: 함께 보낼 값, standard: 표준 이벤트 여부 */
  function track(name, params, standard) {
    params = params || {};
    log.push({ name: name, params: params, at: Date.now() });
    if (window.fbq) {
      window.fbq(standard ? 'track' : 'trackCustom', name, params);
    } else if (window.console) {
      console.log('[skintest pixel]', name, params);
    }
  }

  function utmParams() {
    var utm = readUtm() || {}, out = {};
    UTM_KEYS.forEach(function (k) { if (utm[k] && k !== 'fbclid') out[k] = utm[k]; });
    return out;
  }

  captureUtm();
  ensureFbq();

  window.SkinTestPixel = { track: track, utm: utmParams, log: log };
})();
