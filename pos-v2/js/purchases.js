// ============================================================
//  purchases.js  —  فواتير الشراء (التوريد)
// ============================================================

"use strict";

let _purchaseLines = [];

// ==================== رسم سطور الشراء في المودال ====================

function renderPurchaseLines() {
  _purchaseLines = [{ itemId: '', qty: 1, cost: 0 }];
  _drawPurchaseLines();
}

function _drawPurchaseLines() {
  const el = document.getElementById('purchase-lines');
  if (!el) return;

  el.innerHTML = _purchaseLines.map((ln, idx) => `
    <div class="pline">
      ${idx > 0 ? `<button class="del-pline" onclick="removePurchaseLine(${idx})">🗑️</button>` : ''}
      <select onchange="setPurchaseItem(${idx},this.value)">
        <option value="">— اختر صنف —</option>
        ${ITEMS.map(i => `<option value="${i.id}" ${i.id===ln.itemId?'selected':''}>${i.name}</option>`).join('')}
      </select>
      <div class="pline-row">
        <input type="number" placeholder="الكمية" value="${ln.qty}" min="1"
          oninput="setPurchaseQty(${idx},this.value)">
        <input type="number" placeholder="سعر الشراء (ج)" value="${ln.cost||''}" min="0" step="0.01"
          oninput="setPurchaseCost(${idx},this.value)">
      </div>
    </div>`).join('');

  _calcPurchaseTotal();
}

function addPurchaseLine() {
  _purchaseLines.push({ itemId: '', qty: 1, cost: 0 });
  _drawPurchaseLines();
}

function removePurchaseLine(idx) {
  _purchaseLines.splice(idx, 1);
  _drawPurchaseLines();
}

function setPurchaseItem(idx, id) {
  _purchaseLines[idx].itemId = id;
  const item = ITEMS.find(i => i.id === id);
  if (item) _purchaseLines[idx].cost = item.avg_cost || 0;
  _drawPurchaseLines();
}

function setPurchaseQty(idx, v)  { _purchaseLines[idx].qty  = +v || 1; _calcPurchaseTotal(); }
function setPurchaseCost(idx, v) { _purchaseLines[idx].cost = +v || 0; _calcPurchaseTotal(); }

function _calcPurchaseTotal() {
  const total = r2(_purchaseLines.reduce((a, l) => a + l.qty * l.cost, 0));
  const el    = document.getElementById('p-total');
  if (el) el.textContent = fmt(total) + ' ج';
  return total;
}

// ==================== حفظ فاتورة الشراء ====================

function savePurchase() {
  const supplier = document.getElementById('p-supplier').value.trim() || '—';
  const payment  = document.getElementById('p-payment').value;

  const lines = _purchaseLines.filter(l => l.itemId && l.qty > 0);
  if (!lines.length) { toast('أضف صنف على الأقل', 'er'); return; }

  const id    = 'PUR-' + pad(CTR.purch++, 3);
  const total = r2(lines.reduce((a, l) => a + l.qty * l.cost, 0));

  // تحديث المخزون والتكلفة المتوسطة
  lines.forEach(ln => {
    const item = ITEMS.find(i => i.id === ln.itemId);
    if (!item) return;
    const oldTotal  = r2(item.avg_cost * item.stock);
    const newTotal  = r2(ln.qty * ln.cost);
    item.stock     += ln.qty;
    item.avg_cost   = item.stock > 0 ? r2((oldTotal + newTotal) / item.stock) : ln.cost;

    // سجّل حركة مخزون
    MOVES.push({
      id:     'MOV-' + pad(CTR.move++, 3),
      itemId: item.id,
      name:   item.name,
      dir:    'in',
      qty:    ln.qty,
      note:   `فاتورة شراء ${id}`,
      date:   today()
    });
  });

  // سجّل المعاملة المالية
  // suppliers = دين عليك (payable) → يُزاد في رصيد suppliers بـ 'in'
  // cash/bank  = دفعت فعلاً → يُخصم بـ 'out'
  const txType = (payment === 'suppliers') ? 'in' : 'out';
  addTransaction(txType, payment, total, `فاتورة شراء ${id} — ${supplier}`, id, today());

  PURCHASES.push({
    id,
    supplier,
    lines: lines.map(l => ({
      itemId: l.itemId,
      name:   ITEMS.find(i => i.id === l.itemId)?.name || '',
      qty:    l.qty,
      cost:   l.cost
    })),
    total,
    payment,
    date: today()
  });

  save(KEYS.purchases, PURCHASES);
  save(KEYS.items,     ITEMS);
  save(KEYS.moves,     MOVES);
  save(KEYS.counters,  CTR);

  closeModal('m-purchase');
  renderPurchasesList();
  renderItems();
  renderMoves();
  renderDash();
  toast('✅ تم تسجيل فاتورة الشراء');
}

// ==================== عرض قايمة المشتريات ====================

function renderPurchasesList() {
  const el = document.getElementById('purchases-list');
  if (!el) return;
  const sorted = [...PURCHASES].reverse();

  if (!sorted.length) { el.innerHTML = '<div class="empty">لا توجد مشتريات</div>'; return; }

  el.innerHTML = sorted.map(p => `
    <div class="purch-card">
      <div class="row-b" style="margin-bottom:8px">
        <div>
          <div style="font-weight:700">${p.id}</div>
          <div style="font-size:11px;color:var(--t2)">${p.supplier} · ${p.date}</div>
        </div>
        <div style="color:var(--rd);font-weight:800">${fmt(p.total)} ج</div>
      </div>
      ${p.lines.map(l =>
        `<div style="font-size:12px;color:var(--t2);margin-bottom:3px">
          • ${l.name} × ${l.qty} بـ ${fmt(l.cost)} ج
        </div>`
      ).join('')}
      <div style="font-size:11px;margin-top:6px;color:var(--t3)">
        💳 ${walletName(p.payment)}
      </div>
    </div>`).join('');
}
