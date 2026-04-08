// ============================================================
//  backup.js  —  النسخ الاحتياطي (تصدير/استيراد JSON)
// ============================================================

"use strict";

// ==================== تصدير ====================

function exportBackup() {
  const data = {
    version:      '1.1',
    exportDate:   today(),
    items:        ITEMS,
    invoices:     INVOICES,
    purchases:    PURCHASES,
    customers:    CUSTOMERS,
    moves:        MOVES,
    wallets:      WALLETS,
    transactions: TRANSACTIONS,
    returns:      RETURNS,
    counters:     CTR,
    taxSettings:  TAX_SETTINGS   // ✅ FIX: إضافة إعدادات الضريبة
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a    = document.createElement('a');
  a.href     = url;
  a.download = `pos-backup-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast('✅ تم تصدير النسخة الاحتياطية');
}

// ==================== استيراد ====================

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);

      // التحقق من صحة الملف
      if (!data.version || !data.items || !data.invoices) {
        toast('❌ ملف غير صحيح أو تالف', 'er');
        return;
      }

      const yes = await confirm2(
        `استيراد نسخة من ${data.exportDate}؟\n⚠️ سيتم استبدال جميع البيانات الحالية`
      );
      if (!yes) return;

      // ✅ استعادة البيانات مع قيم افتراضية آمنة
      ITEMS        = data.items        || [];
      INVOICES     = data.invoices     || [];
      PURCHASES    = data.purchases    || [];
      CUSTOMERS    = data.customers    || [];
      MOVES        = data.moves        || [];
      WALLETS      = data.wallets      || { cash:0, bank:0, credit:0, suppliers:0 };
      TRANSACTIONS = data.transactions || [];
      RETURNS      = data.returns      || [];
      CTR          = data.counters     || { inv:1, purch:1, item:1, cust:1, move:1, ret:1, tr:1 };

      // ✅ FIX: استعادة إعدادات الضريبة لو موجودة في الملف
      if (data.taxSettings) {
        TAX_SETTINGS = data.taxSettings;
        save(KEYS.taxSettings, TAX_SETTINGS);
      }

      // حفظ في localStorage
      save(KEYS.items,        ITEMS);
      save(KEYS.invoices,     INVOICES);
      save(KEYS.purchases,    PURCHASES);
      save(KEYS.customers,    CUSTOMERS);
      save(KEYS.moves,        MOVES);
      save(KEYS.wallets,      WALLETS);
      save(KEYS.transactions, TRANSACTIONS);
      save(KEYS.returns,      RETURNS);
      save(KEYS.counters,     CTR);

      // تحديث الشاشة كاملاً
      renderDash();
      renderItems();
      renderItemSelect();
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
      initSettingsPage();

      toast('✅ تم الاستيراد بنجاح');
    } catch {
      toast('❌ خطأ في قراءة الملف — تأكد إنه ملف backup صحيح', 'er');
    }

    // reset الـ input علشان يقدر يستورد نفس الملف تاني مرة
    event.target.value = '';
  };

  reader.readAsText(file);
}

