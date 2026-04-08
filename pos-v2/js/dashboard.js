// ============================================================
//  dashboard.js  —  لوحة التحكم والخزائن
// ============================================================

"use strict";

// ==================== الخزائن ====================

function renderWallets() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = fmt(val) + ' ج';
  };
  set('wallet-cash',       WALLETS.cash);
  set('wallet-bank',       WALLETS.bank);
  set('wallet-credit',     WALLETS.credit);
  set('wallet-suppliers',  WALLETS.suppliers);
  set('wallet-cash2',      WALLETS.cash);
  set('wallet-bank2',      WALLETS.bank);
  set('wallet-credit2',    WALLETS.credit);
  set('wallet-suppliers2', WALLETS.suppliers);
}

// ==================== لوحة التحكم ====================

function renderDash() {
  const td = today();
  const mo = td.slice(0, 7);

  const tInvs = INVOICES.filter(i => i.date === td);
  const mInvs = INVOICES.filter(i => i.date.startsWith(mo));

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('kpi-td', fmt(tInvs.reduce((a, i) => a + i.total,  0)));
  set('kpi-mo', fmt(mInvs.reduce((a, i) => a + i.total,  0)));
  set('kpi-pr', fmt(INVOICES.reduce((a, i) => a + i.profit, 0)));
  set('kpi-ic', tInvs.length);

  // أفضل الأصناف
  const top = {};
  INVOICES.forEach(inv => {
    inv.lines.forEach(l => {
      if (!top[l.name]) top[l.name] = 0;
      top[l.name] += l.qty * l.price;
    });
  });
  const top5 = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topEl = document.getElementById('d-top');
  if (topEl) {
    topEl.innerHTML = top5.map(([n, v], i) =>
      `<div class="irow">${i + 1}. ${n}<span style="color:var(--ac)">${fmt(v)} ج</span></div>`
    ).join('') || '<div class="empty" style="padding:12px">لا توجد مبيعات</div>';
  }

  // تحذيرات المخزون
  const ws    = ITEMS.filter(i => i.stock <= i.reorder);
  const warnEl = document.getElementById('d-warn');
  if (warnEl) {
    warnEl.innerHTML = ws.map(i =>
      `<div class="irow">⚠️ ${i.name}<span class="bdg br">${i.stock}</span></div>`
    ).join('') || '<div style="color:var(--gr)">✅ المخزون جيد</div>';
  }

  // آخر الفواتير
  const last   = [...INVOICES].reverse().slice(0, 3);
  const lastEl = document.getElementById('d-last');
  if (lastEl) {
    lastEl.innerHTML = last.map(inv =>
      `<div class="irow" style="margin-bottom:10px">
        <div>
          <div style="font-weight:700">${inv.id}</div>
          <div style="font-size:11px;color:var(--t2)">${inv.customer} · ${inv.date}</div>
        </div>
        <div style="color:var(--ac);font-weight:800">${fmt(inv.total)} ج</div>
      </div>`
    ).join('') || '<div class="empty" style="padding:12px">لا توجد فواتير</div>';
  }

  renderWallets();
}
