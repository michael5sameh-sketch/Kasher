// ============================================================
//  storage.js  —  طبقة البيانات والحالة
//  الملف ده بيتحمل أول حاجة في index.html قبل أي ملف تاني
// ============================================================

"use strict";

// ==================== مفاتيح التخزين ====================
const KEYS = {
  activated:    'pos_activated',
  deviceId:     'pos_device_id',
  items:        'pos_items',
  invoices:     'pos_invoices',
  customers:    'pos_customers',
  moves:        'pos_moves',
  wallets:      'pos_wallets',
  transactions: 'pos_transactions',
  returns:      'pos_returns',
  purchases:    'pos_purchases',
  counters:     'pos_counters',
  taxSettings:  'pos_tax_settings'   // ← إعدادات الضريبة
};

// ==================== دوال التخزين ====================
// ⚠️ لازم تيجي قبل أي استخدام لـ load() أو save()

function load(key, defaultValue) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('خطأ في الحفظ:', e);
  }
}

// ==================== إعدادات الضريبة ====================
// ✅ FIX: بعد تعريف load() مباشرةً — mode: 'none'|'percent'|'fixed'
let TAX_SETTINGS = load(KEYS.taxSettings, { mode: 'percent', value: 14 });

// ==================== حالة التطبيق (State) ====================
let ITEMS        = load(KEYS.items,        null);
let INVOICES     = load(KEYS.invoices,     []);
let PURCHASES    = load(KEYS.purchases,    []);
let CUSTOMERS    = load(KEYS.customers,    null);
let MOVES        = load(KEYS.moves,        []);
let WALLETS      = load(KEYS.wallets,      { cash: 0, bank: 0, credit: 0, suppliers: 0 });
let TRANSACTIONS = load(KEYS.transactions, []);
let RETURNS      = load(KEYS.returns,      []);
let CTR          = load(KEYS.counters,     { inv:1, purch:1, item:1, cust:1, move:1, ret:1, tr:1 });

// ==================== بيانات أولية تجريبية ====================
if (!ITEMS) {
  ITEMS = [
    { id:'ITM-001', name:'أرز بسمتي 5 كيلو',   avg_cost:45, price:74.10, stock:85,  reorder:10, barcode:'' },
    { id:'ITM-002', name:'زيت طيبة 1.8 لتر',    avg_cost:38, price:62.00, stock:72,  reorder:8,  barcode:'' },
    { id:'ITM-003', name:'سكر ناعم كيلو',        avg_cost:12, price:19.50, stock:200, reorder:30, barcode:'' },
    { id:'ITM-004', name:'ماء كريستال 1.5 لتر', avg_cost:3,  price:7.00,  stock:350, reorder:50, barcode:'' },
  ];
  CTR.item = 5;
  save(KEYS.items, ITEMS);
}

if (!CUSTOMERS) {
  CUSTOMERS = [];
  CTR.cust  = 1;
  save(KEYS.customers, CUSTOMERS);
}

// تأكد إن WALLETS فيها suppliers
if (!WALLETS || !('suppliers' in WALLETS)) {
  WALLETS = { cash: 0, bank: 0, credit: 0, suppliers: 0 };
  save(KEYS.wallets, WALLETS);
}

// تأكد إن CTR فيها كل الـ counters
if (!CTR.tr)   { CTR.tr   = 1; save(KEYS.counters, CTR); }
if (!CTR.ret)  { CTR.ret  = 1; save(KEYS.counters, CTR); }
if (!CTR.move) { CTR.move = 1; save(KEYS.counters, CTR); }
