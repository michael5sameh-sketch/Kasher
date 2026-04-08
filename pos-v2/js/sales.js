// ============================================================
//  sales.js  —  المبيعات وإنشاء الفواتير + طباعة/مشاركة
// ============================================================

"use strict";

let _invLines = [];  // سطور الفاتورة الحالية

// ==================== إضافة سطر للفاتورة ====================

function addLine() {
  const sel  = document.getElementById('si-item');
  const id   = sel?.value;
  if (!id) return;
  addLineById(id);
  sel.value = '';
}

/** إضافة صنف بالـ ID مباشرةً (تُستخدم من الباركود كمان) */
function addLineById(id) {
  const item = ITEMS.find(i => i.id === id);
  if (!item) return;

  const existing = _invLines.find(l => l.id === id);
  if (existing) {
    if (existing.qty >= item.stock) { toast('وصلت للحد الأقصى المتاح', 'er'); return; }
    existing.qty++;
  } else {
    if (item.stock <= 0) { toast('المخزون نفد!', 'er'); return; }
    _invLines.push({ id, name: item.name, price: item.price, cost: item.avg_cost, qty: 1 });
  }
  renderInvLines();
}

// ==================== حذف سطر ====================

function delLine(id) {
  _invLines = _invLines.filter(l => l.id !== id);
  renderInvLines();
}

// ==================== تغيير الكمية ====================

function changeQty(id, delta) {
  const line = _invLines.find(l => l.id === id);
  const item = ITEMS.find(i => i.id === id);
  if (!line || !item) return;

  line.qty = Math.max(1, Math.min(line.qty + delta, item.stock));
  renderInvLines();
}

// ==================== رسم السطور ====================

function renderInvLines() {
  const el = document.getElementById('inv-lines');
  if (!el) return;

  el.innerHTML = _invLines.map(l => `
    <div class="iline">
      <button class="del-btn" onclick="delLine('${l.id}')">🗑️</button>
      <div style="font-weight:700;margin-right:30px">${l.name}</div>
      <div style="font-size:12px;color:var(--t2)">${fmt(l.price)} ج / وحدة</div>
      <div class="qrow">
        <button class="qb" onclick="changeQty('${l.id}',-1)">−</button>
        <span class="qv">${l.qty}</span>
        <button class="qb" onclick="changeQty('${l.id}',+1)">+</button>
        <span style="margin-right:auto;font-weight:800;color:var(--ac)">${fmt(l.price * l.qty)} ج</span>
      </div>
    </div>`).join('');

  const hasLines = _invLines.length > 0;
  document.getElementById('inv-tbox').style.display = hasLines ? 'block' : 'none';
  document.getElementById('sv-inv').style.display   = hasLines ? 'flex'  : 'none';
  if (hasLines) calcInv();
}

// ==================== حساب الضريبة ====================

function calcTax(subtotalAfterDisc) {
  if (TAX_SETTINGS.mode === 'none')    return 0;
  if (TAX_SETTINGS.mode === 'fixed')   return r2(TAX_SETTINGS.value);
  if (TAX_SETTINGS.mode === 'percent') return r2(subtotalAfterDisc * TAX_SETTINGS.value / 100);
  return 0;
}

// ==================== حساب الإجمالي ====================

function calcInv() {
  const sub  = r2(_invLines.reduce((a, l) => a + l.price * l.qty, 0));
  const disc = +document.getElementById('it-disc').value || 0;
  const tax  = calcTax(sub - disc);
  const ttl  = r2(sub - disc + tax);

  document.getElementById('it-sub').textContent = fmt(sub)  + ' ج';
  document.getElementById('it-tax').textContent = fmt(tax)  + ' ج';
  document.getElementById('it-ttl').textContent = fmt(ttl)  + ' ج';

  // تحديث label الضريبة حسب الإعداد
  const taxLabel = document.getElementById('it-tax-label');
  if (taxLabel) {
    if (TAX_SETTINGS.mode === 'none')    taxLabel.textContent = 'ضريبة';
    if (TAX_SETTINGS.mode === 'fixed')   taxLabel.textContent = `ضريبة ثابتة (${TAX_SETTINGS.value} ج)`;
    if (TAX_SETTINGS.mode === 'percent') taxLabel.textContent = `ضريبة ${TAX_SETTINGS.value}%`;
  }
}

// ==================== حفظ الفاتورة ====================

function saveInv() {
  if (!_invLines.length) { toast('أضف صنف على الأقل', 'er'); return; }

  const customer = document.getElementById('si-cust').value.trim()    || 'عميل نقدي';
  const payment  = document.getElementById('si-payment').value;
  const disc     = +document.getElementById('it-disc').value          || 0;
  const sub      = r2(_invLines.reduce((a, l) => a + l.price * l.qty, 0));
  const tax      = calcTax(sub - disc);
  const total    = r2(sub - disc + tax);
  const profit   = r2(_invLines.reduce((a, l) => a + (l.price - l.cost) * l.qty, 0));
  // ✅ FIX: الربح = هامش كل صنف بدون خصم الـ discount (الخصم تسويقي مش تكلفة)

  const id = 'INV-' + pad(CTR.inv++, 4);

  // خصم من المخزون
  _invLines.forEach(l => {
    const item = ITEMS.find(i => i.id === l.id);
    if (item) item.stock -= l.qty;
  });

  // سجّل الفاتورة
  const inv = {
    id, customer, payment,
    lines:    _invLines.map(l => ({ ...l })),
    discount: disc, tax, total, profit,
    date:     today()
  };
  INVOICES.push(inv);

  // سجّل المعاملة المالية
  addTransaction('in', payment, total, `فاتورة ${id} — ${customer}`, id, today());

  save(KEYS.invoices, INVOICES);
  save(KEYS.items,    ITEMS);
  save(KEYS.counters, CTR);

  // مسح الفورم
  _invLines = [];
  document.getElementById('si-cust').value  = '';
  document.getElementById('it-disc').value  = '0';
  renderInvLines();
  renderItemSelect();
  renderDash();
  renderCustDatalist();
  toast('✅ تم حفظ الفاتورة — ' + id);

  // اعرض خيار الطباعة
  setTimeout(() => showInvActions(inv), 400);
}

// ==================== قايمة الفواتير ====================

function renderInvList() {
  const el = document.getElementById('inv-list');
  if (!el) return;
  const q      = document.getElementById('inv-search')?.value.toLowerCase() || '';
  const sorted = [...INVOICES].reverse().filter(i =>
    i.id.toLowerCase().includes(q) || i.customer.toLowerCase().includes(q)
  );

  if (!sorted.length) { el.innerHTML = '<div class="empty">لا توجد فواتير</div>'; return; }

  el.innerHTML = sorted.map(inv => `
    <div class="inv-card" onclick="viewInv('${inv.id}')">
      <div class="row-b">
        <div>
          <div style="font-weight:800">${inv.id}</div>
          <div style="font-size:12px;color:var(--t2)">${inv.customer} · ${inv.date}</div>
        </div>
        <div style="text-align:left">
          <div style="color:var(--ac);font-weight:900">${fmt(inv.total)} ج</div>
          <div style="font-size:11px;color:var(--t3)">${walletName(inv.payment)}</div>
        </div>
      </div>
    </div>`).join('');
}

function renderInvDatalist() {
  const dl = document.getElementById('invlist');
  if (dl) dl.innerHTML = INVOICES.map(i => `<option value="${i.id}">`).join('');
}

// ==================== تفاصيل فاتورة ====================

function viewInv(id) {
  const inv = INVOICES.find(i => i.id === id);
  if (!inv) return;

  document.getElementById('mi-title').textContent = `🧾 ${inv.id}`;
  document.getElementById('mi-body').innerHTML = `
    <div style="font-size:13px;color:var(--t2);margin-bottom:14px">
      👤 ${inv.customer} · 📅 ${inv.date} · 💳 ${walletName(inv.payment)}
    </div>
    ${inv.lines.map(l => `
      <div class="irow">
        <span>${l.name} × ${l.qty}</span>
        <span>${fmt(l.price * l.qty)} ج</span>
      </div>`).join('')}
    <hr class="divider">
    <div class="irow"><span>الإجمالي قبل الضريبة</span><span>${fmt(inv.total + inv.discount - inv.tax)} ج</span></div>
    ${inv.discount > 0 ? `<div class="irow"><span>خصم</span><span style="color:var(--rd)">- ${fmt(inv.discount)} ج</span></div>` : ''}
    ${inv.tax > 0 ? `<div class="irow"><span>ضريبة</span><span>${fmt(inv.tax)} ج</span></div>` : ''}
    <div class="irow big"><span>الإجمالي النهائي</span><span>${fmt(inv.total)} ج</span></div>
    <div class="irow" style="margin-top:8px"><span style="color:var(--gr)">صافي الربح</span><span style="color:var(--gr)">${fmt(inv.profit)} ج</span></div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-b" style="flex:1" onclick="printInvoice('${inv.id}')">🖨️ طباعة</button>
      <button class="btn btn-d" style="flex:1" onclick="deleteInv('${inv.id}')">🗑️ حذف</button>
    </div>`;

  openModal('m-inv');
}

async function deleteInv(id) {
  const yes = await confirm2('حذف الفاتورة؟ سيتم استعادة المخزون');
  if (!yes) return;

  const inv = INVOICES.find(i => i.id === id);
  if (inv) {
    // استعادة المخزون
    inv.lines.forEach(l => {
      const item = ITEMS.find(i => i.id === l.id);
      if (item) item.stock += l.qty;
    });
    save(KEYS.items, ITEMS);
    INVOICES = INVOICES.filter(i => i.id !== id);
    save(KEYS.invoices, INVOICES);
  }

  closeModal('m-inv');
  renderInvList();
  renderItems();
  renderDash();
  toast('✅ تم الحذف واسترداد المخزون');
}

// ==================== طباعة الفاتورة ====================

function showInvActions(inv) {
  confirm2(`فاتورة ${inv.id} — ${fmt(inv.total)} ج\nتريد طباعة الفاتورة؟`).then(yes => {
    if (yes) printInvoice(inv.id);
  });
}

function printInvoice(id) {
  const inv = INVOICES.find(i => i.id === id);
  if (!inv) return;

  // إنشاء منطقة الطباعة ديناميكياً
  let area = document.getElementById('print-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'print-area';
    document.body.appendChild(area);
  }

  area.innerHTML = `
    <div class="print-header">
      <h2>🏪 نظام إدارة المبيعات</h2>
      <p>فاتورة رقم: ${inv.id} | التاريخ: ${inv.date}</p>
      <p>العميل: ${inv.customer} | الدفع: ${walletName(inv.payment)}</p>
    </div>

    <table class="print-table">
      <thead>
        <tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
      </thead>
      <tbody>
        ${inv.lines.map(l => `
          <tr>
            <td>${l.name}</td>
            <td>${l.qty}</td>
            <td>${fmt(l.price)} ج</td>
            <td>${fmt(l.price * l.qty)} ج</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <div class="print-total">
      ${inv.discount > 0 ? `<div>خصم: ${fmt(inv.discount)} ج</div>` : ''}
      ${inv.tax > 0 ? `<div>ضريبة: ${fmt(inv.tax)} ج</div>` : ''}
      <div style="font-size:18px;margin-top:6px">💰 الإجمالي: ${fmt(inv.total)} ج</div>
    </div>

    <div class="print-actions">
      <button class="btn-close"  onclick="closePrint()">✕ إغلاق</button>
      <button class="btn-print"  onclick="window.print()">🖨️ طباعة</button>
      <button class="btn-share"  onclick="shareInvoice('${id}')">📱 واتساب</button>
    </div>`;

  area.classList.add('show');
}

function closePrint() {
  const area = document.getElementById('print-area');
  if (area) area.classList.remove('show');
}

/** مشاركة الفاتورة عبر واتساب كنص */
function shareInvoice(id) {
  const inv = INVOICES.find(i => i.id === id);
  if (!inv) return;

  const lines = inv.lines.map(l =>
    `• ${l.name} × ${l.qty} = ${fmt(l.price * l.qty)} ج`
  ).join('\n');

  const msg = [
    `🧾 *فاتورة ${inv.id}*`,
    `📅 التاريخ: ${inv.date}`,
    `👤 العميل: ${inv.customer}`,
    `─────────────`,
    lines,
    `─────────────`,
    inv.discount > 0 ? `🎁 خصم: ${fmt(inv.discount)} ج` : '',
    inv.tax      > 0 ? `🧾 ضريبة: ${fmt(inv.tax)} ج`   : '',
    `💰 *الإجمالي: ${fmt(inv.total)} ج*`,
  ].filter(Boolean).join('\n');

  const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}
