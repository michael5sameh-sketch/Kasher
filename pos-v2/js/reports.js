// ============================================================
//  reports.js  —  التقارير والإحصائيات
// ============================================================

"use strict";

function renderReports() {
  const from = document.getElementById('rep-from')?.value;
  const to   = document.getElementById('rep-to')?.value;
  const invs = INVOICES.filter(i => (!from || i.date >= from) && (!to || i.date <= to));

  const totalSales  = r2(invs.reduce((a, i) => a + i.total,    0));
  const totalProfit = r2(invs.reduce((a, i) => a + i.profit,   0));
  const totalDisc   = r2(invs.reduce((a, i) => a + i.discount, 0));
  const totalTax    = r2(invs.reduce((a, i) => a + i.tax,      0));
  const margin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : '0.0';

  // label الضريبة حسب الإعداد
  const taxLabel = TAX_SETTINGS.mode === 'none'    ? 'ضريبة'
                 : TAX_SETTINGS.mode === 'fixed'   ? `ضريبة ثابتة (${TAX_SETTINGS.value} ج)`
                 : `ضريبة ${TAX_SETTINGS.value}%`;

  const incEl = document.getElementById('report-income');
  if (incEl) {
    incEl.innerHTML = `
      <div class="irow"><span>إجمالي المبيعات</span><span>${fmt(totalSales)} ج</span></div>
      <div class="irow"><span>الخصومات</span><span>${fmt(totalDisc)} ج</span></div>
      <div class="irow"><span>${taxLabel} المحصلة</span><span>${fmt(totalTax)} ج</span></div>
      <div class="irow"><span style="color:var(--gr)">صافي الربح</span>
        <span style="color:var(--gr)">${fmt(totalProfit)} ج</span></div>
      <div class="irow"><span>هامش الربح</span><span>${margin}%</span></div>`;
  }

  // المبيعات الشهرية
  const monthly = Array(12).fill(0);
  invs.forEach(inv => { monthly[+inv.date.slice(5, 7) - 1] += inv.total; });
  const maxM   = Math.max(...monthly, 1);
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  const moEl = document.getElementById('r-monthly');
  if (moEl) {
    moEl.innerHTML = monthly
      .map((v, i) => v > 0
        ? `<div class="brow">
            <div class="blbl">${months[i]}</div>
            <div class="bwrap">
              <div class="bfill" style="width:${v/maxM*100}%">${fmt(v)}</div>
            </div>
          </div>`
        : ''
      ).join('') || '<div class="empty" style="padding:16px">لا توجد بيانات</div>';
  }

  // المرتجعات
  const rets   = RETURNS.filter(r => (!from || r.date >= from) && (!to || r.date <= to));
  const retVal = r2(rets.reduce((a, r) => a + r.value, 0));
  const retEl  = document.getElementById('r-ret');
  if (retEl) {
    retEl.innerHTML = `
      <div class="irow">
        <span>إجمالي المرتجعات</span>
        <span style="color:var(--rd)">${fmt(retVal)} ج</span>
      </div>
      <div class="irow"><span>عدد المرتجعات</span><span>${rets.length}</span></div>`;
  }
}
