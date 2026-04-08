// ============================================================
//  barcode.js  —  كاميرا الباركود (ZXing)
//  مكتبة ZXing بتتحمل من CDN أول ما تُستخدم
// ============================================================

"use strict";

let _barcodeReader  = null;  // ZXing reader instance
let _barcodeStream  = null;  // camera stream
let _barcodeContext = null;  // السياق: 'sales' | 'inventory' | 'additem'

// ==================== تحميل مكتبة ZXing ====================

function _loadZXing() {
  return new Promise((resolve, reject) => {
    if (window.ZXing) { resolve(); return; }

    // ✅ FIX: URL الصحيح لمكتبة ZXing على cdnjs
    const script   = document.createElement('script');
    script.src     = 'https://unpkg.com/@zxing/library@0.18.6/umd/index.min.js';
    script.onload  = () => {
      // بعض الإصدارات بتعرّف نفسها كـ ZXingLibrary مش ZXing
      if (!window.ZXing && window.ZXingLibrary) window.ZXing = window.ZXingLibrary;
      resolve();
    };
    script.onerror = () => reject(new Error('فشل تحميل مكتبة الباركود — تحقق من الإنترنت'));
    document.head.appendChild(script);
  });
}

// ==================== إنشاء مودال الكاميرا ====================

function _ensureBarcodeModal() {
  if (document.getElementById('barcode-modal')) return;

  const div = document.createElement('div');
  div.id    = 'barcode-modal';
  div.innerHTML = `
    <div id="barcode-video-wrap">
      <video id="barcode-video" autoplay playsinline muted></video>
      <div class="barcode-line"></div>
    </div>
    <div id="barcode-hint">وجّه الكاميرا نحو الباركود</div>
    <button class="btn btn-d barcode-cancel" onclick="closeBarcodeScanner()">
      ✕ إلغاء
    </button>`;
  document.body.appendChild(div);
}

// ==================== فتح الكاميرا ====================

async function openBarcodeScanner(context) {
  _barcodeContext = context;
  _ensureBarcodeModal();

  const modal = document.getElementById('barcode-modal');
  modal.classList.add('open');

  try {
    toast('📷 جاري تحميل الكاميرا...');
    await _loadZXing();

    // طلب الكاميرا الخلفية
    _barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    const video = document.getElementById('barcode-video');
    video.srcObject = _barcodeStream;

    // ZXing reader
    _barcodeReader = new ZXing.BrowserMultiFormatReader();

    _barcodeReader.decodeFromStream(_barcodeStream, video, (result, err) => {
      if (result) {
        const barcode = result.getText();
        closeBarcodeScanner();
        handleBarcodeResult(barcode, _barcodeContext);
      }
      // err عادي يجي مع كل frame مش فيها باركود — بنتجاهله
    });

  } catch (e) {
    closeBarcodeScanner();
    if (e.name === 'NotAllowedError') {
      toast('❌ اسمح للمتصفح باستخدام الكاميرا', 'er');
    } else {
      toast('❌ الكاميرا غير متاحة', 'er');
    }
  }
}

// ==================== إغلاق الكاميرا ====================

function closeBarcodeScanner() {
  // وقّف الـ stream
  if (_barcodeStream) {
    _barcodeStream.getTracks().forEach(t => t.stop());
    _barcodeStream = null;
  }

  // وقّف الـ reader
  if (_barcodeReader) {
    try { _barcodeReader.reset(); } catch {}
    _barcodeReader = null;
  }

  const modal = document.getElementById('barcode-modal');
  if (modal) modal.classList.remove('open');
}
