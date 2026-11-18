/*
 * 사진 간이 분석 — 카메라, 얼굴 인식, 참고 지표 계산
 *
 * 개인정보 원칙
 *  - 사진은 폰 브라우저 안에서만 분석한다. 서버로 보내지 않고 어디에도 저장하지 않는다.
 *  - 분석이 끝나면 카메라를 끄고(스트림 종료) 이미지 데이터를 바로 지운다.
 *  - 밖으로 나가는 값은 지표 3개의 단계(low / mid / high)뿐이다.
 *
 * 지표는 참고용이며 피부 타입 판정에는 쓰지 않는다. 기준값은 config.js 의 photo 항목.
 */
(function () {
  'use strict';

  var P = window.SKINTEST_CONFIG.photo;
  var loading = null;        // Face Landmarker 로딩 Promise
  var stream = null;         // 열려 있는 카메라 스트림

  /* MediaPipe 라이브러리와 모델은 [촬영하기]를 눌렀을 때 처음 불러온다 */
  function preload() {
    if (loading) return loading;
    loading = import(P.cdn.module).then(function (mp) {
      return mp.FilesetResolver.forVisionTasks(P.cdn.wasm).then(function (fileset) {
        return mp.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: P.cdn.model, delegate: P.delegate },
          runningMode: 'IMAGE',
          numFaces: 2          // 2명 이상 잡히면 "얼굴 1개" 검사에서 걸러낸다
        });
      });
    });
    loading.catch(function () { loading = null; });   // 실패하면 다음에 다시 시도
    return loading;
  }

  /* ───────── 카메라 ───────── */
  function openCamera(video) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('camera unsupported'));
    }
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: P.captureWidth } }
    }).then(function (s) {
      stream = s;
      video.srcObject = s;
      return video.play();
    }).then(function () {
      if (video.videoWidth) return;
      return new Promise(function (resolve) {
        video.addEventListener('loadedmetadata', function () { resolve(); }, { once: true });
      });
    });
  }

  function closeCamera(video) {
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    if (video && video.srcObject) video.srcObject = null;
  }

  /* ───────── 촬영 프레임 ───────── */
  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  /* 화면에 보이는 영역(object-fit: cover)만 잘라 캔버스에 그린다 */
  function frameFromVideo(video) {
    var vw = video.videoWidth, vh = video.videoHeight;
    var box = video.getBoundingClientRect();
    var ar = box.width && box.height ? box.width / box.height : vw / vh;
    var sw = vw, sh = vh;
    if (vw / vh > ar) sw = vh * ar; else sh = vw / ar;
    var scale = Math.min(1, P.captureWidth / sw);
    var c = makeCanvas(sw * scale, sh * scale);
    c.getContext('2d', { willReadFrequently: true })
      .drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, c.width, c.height);
    return c;
  }

  /* 대체 촬영: 폰 기본 카메라로 찍은 파일. 메모리에서만 읽고 바로 해제한다. */
  function frameFromFile(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, P.captureWidth / img.naturalWidth);
        var c = makeCanvas(img.naturalWidth * scale, img.naturalHeight * scale);
        c.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        img.onload = img.onerror = null;
        resolve(c);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('image load failed'));
      };
      img.src = url;
    });
  }

  /* ───────── 색 변환: sRGB → CIE Lab (D65) ───────── */
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function f(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
  function toLab(r, g, b) {
    r = lin(r); g = lin(g); b = lin(b);
    var x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
    var y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    var z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
    var fx = f(x), fy = f(y), fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  /* 얼굴 점 주변 원형 영역의 픽셀을 Lab 으로 모은다 */
  function sample(img, cx, cy, rad) {
    var W = img.width, H = img.height, d = img.data;
    var Ls = [], Cs = [], sumL = 0, sumA = 0, n = 0;
    var x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(W - 1, Math.ceil(cx + rad));
    var y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(H - 1, Math.ceil(cy + rad));
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > rad * rad) continue;
        var i = (y * W + x) * 4;
        var lab = toLab(d[i], d[i + 1], d[i + 2]);
        Ls.push(lab[0]);
        Cs.push(Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]));
        sumL += lab[0]; sumA += lab[1]; n++;
      }
    }
    return { n: n, L: n ? sumL / n : 0, a: n ? sumA / n : 0, Ls: Ls, Cs: Cs };
  }

  /* 빛 반사로 하얗게 날아간 픽셀 비율 */
  function shineRatio(regions, baseL) {
    var T = P.thresholds.shine, hit = 0, n = 0;
    regions.forEach(function (r) {
      for (var i = 0; i < r.n; i++) {
        if (r.Ls[i] - baseL >= T.deltaL && r.Cs[i] <= T.maxChroma) hit++;
      }
      n += r.n;
    });
    return n ? hit / n : 0;
  }

  function level(value, low, high) { return value < low ? 'low' : value >= high ? 'high' : 'mid'; }
  function round(v, p) { var m = Math.pow(10, p); return Math.round(v * m) / m; }

  /* ───────── 분석 ─────────
   * 결과: { ok: true, levels: { redness, shine, tone }, raw: {...} }
   *   또는 { ok: false, reason: 'face' | 'size' | 'dark' | 'bright' | 'angle' }
   */
  function analyze(canvas, source) {
    return preload().then(function (landmarker) {
      try {
        return measure(landmarker, canvas, source);
      } finally {
        canvas.width = canvas.height = 0;     // 이미지 데이터를 바로 지운다
      }
    }, function (err) {
      canvas.width = canvas.height = 0;
      throw err;
    });
  }

  function measure(landmarker, canvas, source) {
    var W = canvas.width, H = canvas.height, Q = P.quality, LM = P.landmarks;

    var found = landmarker.detect(canvas);
    var faces = (found && found.faceLandmarks) || [];
    if (faces.length !== 1) return { ok: false, reason: 'face' };          // 검사 1: 얼굴 1개
    var lm = faces[0];
    function pt(i) { return { x: lm[i].x * W, y: lm[i].y * H }; }

    var a = pt(LM.faceLeft), b = pt(LM.faceRight);
    var faceW = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
    var minRatio = source === 'file' ? Q.minFaceWidthRatioFile : Q.minFaceWidthRatio;
    if (faceW / W < minRatio) return { ok: false, reason: 'size' };        // 검사 2: 크기

    var nose = pt(LM.noseTip);
    var left = Math.min(a.x, b.x), right = Math.max(a.x, b.x);
    var yaw = (nose.x - left) / (right - left || 1);
    var e1 = pt(LM.eyeL), e2 = pt(LM.eyeR);
    var roll = Math.abs(Math.atan2(e2.y - e1.y, e2.x - e1.x) * 180 / Math.PI);
    if (roll > 90) roll = 180 - roll;
    if (yaw < Q.yawMin || yaw > Q.yawMax || roll > Q.maxRollDeg) {
      return { ok: false, reason: 'angle' };                                // 검사 4: 각도
    }

    var img = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H);
    var rad = faceW * P.regionRadiusRatio;
    function region(i) { var p = pt(i); return sample(img, p.x, p.y, rad); }
    var forehead = region(LM.forehead), noseR = region(LM.nose);
    var cheekL = region(LM.cheekL), cheekR = region(LM.cheekR);
    img = null;

    var meanLs = [forehead.L, noseR.L, cheekL.L, cheekR.L];
    var skinL = (meanLs[0] + meanLs[1] + meanLs[2] + meanLs[3]) / 4;
    if (skinL < Q.brightnessMin) return { ok: false, reason: 'dark' };     // 검사 3: 밝기
    if (skinL > Q.brightnessMax) return { ok: false, reason: 'bright' };

    /* 지표 1. 볼 붉은기: 볼의 a* − 이마의 a* */
    var redness = (cheekL.a + cheekR.a) / 2 - forehead.a;
    /* 지표 2. T존 유광: 코·이마의 반사 픽셀 비율 − 볼의 반사 픽셀 비율 */
    var shine = shineRatio([forehead, noseR], skinL) - shineRatio([cheekL, cheekR], skinL);
    /* 지표 3. 톤 균일도: 4개 영역 밝기(L*)의 표준편차 (작을수록 고름) */
    var variance = meanLs.reduce(function (s, v) { return s + (v - skinL) * (v - skinL); }, 0) / 4;
    var toneSd = Math.sqrt(variance);

    var T = P.thresholds;
    return {
      ok: true,
      levels: {
        redness: level(redness, T.redness.low, T.redness.high),
        shine: level(shine, T.shine.low, T.shine.high),
        tone: toneSd < T.tone.even ? 'high' : toneSd >= T.tone.uneven ? 'low' : 'mid'
      },
      raw: {
        redness: round(redness, 2), shine: round(shine, 3), toneSd: round(toneSd, 2),
        skinL: round(skinL, 1), faceRatio: round(faceW / W, 2), yaw: round(yaw, 2)
      }
    };
  }

  window.SkinTestPhoto = {
    preload: preload,
    openCamera: openCamera,
    closeCamera: closeCamera,
    frameFromVideo: frameFromVideo,
    frameFromFile: frameFromFile,
    analyze: analyze
  };
})();
