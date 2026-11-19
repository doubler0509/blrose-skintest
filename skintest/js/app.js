/*
 * 블로즈 피부 타입 테스트 — 화면 전환, 점수 계산, 결과 저장
 * 문항·점수·문구는 config.js 에 있다. 이 파일은 고칠 일이 거의 없다.
 */
(function () {
  'use strict';

  var C = window.SKINTEST_CONFIG;
  var Pixel = window.SkinTestPixel;
  var Photo = window.SkinTestPhoto || null;   // 구형 브라우저에서는 없을 수 있다 → 사진 단계 자동 건너뛰기
  var params = new URLSearchParams(location.search);

  /* ───────── 도우미 ───────── */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* 무시 */ } }
  function sdel(k) { try { sessionStorage.removeItem(k); } catch (e) { /* 무시 */ } }

  /* ───────── 주소 옵션 ─────────
   * ?dev=1    PC 에서도 테스트 열기 (오픈 후에도 유지)
   * ?login=1  시제품에서 로그인 상태 흉내 (?login=0 으로 해제)
   * ?joined=1 가입 완료 페이지에서 돌아왔다는 표시 → 쿠폰 배너 노출
   */
  if (params.get('dev') === '1') sset('blrose_skintest_dev', '1');
  var isDev = sget('blrose_skintest_dev') === '1';
  if (C.env === 'prototype') {
    if (params.get('login') === '1') sset('blrose_skintest_login', '1');
    if (params.get('login') === '0') sdel('blrose_skintest_login');
  }
  if (params.get('joined') === '1') sset('blrose_skintest_joined', '1');

  var state = {
    answers: [], idx: 0, locked: false, timer: null,
    photo: null, photoRaw: null, photoToken: 0,
    result: null
  };

  /* ───────── 모바일 판별 (7장) ───────── */
  function isMobile() {
    var ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|Mobile/i.test(ua)) return true;
    var w = Math.min(window.screen.width, window.screen.height);
    return navigator.maxTouchPoints > 1 && w <= 1024;   // Mac 처럼 보이는 iPad 대비
  }

  /* ───────── 로그인 상태 (8장) ───────── */
  function isLoggedIn() {
    if (C.env === 'cafe24') return !!document.getElementById('skintest-logon-flag');
    return sget('blrose_skintest_login') === '1';
  }

  /* ───────── 점수 계산과 판정 (4장) ───────── */
  function judge(answers) {
    var sc = { D: 0, O: 0, M: 0, S: 0, W: 0 }, q10 = null;
    C.questions.forEach(function (q, i) {
      var opt = q.options[answers[i]];
      if (!opt) return;
      Object.keys(opt.score).forEach(function (axis) { sc[axis] += opt.score[axis]; });
      if (opt.focus) q10 = answers[i];
    });

    var R = C.rules, type;
    if (sc.S >= R.sensitiveMin) {
      type = R.axisType.S;                       // 1. 민감 신호가 우선
    } else {
      var best = R.tieOrder[0];                  // 2~3. 가장 높은 축, 동점이면 tieOrder 순
      R.tieOrder.forEach(function (axis) { if (sc[axis] > sc[best]) best = axis; });
      type = R.axisType[best];
    }
    var tag = type !== R.axisType.S && sc.S >= R.tagMin && sc.S <= R.tagMax;   // 4. 민감 경향 태그
    return { type: type, scores: sc, tag: tag, q10: q10 };
  }

  function focusOf(result) {
    var q = C.questions[C.questions.length - 1];
    var opt = q.options[result.q10];
    return opt && opt.focus ? C.focus[opt.focus] : null;
  }

  /* ───────── 결과 저장·불러오기 (8장) ───────── */
  function saveResult(r) {
    var json = JSON.stringify({
      v: 1, type: r.type, scores: r.scores, tag: r.tag, q10: r.q10,
      photo: r.photo || null,            // 사진은 지표 3개의 단계 값만 저장한다
      savedAt: r.savedAt
    });
    try { localStorage.setItem(C.storage.resultKey, json); } catch (e) { /* 무시 */ }
    var cookie = C.storage.resultKey + '=' + encodeURIComponent(json) +
      '; path=/; max-age=' + (C.storage.cookieDays * 86400) + '; SameSite=Lax';
    if (C.storage.cookieDomain) cookie += '; domain=' + C.storage.cookieDomain;
    if (location.protocol === 'https:') cookie += '; Secure';
    document.cookie = cookie;
  }

  function loadResult() {
    var raw = null;
    try { raw = localStorage.getItem(C.storage.resultKey); } catch (e) { /* 무시 */ }
    if (!raw) {
      var m = document.cookie.match(new RegExp('(?:^|; )' + C.storage.resultKey + '=([^;]*)'));
      if (m) { try { raw = decodeURIComponent(m[1]); } catch (e) { raw = null; } }
    }
    if (!raw) return null;
    try {
      var r = JSON.parse(raw);
      return r && C.types[r.type] ? r : null;
    } catch (e) { return null; }
  }

  /* ───────── 화면 전환 ───────── */
  function show(id) {
    $$('.screen').forEach(function (el) { el.classList.toggle('is-active', el.id === id); });
    window.scrollTo(0, 0);
  }

  function cleanUrl() {
    var p = new URLSearchParams(location.search);
    ['unlock', 'share', 'joined', 'answers', 'photo', 'login'].forEach(function (k) { p.delete(k); });
    var q = p.toString();
    return location.pathname + (q ? '?' + q : '');
  }

  /* 화면 상태를 브라우저 기록에 남겨, 폰의 뒤로가기가 이전 문항으로 가게 한다 */
  function nav(st, replace, url) {
    try { history[replace ? 'replaceState' : 'pushState'](st, '', url || location.href); } catch (e) { /* 무시 */ }
    render(st);
  }

  function render(st) {
    clearTimeout(state.timer);
    state.locked = false;
    closeCamera();
    switch (st.s) {
      case 'pc':
        show('s0');
        break;
      case 'quiz':
        state.idx = st.i;
        renderQuestion();
        show('s2');
        break;
      case 'photo':
        showPhotoStep('intro');
        show('s3');
        break;
      case 'result':
        if (!state.result) { render({ s: 'intro' }); break; }
        renderResult();
        break;
      case 'share':
        $('#share-hero').innerHTML = heroHtml({ type: st.type, tag: false }, false);
        show('s-share');
        break;
      default:
        $('#btn-last').hidden = !loadResult();
        show('s1');
    }
  }

  window.addEventListener('popstate', function (e) { render(e.state || { s: 'intro' }); });

  /* ───────── S2 문진 ───────── */
  function renderQuestion() {
    var i = state.idx, q = C.questions[i], total = C.questions.length;
    $('#q-no').textContent = 'Q' + (i + 1);
    $('#q-text').textContent = q.text;
    $('#progress-bar').style.width = ((i + 1) / total * 100) + '%';
    $('#progress-count').textContent = (i + 1) + '/' + total;
    $('#progress').setAttribute('aria-valuenow', i + 1);
    $('#progress').setAttribute('aria-valuemax', total);
    $('#q-options').innerHTML = q.options.map(function (o, j) {
      return '<button type="button" class="option' + (state.answers[i] === j ? ' is-selected' : '') +
        '" data-opt="' + j + '">' + esc(o.label) + '</button>';
    }).join('');
  }

  function choose(j) {
    if (state.locked) return;
    state.locked = true;
    state.answers[state.idx] = j;
    $$('#q-options .option').forEach(function (b, k) { b.classList.toggle('is-selected', k === j); });
    var next = state.idx + 1;
    state.timer = setTimeout(function () {       // 0.3초 뒤 다음 문항으로 자동 이동
      if (next < C.questions.length) nav({ s: 'quiz', i: next });
      else nav({ s: 'photo' });
    }, C.timing.autoNext);
  }

  function start() {
    state.answers = []; state.photo = null; state.photoRaw = null; state.result = null;
    Pixel.track('SkinTestStart', Pixel.utm());
    nav({ s: 'quiz', i: 0 }, false, cleanUrl());
  }

  /* ───────── S3 사진 (선택) ───────── */
  var video = $('#camera-video');

  function showPhotoStep(name) {
    ['intro', 'camera', 'file'].forEach(function (n) { $('#photo-' + n).hidden = n !== name; });
    $('#camera-msg').textContent = '';
    $('#file-msg').textContent = '';
    $('#camera-busy').hidden = true;
    $('#file-busy').hidden = true;
  }

  function closeCamera() {
    state.photoToken++;
    if (Photo) Photo.closeCamera(video);
  }

  function startPhoto() {
    if (!Photo) return photoUnavailable();
    var token = ++state.photoToken;
    Photo.preload().catch(function () { /* 분석 시점에 다시 처리 */ });   // 라이브러리·모델은 이때 처음 불러온다
    showPhotoStep('camera');
    $('#btn-shutter').disabled = true;
    Photo.openCamera(video).then(function () {
      if (token !== state.photoToken) { Photo.closeCamera(video); return; }   // 그 사이 화면을 떠났으면 바로 끈다
      $('#btn-shutter').disabled = false;
    }).catch(function () {
      if (token !== state.photoToken) return;
      Photo.closeCamera(video);
      showPhotoStep('file');          // 카메라가 열리지 않으면 폰 기본 카메라로 대체
    });
  }

  function shoot() {
    var token = state.photoToken;
    $('#btn-shutter').disabled = true;
    $('#camera-busy').hidden = false;
    $('#camera-msg').textContent = '';
    var t0 = Date.now();
    Photo.analyze(Photo.frameFromVideo(video), 'camera').then(function (res) {
      if (token !== state.photoToken) return;
      onAnalyzed(res, 'camera', t0);
    }).catch(function () { if (token === state.photoToken) photoUnavailable(); });
  }

  function onFile(file) {
    if (!file) return;
    var token = state.photoToken;
    $('#file-busy').hidden = false;
    $('#file-msg').textContent = '';
    var t0 = Date.now();
    Photo.frameFromFile(file).then(function (frame) {
      return Photo.analyze(frame, 'file');
    }).then(function (res) {
      if (token !== state.photoToken) return;
      onAnalyzed(res, 'file', t0);
    }).catch(function () { if (token === state.photoToken) photoUnavailable(); });
  }

  function onAnalyzed(res, method, t0) {
    $('#camera-busy').hidden = true;
    $('#file-busy').hidden = true;
    if (isDev && window.console) console.log('[skintest photo]', (Date.now() - t0) + 'ms', res);
    if (!res.ok) {                    // 촬영 품질 검사 실패 → 다시 찍기 안내
      var msg = C.photo.qualityMessages[res.reason] || C.photo.qualityMessages.face;
      $(method === 'camera' ? '#camera-msg' : '#file-msg').textContent = msg;
      $('#btn-shutter').disabled = false;
      return;
    }
    state.photo = res.levels;
    state.photoRaw = res.raw;         // 화면 표시용(개발 모드). 저장하지 않는다.
    Pixel.track('SkinTestPhoto', { method: method });
    finish();
  }

  /* 카메라·대체 촬영 모두 안 될 때: 안내 후 자동으로 건너뛴다 */
  function photoUnavailable() {
    closeCamera();
    state.photo = null;
    toast(C.copy.photoSkip);
    finish();
  }

  function skipPhoto() {
    closeCamera();
    state.photo = null;
    finish();
  }

  /* ───────── S4 분석 중 → S5 ───────── */
  function finish() {
    closeCamera();
    show('s4');
    clearTimeout(state.timer);
    state.timer = setTimeout(function () {
      var r = judge(state.answers);
      r.photo = state.photo;
      r.savedAt = new Date().toISOString();
      state.result = r;
      saveResult(r);
      Pixel.track('SkinTestComplete', { skin_type: r.type, photo_used: !!r.photo });
      nav({ s: 'result' }, true);
    }, C.timing.analyzing);
  }

  /* ───────── S5·S6 결과 ───────── */
  var DROP = 'M36 8C36 8 16 32 16 46a20 20 0 0 0 40 0C56 32 36 8 36 8Z';
  var ICONS = {
    dry: '<path d="' + DROP + '" fill="#fff" stroke="#BF1541" stroke-width="3"/><path d="M28 44h6M38 50h6M30 56h8" stroke="#E5BCC8" stroke-width="3" stroke-linecap="round"/>',
    oily: '<path d="' + DROP + '" fill="#BF1541" stroke="#BF1541" stroke-width="3"/><path d="M26 46a10 10 0 0 0 10 10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
    combo: '<path d="' + DROP + '" fill="#fff"/><path d="M16 46a20 20 0 0 0 40 0Z" fill="#E5BCC8"/><path d="' + DROP + '" fill="none" stroke="#BF1541" stroke-width="3"/>',
    sensitive: '<path d="' + DROP + '" fill="#FBEFF2" stroke="#BF1541" stroke-width="3"/><path d="M56 6l2.4 6 6 2.4-6 2.4-2.400 6-2.4-6-6-2.4 6-2.4z" fill="#BF1541"/><circle cx="36" cy="46" r="5" fill="#E5BCC8"/>',
    dehydrated: '<path d="' + DROP + '" fill="#fff" stroke="#BF1541" stroke-width="3"/><path d="M36 34C36 34 28 44 28 50a8 8 0 0 0 16 0C44 44 36 34 36 34Z" fill="#BF1541"/>'
  };

  function heroHtml(r, mine) {
    var t = C.types[r.type];
    return (mine ? '<p class="result-hero__label">내 피부 타입은</p>' : '') +
      '<div class="result-hero__icon"><svg viewBox="0 0 72 72" aria-hidden="true">' + ICONS[r.type] + '</svg></div>' +
      '<h2 class="result-hero__type">' + esc(t.name) + '</h2>' +
      (r.tag ? '<span class="result-hero__tag">' + esc(C.copy.sensitiveTag) + '</span>' : '') +
      '<p class="result-hero__line">' + esc(t.oneLine) + '</p>' +
      '<ul class="features">' + t.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>';
  }

  function photoHtml(r) {
    var L = C.photo.labels;
    var rows = ['redness', 'shine', 'tone'].map(function (k) {
      return '<li><span>' + esc(L[k].title) + '</span><b>' + esc(L[k][r.photo[k]] || '') + '</b></li>';
    }).join('');
    var dev = isDev && state.photoRaw
      ? '<p class="metrics__dev">[dev] ' + esc(JSON.stringify(state.photoRaw)) + '</p>' : '';
    return '<p class="metrics__title">사진 참고 지표</p><ul class="metrics">' + rows + '</ul>' +
      '<p class="metrics__caveat">' + esc(C.copy.photoCaveat) + '</p>' + dev;
  }

  function productUrl(p) {
    return p.productNo ? C.paths.product + p.productNo : C.brand.shopUrl;
  }

  function renderFull(r) {
    var t = C.types[r.type];

    var banner = $('#coupon-banner');
    banner.hidden = sget('blrose_skintest_joined') !== '1';   // 신규가입으로 돌아온 경우에만 쿠폰 배너
    banner.textContent = C.coupon.banner;

    var focus = focusOf(r), extra = [];
    if (r.photo) {
      var RL = C.photo.reportLines;
      if (r.type !== 'sensitive' && r.photo.redness === 'high') extra.push(RL.rednessHigh);
      if (r.type !== 'oily' && r.photo.shine === 'high') extra.push(RL.shineHigh);
      if (r.photo.tone === 'low') extra.push(RL.toneLow);
    }
    $('#report').className = 'card report';
    $('#report').innerHTML =
      t.report.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      (focus ? '<div class="report__focus"><b>집중 케어 포인트 · ' + esc(focus.title) + '</b>' + esc(focus.text) + '</div>' : '') +
      extra.map(function (x) { return '<p class="report__extra">' + esc(x) + '</p>'; }).join('');

    $('#routine').innerHTML = t.routine.map(function (s) {
      return '<li><span class="routine__label">' + esc(s.label) + '</span><span class="routine__text">' + esc(s.text) + '</span></li>';
    }).join('');

    var commonReason = t.commonReason
      ? '<p class="products__common"><b>전제품 공통</b>' + esc(t.commonReason) + '</p>' : '';
    $('#products').innerHTML = commonReason + t.order.map(function (key) {
      var p = C.products[key];
      var strong = key === t.highlight;
      return '<article class="product">' +
        '<img class="product__img" src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy">' +
        '<div><p class="product__rank' + (strong ? ' product__rank--strong' : '') + '">' + (strong ? '강력추천' : '추천') + '</p>' +
        '<h4 class="product__name">' + esc(p.name) + '</h4>' +
        (p.sub ? '<p class="product__sub">' + esc(p.sub) + '</p>' : '') +
        '<p class="product__reason">' + esc(t.reasons[key] || '') + '</p>' +
        '<a class="product__btn" href="' + esc(productUrl(p)) + '" data-product="' + key + '">상품 보기</a></div></article>';
    }).join('');

    var set = C.products.set;
    var showSet = set.items.every(function (key) { return t.order.indexOf(key) !== -1; });
    $('#set-card').innerHTML = !showSet ? '' : '<article class="set-card">' +
      '<img src="' + esc(set.img) + '" alt="' + esc(set.name) + '" loading="lazy">' +
      '<div><p class="set-card__eyebrow">한 번에 시작하기</p>' +
      '<h4 class="set-card__name">' + esc(set.name) + '</h4>' +
      '<p class="set-card__sub">' + esc(set.sub) + '</p>' +
      '<a class="product__btn" href="' + esc(productUrl(set)) + '" data-product="set">상품 보기</a></div></article>';
  }

  function renderResult() {
    var r = state.result, full = isLoggedIn();
    var screen = $(full ? '#s6' : '#s5');
    $('[data-result-hero]', screen).innerHTML = heroHtml(r, true);
    var photoCard = $('[data-result-photo]', screen);
    photoCard.hidden = !r.photo;
    if (r.photo) photoCard.innerHTML = photoHtml(r);
    if (full) renderFull(r);
    show(full ? 's6' : 's5');
  }

  function retry() {
    state.answers = []; state.photo = null; state.photoRaw = null; state.result = null;
    nav({ s: 'intro' }, false, cleanUrl());
  }

  function share() {
    var r = state.result;
    if (!r) return;
    var url = new URL(C.paths.test, location.href);
    url.search = '?share=' + r.type + '&utm_source=share';
    var data = {
      title: '블로즈 피부 타입 테스트',
      text: '내 피부 타입은 ' + C.types[r.type].name + '! 30초 테스트로 알아보세요',
      url: url.href
    };
    if (navigator.share) {
      navigator.share(data).catch(function () { /* 사용자가 닫음 */ });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url.href).then(function () { toast('링크를 복사했어요'); },
        function () { toast(url.href); });
    } else {
      toast(url.href);
    }
  }

  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-show'); }, 2600);
  }

  /* ───────── 시작 ───────── */
  function fillStatic() {
    $$('[data-copy]').forEach(function (el) { el.textContent = C.copy[el.getAttribute('data-copy')] || ''; });
    $$('[data-coupon]').forEach(function (el) { el.textContent = C.coupon[el.getAttribute('data-coupon')] || ''; });
    $$('[data-wordmark]').forEach(function (el) { el.textContent = C.brand.wordmark; });
    $$('[data-shop-link]').forEach(function (el) { el.href = C.brand.shopUrl; });
    $('#btn-signup').href = C.paths.join;
    $('#link-member').href = C.paths.login;
  }

  function bind() {
    $('#btn-start').addEventListener('click', start);
    $('#btn-share-start').addEventListener('click', start);
    $('#btn-last').addEventListener('click', function () {
      state.result = loadResult();
      nav({ s: 'result' });
    });
    $('#btn-back').addEventListener('click', function () { history.back(); });
    $('#q-options').addEventListener('click', function (e) {
      var b = e.target.closest('[data-opt]');
      if (b) choose(Number(b.getAttribute('data-opt')));
    });
    $('#btn-photo').addEventListener('click', startPhoto);
    $('#btn-shutter').addEventListener('click', shoot);
    $('#file-input').addEventListener('change', function (e) {
      onFile(e.target.files && e.target.files[0]);
      e.target.value = '';
    });
    $$('[data-photo-skip]').forEach(function (b) { b.addEventListener('click', skipPhoto); });
    $$('[data-share]').forEach(function (b) { b.addEventListener('click', share); });
    $$('[data-retry]').forEach(function (b) { b.addEventListener('click', retry); });
    $('#btn-signup').addEventListener('click', function () {
      if (state.result) Pixel.track('SignupClick', { skin_type: state.result.type });
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-product]');
      if (!a) return;
      var p = C.products[a.getAttribute('data-product')];
      Pixel.track('ViewContent', {
        content_type: 'product', content_ids: p.productNo ? [String(p.productNo)] : [], content_name: p.name
      }, true);
    });
  }

  function init() {
    document.title = '피부 타입 테스트 | 블로즈 BLROSE';   // 카페24가 쇼핑몰 기본 제목으로 덮어쓰는 것을 되돌린다
    fillStatic();
    bind();

    /* PC 로 들어오면 QR 안내만 보여준다 */
    if (!isMobile() && !isDev) {
      nav({ s: 'pc' }, true);
      if (window.SkinTestQR) {
        window.SkinTestQR.render($('#qr-box'), location.href).catch(function () { $('#qr-box').hidden = true; });
      }
      return;
    }

    var shareType = params.get('share');
    var saved = loadResult();

    if (shareType && C.types[shareType]) {
      nav({ s: 'share', type: shareType }, true);
    } else if (isDev && params.get('answers')) {
      /* 개발용: ?dev=1&answers=1,1,1,1,3,3,3,3,1,1 (문항별 보기 번호) [&photo=high,mid,low] */
      state.answers = params.get('answers').split(',').map(function (n) { return Number(n) - 1; });
      var ph = (params.get('photo') || '').split(',');
      state.photo = ph.length === 3 ? { redness: ph[0], shine: ph[1], tone: ph[2] } : null;
      var r = judge(state.answers);
      r.photo = state.photo;
      r.savedAt = new Date().toISOString();
      state.result = r;
      saveResult(r);
      nav({ s: 'result' }, true);
    } else if (params.get('unlock') === '1') {
      if (saved) {
        state.result = saved;
        nav({ s: 'result' }, true);
      } else {
        nav({ s: 'intro' }, true);
        toast('저장된 결과가 없어요. 테스트를 다시 진행해 주세요');
      }
    } else {
      nav({ s: 'intro' }, true);
    }
  }

  window.SkinTest = { judge: judge, loadResult: loadResult, isMobile: isMobile, isLoggedIn: isLoggedIn, state: state };

  init();
})();
