// ============================================================
//  returns.js  —  المرتجعات
// ============================================================

"use strict";

function renderRetItemSelect() {
  const sel = document.getElementById('ret-item');
  if (sel) sel.innerHTML = '<option value="">— اختر —</option>' +
    ITEMS.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
}

async function addReturn() {
  const invId   = document.getElementById('ret-inv').value.trim();
  const itemId  = document.getElementById('ret-item').value;
  const qty     = +document.getElementById('ret-qty').value || 1;
  const reason  = document.getElementById('ret-reason').value.trim() || '—';
  const payment = document.getElementById('ret-payment').value;

  if (!invId || !itemId) { toast('أدخل الفاتورة والصنف', 'er'); return; }

  const it  = ITEMS.find(x => x.id === itemId);
  if (!it) return;
  const inv = INVOICES.find(x => x.id === invId);
  if (!inv) { toast('الفاتورة غير موجودة', 'er'); return; }

  const line = inv.lines.find(l => l.id === itemId);
  if (!line || qty > line.qty) { toast('الكمية المرتجعة أكبر من المباعة', 'er'); return; }

  // ✅ FIX: استخدم السعر من الفاتورة الأصلية مش السعر الحالي للصنف
  const value = r2(qty * line.price);
  it.stock += qty;

  addTransaction('out', payment, value,
    `مرتجع فاتورة ${invId}${payment === 'credit' ? ' (خصم دين)' : ''}`, invId, today());

  RETURNS.push({
    id:      'RET-' + pad(CTR.ret++, 3),
    invId, itemId,
    itemName: it.name,
    qty, reason, value,
    date:    today(),
    paymentMethod: payment
  });

  save(KEYS.returns,  RETURNS);
  save(KEYS.items,    ITEMS);
  save(KEYS.counters, CTR);

  document.getElementById('ret-inv').value    = '';
  document.getElementById('ret-qty').value    = '1';
  document.getElementById('ret-reason').value = '';

  renderRetList();
  renderItems();
  renderDash();
  renderWallets();
  toast('✅ تم تسجيل المرتجع');
}

function renderRetList() {
  const el     = document.getElementById('ret-list');
  if (!el) return;
  const sorted = [...RETURNS].reverse();

  if (!sorted.length) { el.innerHTML = '<div class="empty">لا توجد مرتجعات</div>'; return; }

  el.innerHTML = sorted.map(r => `
    <div class="card">
      <div class="row-b">
        <div>
          <div style="font-weight:700">${r.itemName} (×${r.qty})</div>
          <div style="font-size:11px;color:var(--t2)">فاتورة: ${r.invId} · ${r.date}</div>
          <div style="font-size:12px">السبب: ${r.reason}</div>
          <div style="font-size:12px">رد: ${
            r.paymentMethod === 'cash'   ? '💵 نقدي' :
            r.paymentMethod === 'bank'   ? '🏦 بنك'  : '📝 آجل'
          }</div>
        </div>
        <div style="color:var(--rd);font-weight:800">${fmt(r.value)} ج</div>
      </div>
    </div>`).join('');
}
