// ============================================================
//  inventory.js  —  المخزون والأصناف وحركات المخزون
// ============================================================

"use strict";

// ==================== Dropdown الأصناف في الفاتورة ====================

function renderItemSelect() {
  const sel = document.getElementById('si-item');
  if (!sel) return;
  sel.innerHTML = '<option value="">— اختر صنف —</option>' +
    ITEMS.map(i =>
      `<option value="${i.id}">${i.name} (${i.stock} متاح) — ${fmt(i.price)} ج</option>`
    ).join('');
}

// ==================== قايمة الأصناف ====================

function renderItems() {
  const el  = document.getElementById('items-list');
  if (!el) return;
  const q   = (document.getElementById('item-search')?.value || '').toLowerCase();
  const list = ITEMS.filter(i => i.name.toLowerCase().includes(q));

  if (!list.length) { el.innerHTML = '<div class="empty">لا توجد أصناف</div>'; return; }

  el.innerHTML = list.map(i => {
    const stockColor = i.stock <= i.reorder ? 'var(--rd)' : i.stock <= i.reorder * 2 ? 'var(--or)' : 'var(--gr)';
    const barcodeBadge = i.barcode
      ? `<span class="barcode-badge">📊 ${i.barcode}</span>`
      : '';
    return `
    <div class="item-card">
      <div class="item-name">${i.name}</div>
      <div class="item-id">${i.id} ${barcodeBadge}</div>
      <div class="item-stats">
        <div class="item-stat">
          <div class="sv" style="color:${stockColor}">${i.stock}</div>
          <div class="sl">المخزون</div>
        </div>
        <div class="item-stat">
          <div class="sv">${fmt(i.cost ?? i.avg_cost)}</div>
          <div class="sl">تكلفة (ج)</div>
        </div>
        <div class="item-stat">
          <div class="sv" style="color:var(--ac)">${fmt(i.price)}</div>
          <div class="sl">بيع (ج)</div>
        </div>
      </div>
      <div class="item-actions">
        <button class="btn btn-s" style="font-size:12px" onclick="openStockMove('${i.id}','in')">⬆️ إضافة</button>
        <button class="btn btn-d" style="font-size:12px" onclick="openStockMove('${i.id}','out')">⬇️ خصم</button>
        <button class="btn btn-b" style="font-size:12px" onclick="editItem('${i.id}')">✏️ تعديل</button>
        <button class="btn" style="font-size:12px;background:rgba(239,68,68,.08);color:var(--rd);border:1px solid rgba(239,68,68,.2)" onclick="deleteItem('${i.id}')">🗑️ حذف</button>
      </div>
    </div>`;
  }).join('');
}

// ==================== إضافة صنف ====================

function addItem() {
  const name    = document.getElementById('mi-name').value.trim();
  const cost    = +document.getElementById('mi-cost').value    || 0;
  const price   = +document.getElementById('mi-price').value   || 0;
  const stock   = +document.getElementById('mi-stock').value   || 0;
  const reorder = +document.getElementById('mi-reorder').value || 5;
  const barcode = document.getElementById('mi-barcode')?.value.trim() || '';
  const payment = document.getElementById('mi-payment')?.value || 'cash';

  if (!name)  { toast('أدخل اسم الصنف', 'er'); return; }
  if (!price) { toast('أدخل سعر البيع', 'er'); return; }

  // تحقق من تكرار الباركود
  if (barcode && ITEMS.find(i => i.barcode === barcode)) {
    toast('الباركود موجود مسبقاً', 'er'); return;
  }

  const id = 'ITM-' + pad(CTR.item++, 3);
  const item = { id, name, avg_cost: cost, price, stock, reorder, barcode };
  ITEMS.push(item);

  // لو فيه مخزون ابتدائي → سجّل حركة مالية
  // ✅ FIX: suppliers = دين → 'in' | cash/bank = دفعت → 'out'
  if (stock > 0 && cost > 0) {
    const txType = (payment === 'suppliers') ? 'in' : 'out';
    addTransaction(txType, payment, r2(stock * cost), `مخزون ابتدائي — ${name}`, id, today());
  }

  save(KEYS.items,    ITEMS);
  save(KEYS.counters, CTR);

  // مسح الفورم
  ['mi-name','mi-cost','mi-price','mi-barcode'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('mi-stock').value   = '0';
  document.getElementById('mi-reorder').value = '5';
  const pw = document.getElementById('mi-payment-wrap');
  if (pw) pw.style.display = 'none';

  closeModal('m-additem');
  renderItems();
  renderItemSelect();
  renderDash();
  toast('✅ تم إضافة الصنف');
}

// ==================== تعديل صنف ====================

function editItem(itemId) {
  const item = ITEMS.find(i => i.id === itemId);
  if (!item) return;

  // ✅ FIX: بدل prompt() — نفتح مودال تعديل مخصص
  const bg = document.createElement('div');
  bg.className = 'confirm-bg';
  bg.innerHTML = `
    <div class="confirm-box" style="max-width:340px">
      <div class="confirm-msg" style="margin-bottom:16px">✏️ تعديل: ${item.name}</div>
      <div class="fg">
        <label class="fl">سعر البيع (ج)</label>
        <input class="fi" id="_edit-price" type="number" value="${item.price}" min="0" step="0.01">
      </div>
      <div class="fg">
        <label class="fl">سعر الشراء / التكلفة (ج)</label>
        <input class="fi" id="_edit-cost" type="number" value="${item.avg_cost}" min="0" step="0.01">
      </div>
      <div class="fg">
        <label class="fl">حد إعادة الطلب</label>
        <input class="fi" id="_edit-reorder" type="number" value="${item.reorder}" min="0">
      </div>
      <div class="fg">
        <label class="fl">باركود</label>
        <input class="fi" id="_edit-barcode" value="${item.barcode || ''}">
      </div>
      <div class="confirm-btns">
        <button class="btn btn-d" id="_editCancel">إلغاء</button>
        <button class="btn btn-p" id="_editSave">💾 حفظ</button>
      </div>
    </div>`;
  document.body.appendChild(bg);

  document.getElementById('_editCancel').onclick = () => bg.remove();
  document.getElementById('_editSave').onclick = () => {
    const newPrice   = +document.getElementById('_edit-price').value   || 0;
    const newCost    = +document.getElementById('_edit-cost').value    || 0;
    const newReorder = +document.getElementById('_edit-reorder').value || 0;
    const newBarcode =  document.getElementById('_edit-barcode').value.trim();

    if (newPrice <= 0) { toast('أدخل سعر بيع صحيح', 'er'); return; }

    // تحقق من تكرار الباركود على صنف تاني
    if (newBarcode && ITEMS.find(i => i.barcode === newBarcode && i.id !== itemId)) {
      toast('الباركود مستخدم لصنف آخر', 'er'); return;
    }

    item.price    = newPrice;
    item.avg_cost = newCost;
    item.reorder  = newReorder;
    item.barcode  = newBarcode;
    save(KEYS.items, ITEMS);
    bg.remove();
    renderItems();
    renderItemSelect();
    toast('✅ تم تعديل الصنف');
  };
}

// ==================== حذف صنف ====================

async function deleteItem(id) {
  const item = ITEMS.find(i => i.id === id);
  if (!item) return;
  const yes = await confirm2(`حذف "${item.name}"؟`);
  if (!yes) return;
  ITEMS = ITEMS.filter(i => i.id !== id);
  save(KEYS.items, ITEMS);
  renderItems();
  renderItemSelect();
  toast('✅ تم الحذف');
}

// ==================== البحث بالباركود ====================

/**
 * لما يُمسح باركود → يبحث عن الصنف ويضيفه للفاتورة أو يفتح الصنف
 */
function handleBarcodeResult(barcode, context) {
  const item = ITEMS.find(i => i.barcode === barcode);

  if (!item) {
    toast(`الباركود ${barcode} غير موجود`, 'er');
    // لو في صفحة إضافة صنف → ضع الباركود في الحقل
    if (context === 'additem') {
      const el = document.getElementById('mi-barcode');
      if (el) el.value = barcode;
    }
    return;
  }

  if (context === 'sales') {
    // أضف الصنف للفاتورة مباشرةً
    addLineById(item.id);
    toast(`✅ تمت إضافة: ${item.name}`);
  } else if (context === 'inventory') {
    // فلتر قايمة المخزون بالصنف ده
    const search = document.getElementById('item-search');
    if (search) { search.value = item.name; renderItems(); }
    toast(`📦 ${item.name}`);
  }
}

// ==================== حركات المخزون ====================

let _smItemId  = null;
let _smDir     = 'in';
let _smPayment = 'cash';

function openStockMove(itemId, dir) {
  _smItemId  = itemId;
  _smDir     = dir;
  _smPayment = 'cash';

  const item = ITEMS.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('sm-title').textContent =
    dir === 'in' ? `⬆️ إضافة مخزون — ${item.name}` : `⬇️ خصم مخزون — ${item.name}`;

  document.getElementById('sm-item-info').innerHTML =
    `المخزون الحالي: <strong>${item.stock}</strong> وحدة | سعر البيع: <strong>${fmt(item.price)} ج</strong>`;

  document.getElementById('sm-qty').value  = '1';
  document.getElementById('sm-note').value = '';

  // حقول الإضافة (التكلفة وطريقة الدفع) فقط عند الإضافة
  const inFields = document.getElementById('sm-in-fields');
  if (inFields) inFields.style.display = dir === 'in' ? 'block' : 'none';

  if (dir === 'in') {
    document.getElementById('sm-cost').value = item.avg_cost || '';
    selectSMPayment('cash');
  }

  openModal('m-stockmove');
}

function selectSMPayment(p) {
  _smPayment = p;
  ['cash','bank','suppliers','credit'].forEach(w => {
    const btn = document.getElementById('smb-' + w);
    if (btn) {
      btn.className = 'payment-btn';
      if (w === p) {
        btn.classList.add(w === 'bank' ? 'on-bank' : w === 'suppliers' ? 'on-sup' : 'on');
      }
    }
  });
}

function confirmStockMove() {
  const item = ITEMS.find(i => i.id === _smItemId);
  if (!item) return;

  const qty  = +document.getElementById('sm-qty').value || 0;
  const note = document.getElementById('sm-note').value.trim();

  if (qty <= 0) { toast('أدخل كمية صحيحة', 'er'); return; }
  if (_smDir === 'out' && qty > item.stock) { toast('الكمية أكبر من المتاح', 'er'); return; }

  if (_smDir === 'in') {
    const cost  = +document.getElementById('sm-cost').value || 0;
    const total = r2(qty * cost);
    // تحديث متوسط التكلفة
    const oldTotal = r2(item.avg_cost * item.stock);
    item.stock    += qty;
    item.avg_cost  = item.stock > 0 ? r2((oldTotal + total) / item.stock) : cost;
    if (total > 0) {
      // suppliers = دين عليك → 'in' | cash/bank = دفعت → 'out'
      const txType = (_smPayment === 'suppliers') ? 'in' : 'out';
      addTransaction(txType, _smPayment, total, `شراء ${qty} وحدة — ${item.name}`, item.id, today());
    }
  } else {
    item.stock -= qty;
  }

  // سجّل الحركة
  MOVES.push({
    id:     'MOV-' + pad(CTR.move++, 3),
    itemId: item.id,
    name:   item.name,
    dir:    _smDir,
    qty,
    note,
    date:   today()
  });

  save(KEYS.items,    ITEMS);
  save(KEYS.moves,    MOVES);
  save(KEYS.counters, CTR);

  closeModal('m-stockmove');
  renderItems();
  renderItemSelect();
  renderMoves();
  renderDash();
  toast(`✅ تم ${_smDir === 'in' ? 'إضافة' : 'خصم'} ${qty} وحدة`);
}

// ==================== سجل حركات المخزون ====================

function renderMoves() {
  const el = document.getElementById('moves-list');
  if (!el) return;
  const sorted = [...MOVES].reverse();

  if (!sorted.length) { el.innerHTML = '<div class="empty">لا توجد حركات</div>'; return; }

  el.innerHTML = sorted.map(m => `
    <div class="move-card ${m.dir === 'in' ? 'move-in' : 'move-out'}">
      <div class="row-b">
        <div>
          <div style="font-weight:700">${m.name}</div>
          <div style="font-size:11px;color:var(--t2)">${m.id} · ${m.date}</div>
          ${m.note ? `<div style="font-size:12px;color:var(--t2)">📝 ${m.note}</div>` : ''}
        </div>
        <div style="color:${m.dir === 'in' ? 'var(--gr)' : 'var(--rd)'};font-weight:800">
          ${m.dir === 'in' ? '+' : '-'}${m.qty}
        </div>
      </div>
    </div>`).join('');
}
