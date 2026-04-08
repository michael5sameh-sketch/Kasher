// ============================================================
//  treasury.js  —  الخزينة والمعاملات المالية
// ============================================================

"use strict";

// ==================== إضافة معاملة ====================

function addTransaction(type, wallet, amount, desc, refId, date) {
  const tx = {
    id:     'TRX-' + pad(CTR.tr++, 4),
    type,
    wallet,
    amount: r2(amount),
    desc,
    refId,
    date:   date || today()
  };
  TRANSACTIONS.push(tx);

  if (type === 'in')       WALLETS[wallet] = r2((WALLETS[wallet] || 0) + amount);
  else if (type === 'out') WALLETS[wallet] = r2((WALLETS[wallet] || 0) - amount);

  save(KEYS.wallets,      WALLETS);
  save(KEYS.transactions, TRANSACTIONS);
  save(KEYS.counters,     CTR);
}

// ==================== معاملة يدوية ====================

function addManualTransaction() {
  const wallet = document.getElementById('tr-wallet').value;
  const type   = document.getElementById('tr-type').value;
  const amount = +document.getElementById('tr-amount').value;
  const desc   = document.getElementById('tr-desc').value.trim() || 'حركة يدوية';
  const date   = document.getElementById('tr-date').value || today();

  if (amount <= 0) { toast('أدخل مبلغ صحيح', 'er'); return; }
  if (type === 'out' && WALLETS[wallet] < amount) {
    toast(`رصيد ${walletName(wallet)} غير كافٍ`, 'er');
    return;
  }

  addTransaction(type, wallet, amount, desc, 'manual', date);
  renderWallets();
  renderDash();

  document.getElementById('tr-amount').value = '';
  document.getElementById('tr-desc').value   = '';
  toast('✅ تم تسجيل الحركة');
}

// ==================== عرض سجل المعاملات ====================

function renderTransactionsList() {
  const el     = document.getElementById('tr-list');
  if (!el) return;
  const sorted = [...TRANSACTIONS].reverse();

  if (!sorted.length) {
    el.innerHTML = '<div class="empty">لا توجد حركات</div>';
    return;
  }

  el.innerHTML = sorted.map(tx => `
    <div class="card">
      <div class="row-b">
        <div>
          <div style="font-weight:700">${tx.desc}</div>
          <div style="font-size:11px;color:var(--t2)">
            ${tx.id} · ${tx.date} · ${walletName(tx.wallet)}
          </div>
        </div>
        <div style="color:${tx.type === 'in' ? 'var(--gr)' : 'var(--rd)'};font-weight:800">
          ${tx.type === 'in' ? '+' : '-'}${fmt(tx.amount)} ج
        </div>
      </div>
    </div>`).join('');
}
