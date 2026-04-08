// ============================================================
//  init.js  —  تهيئة التطبيق والتنقل بين الصفحات
//  آخر ملف يتحمل في index.html
// ============================================================

"use strict";

// ==================== تهيئة التطبيق ====================

function initApp() {
  // التاريخ في الـ Topbar
  const now    = new Date();
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const days   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

  const dateEl = document.getElementById('pgDate');
  if (dateEl) {
    dateEl.textContent =
      `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  // القيم الافتراضية لحقول التاريخ
  const repFrom = document.getElementById('rep-from');
  const repTo   = document.getElementById('rep-to');
  const trDate  = document.getElementById('tr-date');
  if (repFrom) repFrom.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  if (repTo)   repTo.value   = today();
  if (trDate)  trDate.value  = today();

  // عرض/إخفاء طريقة الدفع في إضافة الصنف
  const miStock = document.getElementById('mi-stock');
  if (miStock) {
    miStock.addEventListener('input', function () {
      const wrap = document.getElementById('mi-payment-wrap');
      if (wrap) wrap.style.display = +this.value > 0 ? 'block' : 'none';
    });
  }

  // تهيئة صفحة الإعدادات
  initSettingsPage();

  // رسم كل الصفحات
  renderDash();
  renderItemSelect();
  renderItems();
  renderMoves();
  renderInvList();
  renderInvDatalist();
  renderCusts();
  renderCustDatalist();
  renderReports();
  renderWallets();
  renderPurchasesList();
  renderRetItemSelect();
  renderRetList();
  renderTransactionsList();
}

// ==================== إعدادات الضريبة ====================

function initSettingsPage() {
  // اعبّي الفورم بالقيم الحالية
  const modeEl  = document.getElementById('tax-mode');
  const valEl   = document.getElementById('tax-value');
  if (modeEl) modeEl.value = TAX_SETTINGS.mode;
  if (valEl)  valEl.value  = TAX_SETTINGS.value;
  onTaxModeChange();

  // Device ID في صفحة الإعدادات
  const didEl = document.getElementById('settings-device-id');
  if (didEl) didEl.textContent = load('pos_device_id', '—');
}

function onTaxModeChange() {
  const mode  = document.getElementById('tax-mode')?.value;
  const wrap  = document.getElementById('tax-value-wrap');
  const label = document.getElementById('tax-value-label');
  if (!wrap || !label) return;

  if (mode === 'none') {
    wrap.style.display = 'none';
  } else {
    wrap.style.display = 'block';
    label.textContent  = mode === 'percent' ? 'النسبة (%)' : 'المبلغ الثابت (ج)';
  }
}

function saveTaxSettings() {
  const mode  = document.getElementById('tax-mode').value;
  const value = +document.getElementById('tax-value').value || 0;

  if (mode !== 'none' && value <= 0) {
    toast('أدخل قيمة صحيحة للضريبة', 'er');
    return;
  }

  TAX_SETTINGS = { mode, value };
  save(KEYS.taxSettings, TAX_SETTINGS);
  toast('✅ تم حفظ إعدادات الضريبة');
}

// ==================== التنقل بين الصفحات ====================

function goPage(btn, title) {
  // أخفِ كل الصفحات وشيل التمييز من كل الأزرار
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('on'));

  // فعّل الصفحة المطلوبة
  const pg = document.getElementById('pg-' + btn.dataset.pg);
  if (pg) pg.classList.add('on');
  btn.classList.add('on');

  // حدّث عنوان الـ Topbar
  const titleEl = document.getElementById('pgTitle');
  if (titleEl) titleEl.textContent = title;

  // ارجع للأعلى
  const scroller = document.getElementById('scroller');
  if (scroller) scroller.scrollTop = 0;

  // رسم الصفحة لو محتاج تحديث
  const pg_name = btn.dataset.pg;
  if (pg_name === 'rep')      renderReports();
  if (pg_name === 'treas')   renderWallets();
  if (pg_name === 'dash')    renderDash();
  if (pg_name === 'settings') initSettingsPage();
}
