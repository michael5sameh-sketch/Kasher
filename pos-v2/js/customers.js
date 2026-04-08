// ============================================================
//  customers.js  —  إدارة العملاء
// ============================================================

"use strict";

function addCust() {
  const name  = document.getElementById('nc-name').value.trim();
  const phone = document.getElementById('nc-phone').value.trim();
  const addr  = document.getElementById('nc-addr').value.trim();
  if (!name) { toast('أدخل اسم العميل', 'er'); return; }

  CUSTOMERS.push({
    id:    'CST-' + pad(CTR.cust++, 3),
    name, phone, addr,
    date:  today()
  });
  save(KEYS.customers, CUSTOMERS);
  save(KEYS.counters,  CTR);

  document.getElementById('nc-name').value  = '';
  document.getElementById('nc-phone').value = '';
  document.getElementById('nc-addr').value  = '';

  renderCusts();
  renderCustDatalist();
  toast('✅ تم إضافة العميل');
}

function renderCusts() {
  const el = document.getElementById('cust-list');
  if (!el) return;
  const q    = document.getElementById('cust-search')?.value.toLowerCase() || '';
  const list = CUSTOMERS.filter(c =>
    c.name.toLowerCase().includes(q) || (c.phone||'').includes(q)
  );

  if (!list.length) { el.innerHTML = '<div class="empty">لا يوجد عملاء</div>'; return; }

  el.innerHTML = list.map(c => {
    const invs   = INVOICES.filter(i => i.customer === c.name);
    const total  = r2(invs.reduce((a, i) => a + i.total, 0));
    const credit = r2(TRANSACTIONS
      .filter(t => t.wallet === 'credit' && invs.find(i => i.id === t.refId))
      .reduce((a, t) => a + (t.type === 'in' ? t.amount : -t.amount), 0));

    return `
    <div class="cust-card" onclick="viewCust('${c.id}')">
      <div class="cust-name">${c.name}</div>
      <div class="cust-meta">
        ${c.phone ? `📞 ${c.phone}` : ''}
        ${c.addr  ? ` · 📍 ${c.addr}` : ''}
      </div>
      <div style="margin-top:8px;display:flex;gap:12px;font-size:12px">
        <span>🧾 ${invs.length} فاتورة</span>
        <span style="color:var(--ac)">💰 ${fmt(total)} ج</span>
        ${credit > 0 ? `<span style="color:var(--or)">📝 آجل: ${fmt(credit)} ج</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function viewCust(id) {
  const c = CUSTOMERS.find(x => x.id === id);
  if (!c) return;
  const invs  = INVOICES.filter(i => i.customer === c.name);
  const total = r2(invs.reduce((a, i) => a + i.total, 0));

  document.getElementById('mc-title').textContent = c.name;
  document.getElementById('mc-body').innerHTML = `
    <div style="font-size:13px;color:var(--t2);margin-bottom:14px">
      ${c.phone ? `📞 ${c.phone}<br>` : ''}
      ${c.addr  ? `📍 ${c.addr}<br>` : ''}
      📅 منذ ${c.date}
    </div>
    <div class="irow"><span>عدد الفواتير</span><span>${invs.length}</span></div>
    <div class="irow"><span>إجمالي المشتريات</span><span style="color:var(--ac)">${fmt(total)} ج</span></div>
    <hr class="divider">
    ${invs.slice(-5).reverse().map(i =>
      `<div class="irow" style="margin-bottom:8px">
        <div><div style="font-weight:700">${i.id}</div><div style="font-size:11px;color:var(--t2)">${i.date}</div></div>
        <div style="color:var(--ac);font-weight:800">${fmt(i.total)} ج</div>
      </div>`
    ).join('') || '<div class="empty" style="padding:12px">لا توجد فواتير</div>'}
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-d" style="flex:1" onclick="deleteCust('${c.id}')">🗑️ حذف</button>
    </div>`;

  openModal('m-cust');
}

async function deleteCust(id) {
  if (await confirm2('حذف العميل؟')) {
    CUSTOMERS = CUSTOMERS.filter(x => x.id !== id);
    save(KEYS.customers, CUSTOMERS);
    closeModal('m-cust');
    renderCusts();
    renderCustDatalist();
    toast('✅ تم الحذف');
  }
}

function renderCustDatalist() {
  const dl = document.getElementById('clist');
  if (dl) dl.innerHTML = CUSTOMERS.map(c => `<option value="${c.name}">`).join('');
}
