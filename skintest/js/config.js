/*
 * 블로즈 피부 타입 테스트 — 설정 파일
 * 문항, 점수, 기준값, 타입 문구, 제품 번호, 사진 기준값은 모두 이 파일에서만 고친다.
 * (코드 app.js / photo.js 는 건드리지 않아도 된다)
 */
(function () {
  'use strict';

  var host = location.hostname;
  var isCafe24 = /(^|\.)blrose\.co\.kr$/i.test(host);

  window.SKINTEST_CONFIG = {
    version: '0.1.0-draft',

    /* 실행 환경: blrose.co.kr 이면 'cafe24', 그 외(깃허브 페이지·로컬)는 'prototype' */
    env: isCafe24 ? 'cafe24' : 'prototype',

    brand: {
      name: '블로즈',
      wordmark: 'Blrose',
      shopUrl: 'https://blrose.co.kr/'
    },

    /* 주소. prototype 은 상대 경로, cafe24 는 자사몰 경로를 쓴다. */
    paths: isCafe24
      ? {
          test: '/skintest/',
          join: '/member/join.html',
          login: '/member/login.html?returnUrl=' + encodeURIComponent('/skintest/?unlock=1'),
          product: '/product/detail.html?product_no='
        }
      : {
          test: './',
          join: '../member/join_result.html',      // 시제품: 가입 완료 화면을 흉내 낸 페이지
          login: './?unlock=1&login=1',             // 시제품: ?login=1 로 로그인 상태 흉내
          product: 'https://blrose.co.kr/product/detail.html?product_no='
        },

    /* 저장 키 */
    storage: {
      resultKey: 'blrose_skintest',
      utmKey: 'blrose_skintest_utm',
      cookieDomain: isCafe24 ? '.blrose.co.kr' : '',
      cookieDays: 7
    },

    /* 메타 픽셀. id 가 비어 있으면 이벤트를 콘솔에만 기록한다. */
    pixel: {
      id: '',                                // TODO 대표 전달: 메타 픽셀 ID
      sendCompleteRegistration: false        // 카페24 메타 연동이 이미 보내면 false 유지 (중복 방지)
    },

    /* 쿠폰 안내 문구 (기존 신규가입 쿠폰) */
    coupon: {
      amount: '10,000원',
      condition: '19,800원 이상 구매 시',
      period: '발급일로부터 14일',
      banner: '10,000원 쿠폰이 발급됐어요 · 14일 안에 사용해 주세요'
    },

    /* 화면 전환 시간(ms) */
    timing: { autoNext: 300, analyzing: 1800 },

    /* ───────── 판정 규칙 ───────── */
    rules: {
      sensitiveMin: 5,                 // S 점수가 이 값 이상이면 민감성
      tagMin: 3, tagMax: 4,            // 민감성이 아니고 S 가 이 범위면 "민감 경향" 태그
      tieOrder: ['W', 'M', 'D', 'O'],  // 동점일 때 우선순위: 수분부족형 → 복합성 → 건성 → 지성
      axisType: { D: 'dry', O: 'oily', M: 'combo', W: 'dehydrated', S: 'sensitive' }
    },

    /* ───────── 문진 10문항 ─────────
     * score 축: D(건조) O(유분) M(복합) S(민감) W(수분부족)
     */
    questions: [
      { id: 'Q1', text: '세안 후 아무것도 안 바르고 30분이 지나면?', options: [
        { label: '얼굴 전체가 당겨요', score: { D: 3 } },
        { label: '볼만 당기고 T존은 괜찮아요', score: { M: 2, D: 1 } },
        { label: '별 느낌 없어요', score: {} },
        { label: '얼굴 전체가 번들거려요', score: { O: 3 } }
      ] },
      { id: 'Q2', text: '오후가 되면 얼굴 유분은?', options: [
        { label: '거의 없어요', score: { D: 2 } },
        { label: 'T존만 번들거려요', score: { M: 3 } },
        { label: '얼굴 전체가 번들거려요', score: { O: 3 } },
        { label: '겉은 번들한데 속은 당겨요', score: { W: 3, O: 1 } }
      ] },
      { id: 'Q3', text: '모공은 어느 정도 보여요?', options: [
        { label: '거의 안 보여요', score: { D: 1 } },
        { label: '코 주변만 보여요', score: { M: 2 } },
        { label: '볼까지 넓게 보여요', score: { O: 2 } }
      ] },
      { id: 'Q4', text: '각질은 어때요?', options: [
        { label: '자주 일어나요', score: { D: 2, W: 1 } },
        { label: '가끔 입가나 볼에만', score: { W: 1, M: 1 } },
        { label: '거의 없어요', score: { O: 1 } }
      ] },
      { id: 'Q5', text: '새 화장품을 바르면 따끔거리거나 붉어지나요?', options: [
        { label: '자주 그래요', score: { S: 3 } },
        { label: '가끔 그래요', score: { S: 1 } },
        { label: '거의 없어요', score: {} }
      ] },
      { id: 'Q6', text: '찬바람이나 더운 곳에서 얼굴이 쉽게 붉어지나요?', options: [
        { label: '자주 그래요', score: { S: 3 } },
        { label: '가끔 그래요', score: { S: 1 } },
        { label: '거의 없어요', score: {} }
      ] },
      { id: 'Q7', text: '트러블은 얼마나 자주 올라오나요?', options: [
        { label: '자주 올라와요', score: { O: 2 } },
        { label: '피곤하거나 컨디션이 나쁠 때만', score: { O: 1, S: 1 } },
        { label: '거의 없어요', score: {} }
      ] },
      { id: 'Q8', text: '보습제를 바르고 몇 시간 지나면 다시 건조한가요?', options: [
        { label: '그래요', score: { W: 3 } },
        { label: '가끔 그래요', score: { W: 1 } },
        { label: '아니에요', score: {} }
      ] },
      { id: 'Q9', text: '화장이 어떻게 무너지나요?', options: [
        { label: '각질이 들떠요', score: { D: 2, W: 1 } },
        { label: 'T존만 무너져요', score: { M: 2 } },
        { label: '전체가 무너져요', score: { O: 2 } },
        { label: '화장을 안 하거나 괜찮아요', score: {} }
      ] },
      /* Q10 답은 상세 리포트의 "집중 케어 포인트" 문구(focus)에도 쓴다 */
      { id: 'Q10', text: '지금 가장 신경 쓰이는 건?', options: [
        { label: '건조함과 당김', score: { D: 1 }, focus: 'dry' },
        { label: '번들거림과 모공', score: { O: 1 }, focus: 'oil' },
        { label: '붉은기와 예민함', score: { S: 1 }, focus: 'sens' },
        { label: '윤기와 탄력 부족', score: { W: 1 }, focus: 'glow' }
      ] }
    ],

    /* 집중 케어 포인트 (Q10 답 기준) */
    focus: {
      dry:  { title: '건조함과 당김', text: '세안 후 물기가 마르기 전에 보습을 시작하고, 당기는 부위는 한 번 더 덧발라 보세요.' },
      oil:  { title: '번들거림과 모공', text: '유분이 많은 부위는 제품을 소량만 얇게 발라 보세요.' },
      sens: { title: '붉은기와 예민함', text: '사용 단계를 줄이고, 새 제품은 팔 안쪽에 먼저 발라 본 뒤 얼굴에 사용해 보세요.' },
      glow: { title: '윤기와 탄력 부족', text: '보습 제품을 한 번에 많이 바르기보다 두 번에 나눠 얇게 발라 보세요.' }
    },

    /* ───────── 제품 ─────────
     * productNo: 카페24 상품 번호. 대표 전달 전에는 null (자사몰 메인으로 연결)
     * img: 공식 제품 이미지로 교체 (현재는 자리 표시 그림)
     * set.items: 세트 구성. 이 제품을 모두 추천하는 타입에만 세트 카드가 보인다
     */
    products: {
      cream:   { name: '리페어 크림', sub: '로즈 엑소좀', productNo: null, img: 'img/product-cream.svg' },
      ampoule: { name: '하이드라 리페어 앰플', sub: '', productNo: null, img: 'img/product-ampoule.svg' },
      mask:    { name: '엑소셀 마스크팩', sub: '', productNo: null, img: 'img/product-mask.svg' },
      set:     { name: '블로즈 올인원 세트', sub: '크림 · 앰플 · 마스크팩 3종 구성', productNo: null, img: 'img/product-set.svg', items: ['cream', 'ampoule', 'mask'] }
    },

    /* ───────── 피부 타입 5종 ─────────
     * order: 추천 제품과 표시 순서
     * highlight: "강력추천"으로 표시할 제품 (없으면 생략)
     * commonReason: 추천 제품 전체에 해당하는 이유. 제품 목록 위에 표시 (없으면 생략)
     * reasons: 타입별 추천 이유 1줄 — 제품 자료 기준 초안. 오픈 전 상품 상세페이지 문구와 대조한다.
     */
    types: {
      dry: {
        name: '건성',
        oneLine: '유분과 수분이 모두 부족해 쉽게 당기는 타입',
        features: ['세안 후 당김', '각질', '화장 들뜸'],
        report: [
          '유분과 수분이 모두 부족해 세안 직후부터 당김을 느끼기 쉬운 타입이에요.',
          '세안은 미지근한 물로 짧게 하고, 물기가 마르기 전에 보습 단계를 시작해 보세요.',
          '앰플을 당기는 부위까지 꼼꼼히 바르고, 유난히 건조한 날은 마스크팩으로 보습을 더해 보세요.'
        ],
        routine: [
          { label: '아침', text: '앰플' },
          { label: '저녁', text: '앰플 2번 덧바르기' },
          { label: '스페셜', text: '주 2~3회 마스크팩' }
        ],
        order: ['ampoule', 'mask'],
        highlight: 'ampoule',
        reasons: {
          ampoule: '저분자 히알루론산 20,000ppm으로 당기는 피부의 보습에 도움을 줄 수 있어요',
          mask: '13중 히알루론산과 28mL 에센스로 유난히 건조한 날 집중 보습해요'
        }
      },
      oily: {
        name: '지성',
        oneLine: '유분이 많아 번들거리기 쉬운 타입',
        features: ['오후 번들거림', '눈에 띄는 모공', '화장 무너짐'],
        report: [
          '유분이 많아 오후가 되면 얼굴 전체가 번들거리기 쉬운 타입이에요.',
          '번들거린다고 보습을 건너뛰기보다, 산뜻한 크림 하나로 간단히 마무리해 주세요.',
          '아침에는 T존을 피해 얇게, 저녁에는 얼굴 전체에 소량만 펴 발라 보세요.'
        ],
        routine: [
          { label: '아침', text: '크림 소량, T존은 얇게' },
          { label: '저녁', text: '크림 소량' }
        ],
        order: ['cream'],
        highlight: 'cream',
        reasons: {
          cream: '편안한 수분형 사용감으로 엑소좀 케어가 가능해요'
        }
      },
      combo: {
        name: '복합성',
        oneLine: 'T존은 번들, 볼은 건조한 타입',
        features: ['T존 번들거림', '볼 당김', '코 주변 모공'],
        report: [
          'T존은 번들거리고 볼은 건조해, 부위마다 느낌이 다른 타입이에요.',
          '얼굴 전체에 같은 양을 바르기보다 부위별로 양을 조절해 보세요.',
          '앰플은 얼굴 전체에, 크림은 건조한 볼 위주로 바르는 것이 포인트예요.'
        ],
        routine: [
          { label: '아침·저녁', text: '얼굴 전체 앰플' },
          { label: '크림', text: '볼 위주로' },
          { label: '스페셜', text: '주 2~3회 마스크팩' }
        ],
        order: ['ampoule', 'cream', 'mask'],
        reasons: {
          ampoule: '저분자 히알루론산 20,000ppm으로 수분 공급을 우선으로 해요',
          cream: 'EGF 및 시카와 로즈 엑소좀을 담아 예민해진 피부에 진정감을 선사해요',
          mask: '엑소좀 케어와 세라마이드, 저분자 콜라겐을 통한 장벽 케어를 도와줘요'
        }
      },
      sensitive: {
        name: '민감성',
        oneLine: '외부 환경에 쉽게 붉어지는 타입',
        features: ['따끔거림', '붉은기', '온도 변화에 예민'],
        report: [
          '새 제품이나 온도 변화에 피부가 쉽게 붉어지고 예민해지는 타입이에요.',
          '제품은 한 번에 늘리지 말고 앰플, 크림, 마스크팩 순서로 하나씩 더해 보세요.',
          '새 제품은 팔 안쪽에 먼저 발라 본 뒤 얼굴에 사용하는 것을 권해요.'
        ],
        routine: [
          { label: '아침·저녁', text: '앰플 → 크림' },
          { label: '새 제품', text: '팔 안쪽에 먼저 발라 보기' },
          { label: '스페셜', text: '주 1~2회 마스크팩' }
        ],
        order: ['ampoule', 'cream', 'mask'],
        commonReason: '향료·파라벤·페녹시에탄올 없이 만들어 순한 스킨케어를 도와줘요',
        reasons: {
          ampoule: '저분자 히알루론산 20,000ppm으로 수분 공급을 우선으로 해요',
          cream: 'EGF 및 시카와 로즈 엑소좀을 담아 예민해진 피부에 진정감을 선사해요',
          mask: '엑소좀 케어와 세라마이드, 저분자 콜라겐을 통한 장벽 케어를 도와줘요'
        }
      },
      dehydrated: {
        name: '수분부족형',
        oneLine: '겉은 번들하지만 속은 건조한 타입',
        features: ['속당김', '보습해도 금방 건조', '윤기 부족'],
        report: [
          '겉은 번들거리는데 속은 당기는, 유분보다 수분이 부족한 타입이에요.',
          '유분을 더하기보다 수분을 여러 번 채워 주는 것이 좋아요.',
          '앰플을 두 번 레이어링하고, 마스크팩으로 수분 관리를 더해 보세요.'
        ],
        routine: [
          { label: '아침·저녁', text: '앰플 2번 레이어링' },
          { label: '스페셜', text: '주 3회 마스크팩' }
        ],
        order: ['ampoule', 'mask'],
        reasons: {
          ampoule: '저분자 히알루론산을 두 번 레이어링해 속건조 보습에 도움을 줄 수 있어요',
          mask: '13중 히알루론산을 담은 28mL 에센스로 부족한 수분을 집중 관리해요'
        }
      }
    },

    /* ───────── 문구 ───────── */
    copy: {
      disclaimer: '이 테스트는 의학적 진단이 아닌 스킨케어 참고용이에요. 피부에 이상이 있다면 전문가와 상담해 주세요.',
      photoPrivacy: '사진은 폰 안에서만 분석되고 저장되지 않아요.',
      photoCaveat: '조명과 폰 카메라에 따라 달라질 수 있는 참고 정보예요',
      photoSkip: '사진 없이도 결과를 볼 수 있어요',
      sensitiveTag: '민감 경향',
      pcGuide: '피부 타입 테스트는 모바일에서 진행해 주세요. 폰 카메라로 QR을 찍으면 바로 시작돼요.'
    },

    /* ───────── 사진 간이 분석 ─────────
     * 기준값은 모두 임시값. 오픈 전 조명이 다른 사진 10장 이상으로 맞춘다.
     * (?dev=1 로 열면 결과 화면에 실제 측정값이 표시된다)
     */
    photo: {
      cdn: {
        module: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
        wasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
        model: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
      },
      delegate: 'CPU',          // 'GPU' 로 바꾸면 빠르지만 일부 앱 내 브라우저에서 불안정
      captureWidth: 720,
      /* 얼굴 점 번호 (MediaPipe Face Landmarker 478점) — 실제 폰 테스트로 확정 */
      landmarks: {
        forehead: 151, nose: 5, cheekL: 205, cheekR: 425,
        faceLeft: 234, faceRight: 454, noseTip: 1, eyeL: 33, eyeR: 263
      },
      regionRadiusRatio: 0.06,  // 측정 원 반지름 = 얼굴 폭의 6%
      quality: {
        minFaceWidthRatio: 0.40,      // 화면 카메라: 얼굴 폭이 화면 폭의 40% 이상
        minFaceWidthRatioFile: 0.25,  // 폰 기본 카메라(대체 촬영): 사진 폭 기준
        brightnessMin: 35, brightnessMax: 90,   // 피부 영역 평균 밝기 L* 허용 범위
        yawMin: 0.35, yawMax: 0.65,   // 코 위치 비율 (0.5 = 정면)
        maxRollDeg: 20
      },
      thresholds: {
        redness: { low: 1.5, high: 5 },                        // 볼 a* − 이마 a*
        shine: { low: 0.02, high: 0.10, deltaL: 14, maxChroma: 18 }, // T존 반사 픽셀 비율 − 볼 비율
        tone: { even: 3, uneven: 7 }                           // 4개 영역 L* 표준편차
      },
      qualityMessages: {
        face: '얼굴이 화면 가운데 오도록 맞춰 주세요',
        size: '조금 더 가까이 찍어 주세요',
        dark: '더 밝은 곳에서 찍어 주세요',
        bright: '빛이 너무 강해요. 조명을 살짝 피해서 찍어 주세요',
        angle: '정면을 바라봐 주세요'
      },
      /* 지표 표기 */
      labels: {
        redness: { title: '볼 부위 붉은기', low: '낮음', mid: '보통', high: '다소 높음' },
        shine:   { title: 'T존 윤기(유광)', low: '낮음', mid: '보통', high: '다소 높음' },
        tone:    { title: '피부 톤', low: '부위별 차이가 있는 편', mid: '보통', high: '고른 편' }
      },
      /* 상세 리포트에 추가되는 한 줄 (지표는 타입 판정에 쓰지 않는다) */
      reportLines: {
        rednessHigh: '볼 부위는 자극을 줄여 주세요.',        // 민감성이 아닌데 볼 붉은기가 높을 때
        shineHigh: 'T존은 제품을 얇고 가볍게 발라 주세요.',  // 지성이 아닌데 T존 유광이 높을 때
        toneLow: '부위별 밝기 차이가 보여요. 얼굴 전체에 보습을 고르게 해 주세요.'
      }
    }
  };
})();
