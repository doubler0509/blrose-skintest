/*
 * PC 접속 시 QR 생성 (외부 서비스 없이 페이지 안에서 만든다)
 * QR 라이브러리(js/vendor/qrcode.js, MIT)는 PC 안내 화면이 뜰 때만 불러온다.
 */
(function () {
  'use strict';

  function loadLib() {
    return new Promise(function (resolve, reject) {
      if (window.qrcode) return resolve();
      var s = document.createElement('script');
      s.src = 'js/vendor/qrcode.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('qr lib load failed')); };
      document.head.appendChild(s);
    });
  }

  /* text 를 QR 로 만들어 box 요소 안에 SVG 로 그린다 */
  function render(box, text) {
    return loadLib().then(function () {
      var qr = window.qrcode(0, 'M');   // 0 = 내용 길이에 맞춰 크기 자동 선택
      qr.addData(text, 'Byte');
      qr.make();
      var n = qr.getModuleCount(), quiet = 2, size = n + quiet * 2, d = '';
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (qr.isDark(r, c)) d += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
        }
      }
      box.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size +
        '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#1B1B1F"/></svg>';
    });
  }

  window.SkinTestQR = { render: render };
})();
