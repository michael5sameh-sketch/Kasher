// ============================================================
//  utils.js  —  الأدوات المساعدة
//  يتحمل بعد storage.js وقبل أي ملف تاني
// ============================================================

"use strict";

// ==================== تنسيق الأرقام والتواريخ ====================

/** تقريب لأقرب قرشين */
function r2(n) {
  return Math.round(n * 100) / 100;
}

/** إضافة أصفار يسار — مثلاً pad(5,3) → "005" */
function pad(n, len) {
  return String(n).padStart(len, '0');
}

/** تاريخ اليوم بصيغة YYYY-MM-DD */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/** تنسيق رقم بالعربي مع فواصل */
function fmt(n) {
  return Number(n).toLocaleString('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/** اسم الخزينة بالعربي */
function walletName(w) {
  return { cash:'نقدي', bank:'بنك', credit:'آجل عملاء', suppliers:'موردين' }[w] || w;
}

// ==================== Toast (رسايل سريعة) ====================

let _toastTimer = null;

/**
 * يعرض رسالة Toast صغيرة أسفل الشاشة
 * @param {string} msg   - نص الرسالة
 * @param {string} type  - 'ok' (اخضر) | 'er' (أحمر)
 */
function toast(msg, type = 'ok') {
  // شيل أي toast موجود
  const old = document.getElementById('_toast');
  if (old) old.remove();
  if (_toastTimer) clearTimeout(_toastTimer);

  const el = document.createElement('div');
  el.id        = '_toast';
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);

  _toastTimer = setTimeout(() => el.remove(), 2600);
}

// ==================== Confirm مخصص ====================

/**
 * نافذة تأكيد بدل confirm() الافتراضي
 * @param {string} msg - نص السؤال
 * @returns {Promise<boolean>}
 */
function confirm2(msg) {
  // ✅ FIX: منع فتح أكتر من confirm في نفس الوقت
  if (document.querySelector('.confirm-bg')) return Promise.resolve(false);

  return new Promise(resolve => {
    const bg = document.createElement('div');
    bg.className = 'confirm-bg';
    bg.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-msg">${msg}</div>
        <div class="confirm-btns">
          <button class="btn btn-d" id="_cNo">❌ لا</button>
          <button class="btn btn-p" id="_cYes">✅ نعم</button>
        </div>
      </div>`;
    document.body.appendChild(bg);

    const cleanup = (result) => {
      bg.remove();
      resolve(result);
    };

    document.getElementById('_cYes').onclick = () => cleanup(true);
    document.getElementById('_cNo').onclick  = () => cleanup(false);
  });
}

// ==================== Modal Helpers ====================

function openModal(id) {
  // لو فاتورة شراء، حضّر السطور
  if (id === 'm-purchase') renderPurchaseLines();
  document.getElementById(id).style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal(id, e) {
  // لو ضغط على الـ background بس (مش المودال نفسه)
  if (e && !e.target.classList.contains('modal-bg')) return;
  document.getElementById(id).style.display = 'none';
  document.body.style.overflow = '';
}

// ==================== Tab Switcher ====================

/**
 * بدّل بين التابات
 * @param {string} tabSel   - selector للتابات
 * @param {string} paneSel  - selector للـ panels
 * @param {Element} activeBtn
 * @param {string} activeId
 */
function tabSwitch(tabSel, paneSel, activeBtn, activeId) {
  document.querySelectorAll(tabSel).forEach(t => t.classList.remove('on'));
  document.querySelectorAll(paneSel).forEach(p => p.style.display = 'none');
  activeBtn.classList.add('on');
  document.getElementById(activeId).style.display = 'block';
}

// shortcuts للتابات في كل صفحة
function sTab(btn, id) { tabSwitch('.pg.on .tab', '.pg.on #stab-new,.pg.on #stab-list',                btn, id); }
function iTab(btn, id) {
  tabSwitch('#pg-inv .tab', '#itab-items,#itab-purchases,#itab-moves', btn, id);
  if (id === 'itab-purchases') renderPurchasesList();
}
function cTab(btn, id) { tabSwitch('#pg-cust .tab', '#ctab-list,#ctab-add',                           btn, id); }
function tTab(btn, id) {
  tabSwitch('#pg-treas .tab', '#ttab-summary,#ttab-add,#ttab-history',                                btn, id);
  if (id === 'ttab-history') renderTransactionsList();
}
function rTab(btn, id) { tabSwitch('#pg-ret .tab', '#rtab-list,#rtab-add',                            btn, id); }
