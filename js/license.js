// ============================================================
//  license.js  —  نظام الترخيص الكامل
//  ① فترة تجريبية 30 يوم مجانية بدون PIN
//  ② بعد 30 يوم → شاشة شراء الترخيص
//  ③ مفتاح دائم  → PIN يومي للأبد
//  ④ مفتاح مؤقت → يفتح X يوم أنت بتحددها، بعدها شاشة الشراء
//  يتحمل بعد storage.js و utils.js
// ============================================================

"use strict";

// ==================== ثوابت — غيّرها قبل البيع ====================
const LICENSE_KEY = 'pos_license';
const SECRET_SALT = 'POS2025SALT';   // لازم نفس الكلمة في keygen.html
const TRIAL_DAYS  = 30;
const WA_NUMBER   = '201556668356';
const FULL_PRICE  = 600;
const OFFER_PRICE = 300;

// ==================== Device ID ====================

function generateDeviceId() {
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ].join('|');

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash).toString(36).toUpperCase().padStart(9, '0');
  return abs.slice(0,3) + '-' + abs.slice(3,6) + '-' + abs.slice(6,9);
}

// ==================== حساب المفاتيح ====================
//
//  نوعان من المفاتيح — كلاهما بيتولد من Device ID + SECRET_SALT:
//
//  1) مفتاح دائم  (PERM)
//     computeSerial(deviceId) → رقم 5 أرقام
//     مثال: "54821"
//
//  2) مفتاح مؤقت (TEMP)
//     computeTempSerial(deviceId, days) → رقم 6 أرقام يبدأ بعدد الأيام
//     مثال: 30 يوم → "307654"  |  7 أيام → "071234"
//     الـ 6 أرقام = أول 2-3 أرقام (الأيام) + باقي أرقام checksum
//     لو الأيام < 10 → يبدأ بـ 0 (مثلاً 7 أيام → 07XXXX)

function computeSerial(deviceId) {
  // مفتاح دائم — 5 أرقام (10000–99999)
  const input = deviceId + SECRET_SALT + 'PERM';
  let val = 0;
  for (let i = 0; i < input.length; i++) {
    val = (val * 31 + input.charCodeAt(i)) >>> 0;
  }
  return String((val % 89999) + 10000);
}

function computeTempSerial(deviceId, days) {
  // مفتاح مؤقت — 7 أرقام: أول 3 أرقام = الأيام (001-365) + 4 أرقام checksum
  // مثال: 30 يوم + checksum 5432 → "0305432"
  // مثال:  7 يوم + checksum 1234 → "0071234"
  const input = deviceId + SECRET_SALT + 'TEMP' + String(days);
  let val = 0;
  for (let i = 0; i < input.length; i++) {
    val = (val * 31 + input.charCodeAt(i)) >>> 0;
  }
  const checksum  = String((val % 9000) + 1000);          // 4 أرقام
  const daysPart  = String(days).padStart(3, '0');         // 3 أرقام
  return daysPart + checksum;                              // 7 أرقام إجمالاً
}

function verifySerial(deviceId, entered) {
  // جرّب المفتاح الدائم أولاً
  if (entered === computeSerial(deviceId)) {
    return { valid: true, type: 'perm', days: 0 };
  }

  // جرّب المفتاح المؤقت (7 أرقام)
  if (entered.length === 7) {
    const days     = parseInt(entered.slice(0, 3), 10);   // أول 3 أرقام
    const expected = computeTempSerial(deviceId, days);
    if (entered === expected && days > 0 && days <= 365) {
      return { valid: true, type: 'temp', days };
    }
  }

  return { valid: false };
}

// ==================== تاريخ التثبيت (مرتبط بالجهاز) ====================

function _deviceHash() {
  const id = generateDeviceId();
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function getInstallDate() {
  const KEY    = 'pos_install_ts';
  const stored = localStorage.getItem(KEY);
  if (stored) return new Date(+stored);

  // أول تشغيل → حسّب من Device ID (offset أقل من دقيقة → practically now)
  const offset    = _deviceHash() % (60 * 1000);
  const installTs = Date.now() - offset;
  localStorage.setItem(KEY, String(installTs));
  return new Date(installTs);
}

function getDaysUsed()  { return Math.floor((Date.now() - getInstallDate().getTime()) / 86400000); }
function getDaysLeft()  { return Math.max(0, TRIAL_DAYS - getDaysUsed()); }
function isTrialActive(){ return getDaysUsed() < TRIAL_DAYS; }

// ==================== حالة الترخيص ====================

function getLicense() {
  return load(LICENSE_KEY, null);
}

function getLicenseState() {
  // ترجع: 'trial' | 'perm' | 'temp_active' | 'temp_expired' | 'expired'
  const lic = getLicense();

  if (lic && lic.type === 'perm') return 'perm';

  if (lic && lic.type === 'temp') {
    const licDate  = new Date(lic.activatedAt);
    const daysUsed = Math.floor((Date.now() - licDate.getTime()) / 86400000);
    if (daysUsed < lic.days) return 'temp_active';
    return 'temp_expired';
  }

  if (isTrialActive()) return 'trial';
  return 'expired';
}

function getTempDaysLeft() {
  const lic = getLicense();
  if (!lic || lic.type !== 'temp') return 0;
  const daysUsed = Math.floor((Date.now() - new Date(lic.activatedAt).getTime()) / 86400000);
  return Math.max(0, lic.days - daysUsed);
}

// ==================== نقطة البداية ====================

(function bootLicense() {
  save(KEYS.deviceId, generateDeviceId());

  const state = getLicenseState();

  if (state === 'perm') {
    _showPinScreen();
    return;
  }

  if (state === 'temp_active') {
    _showPinScreen();
    return;
  }

  if (state === 'trial') {
    _openAppDirect();
    return;
  }

  // expired أو temp_expired → شاشة الشراء
  _showPurchaseScreen();
})();

// ==================== فتح مباشر (فترة التجربة) ====================

function _openAppDirect() {
  document.getElementById('lock-screen').style.display = 'none';
  document.getElementById('app').classList.add('on');
  initApp();
  _injectTrialBadge();
}

function _injectTrialBadge() {
  const daysLeft = getDaysLeft();
  const acts     = document.querySelector('.tb-acts');
  if (!acts || document.getElementById('_trial-badge')) return;

  const badge       = document.createElement('button');
  badge.id          = '_trial-badge';
  badge.className   = 'ib';
  badge.title       = 'النسخة التجريبية — اضغط للشراء';
  badge.style.color = daysLeft <= 3 ? 'var(--rd)' : daysLeft <= 10 ? 'var(--or)' : 'var(--t2)';
  badge.textContent = '⏳' + daysLeft;
  badge.onclick     = () => _showPurchaseScreen();
  acts.insertBefore(badge, acts.firstChild);
}

// ==================== شاشة الشراء ====================

function _showPurchaseScreen() {
  const el = document.getElementById('lock-screen');
  el.style.display = 'flex';
  document.getElementById('app').classList.remove('on');

  const deviceId = generateDeviceId();
  const waMsg    = encodeURIComponent('مرحباً، أريد شراء نظام إدارة المبيعات.\nكود الجهاز: ' + deviceId);
  const waUrl    = 'https://wa.me/' + WA_NUMBER + '?text=' + waMsg;

  const state      = getLicenseState();
  const isExpired  = state === 'temp_expired';
  const subTitle   = isExpired
    ? 'انتهت فترة الترخيص المؤقت'
    : 'انتهت فترة التجربة المجانية';

  el.innerHTML = `
    <div class="lk-ico" style="animation:lkfloat 3s ease-in-out infinite">🏪</div>
    <div class="lk-ttl">نظام إدارة المبيعات</div>
    <div class="lk-sub" style="color:var(--or)">${subTitle}</div>

    <div class="lic-box" style="max-width:360px">

      <!-- مميزات النظام -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:800;color:var(--t2);letter-spacing:.8px;margin-bottom:10px;text-align:center">
          ✦ ليه النظام ده مختلف ✦
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
          ${[
            ['📦','مخزون ذكي'],
            ['🧾','فواتير فورية'],
            ['💰','4 خزائن منفصلة'],
            ['📊','تقارير أرباح'],
            ['🔄','مرتجعات مرنة'],
            ['📷','مسح باركود'],
          ].map(([ic,tx]) => `
            <div style="background:rgba(0,212,170,.06);border:1px solid rgba(0,212,170,.12);border-radius:8px;padding:8px 10px;font-size:12px;display:flex;align-items:center;gap:6px">
              <span>${ic}</span><span style="color:var(--t1)">${tx}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- السعر -->
      <div style="background:rgba(0,212,170,.04);border:1px solid rgba(0,212,170,.15);border-radius:12px;padding:14px;text-align:center;margin-bottom:14px">
        <div style="font-size:11px;color:var(--t3);text-decoration:line-through;margin-bottom:3px">
          السعر الأصلي ${FULL_PRICE} ج
        </div>
        <div style="font-size:12px;color:var(--or);font-weight:700;margin-bottom:6px">
          🎁 عرض التفعيل الأول — خصم 50%
        </div>
        <div style="font-size:38px;font-weight:900;color:var(--ac);line-height:1.1">
          ${OFFER_PRICE} ج
        </div>
        <div style="font-size:11px;color:var(--t2);margin-top:5px">
          ترخيص دائم · دفعة واحدة · بدون اشتراك
        </div>
      </div>

      <!-- رسالة تسويقية -->
      <div style="background:rgba(56,189,248,.05);border-right:3px solid var(--ac2);border-radius:0 8px 8px 0;padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--t2);line-height:1.7">
        💡 <strong style="color:var(--t1)">مش متأكد؟</strong> تواصل معانا وهنديك فترة تجربة إضافية مجانية — بدون أي التزام.
      </div>

      <!-- زرار واتساب -->
      <a href="${waUrl}" target="_blank" style="text-decoration:none;display:block;margin-bottom:12px">
        <button class="btn" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;width:100%;font-size:14px;padding:13px;gap:8px">
          📱 تواصل معانا على واتساب
        </button>
      </a>

      <!-- فاصل -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div style="flex:1;height:1px;background:var(--b1)"></div>
        <span style="font-size:11px;color:var(--t3)">عندك مفتاح؟</span>
        <div style="flex:1;height:1px;background:var(--b1)"></div>
      </div>

      <!-- إدخال المفتاح -->
      <input class="fi" id="lic-serial" type="number"
        placeholder="أدخل مفتاح التفعيل"
        style="text-align:center;font-size:18px;font-weight:900;letter-spacing:3px;margin-bottom:8px">
      <div class="lk-err" id="lic-err" style="min-height:16px;margin-bottom:8px;text-align:center;font-size:12px"></div>
      <button class="btn btn-p" onclick="activateLicense()" style="margin-bottom:14px">✅ تفعيل</button>

      <!-- Device ID -->
      <div style="padding-top:12px;border-top:1px solid var(--b1);text-align:center">
        <div style="font-size:11px;color:var(--t3);margin-bottom:6px">كود جهازك — ابعته للمطور عشان يطلعلك مفتاح</div>
        <div class="lic-device-id" id="lic-did"
          onclick="copyDeviceId()" title="اضغط للنسخ"
          style="font-size:13px;letter-spacing:2px">${deviceId}</div>
        <div style="font-size:10px;color:var(--t3);margin-top:4px">اضغط عليه للنسخ</div>
      </div>

    </div>`;
}

// ==================== تفعيل الترخيص ====================

function activateLicense() {
  const deviceId = generateDeviceId();
  const entered  = (document.getElementById('lic-serial').value || '').trim();
  const errEl    = document.getElementById('lic-err');
  const result   = verifySerial(deviceId, entered);

  if (!result.valid) {
    if (errEl) errEl.textContent = '❌ مفتاح خاطئ — تحقق من الكود';
    const inp = document.getElementById('lic-serial');
    if (inp) inp.value = '';
    return;
  }

  if (result.type === 'perm') {
    save(LICENSE_KEY, { type: 'perm', deviceId, activatedAt: new Date().toISOString() });
    toast('🎉 تم التفعيل الدائم! مرحباً بك');
    _showPinScreen();

  } else {
    // مؤقت
    save(LICENSE_KEY, {
      type:        'temp',
      days:        result.days,
      deviceId,
      activatedAt: new Date().toISOString()
    });
    toast('✅ تم التفعيل لمدة ' + result.days + ' يوم');
    _showPinScreen();
  }
}

// ==================== نسخ Device ID ====================

function copyDeviceId() {
  const id = (document.getElementById('lic-did').textContent || '').trim();
  navigator.clipboard.writeText(id).then(() => toast('📋 تم نسخ الكود')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = id;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast('📋 تم نسخ الكود');
  });
}

// ==================== شاشة PIN ====================

function _showPinScreen() {
  const el = document.getElementById('lock-screen');
  el.style.display = 'flex';
  document.getElementById('app').classList.remove('on');
  _pin = '';

  // لو مؤقت → اعرض الأيام المتبقية
  const state    = getLicenseState();
  const tempLeft = state === 'temp_active' ? getTempDaysLeft() : 0;
  const subLine  = tempLeft > 0
    ? `<div class="lk-sub" style="color:var(--or)">⏳ متبقي ${tempLeft} يوم</div>`
    : `<div class="lk-sub">متعدد الخزائن</div>`;

  el.innerHTML = `
    <div class="lk-ico">🏪</div>
    <div class="lk-ttl">نظام إدارة المبيعات</div>
    ${subLine}
    <div class="lk-box" id="lkbox">
      <div class="lk-prompt">أدخل رمز الدخول اليومي (4 أرقام)</div>
      <div class="dots">
        <div class="dot" id="d0"></div><div class="dot" id="d1"></div>
        <div class="dot" id="d2"></div><div class="dot" id="d3"></div>
      </div>
      <div class="npad">
        <button class="k" onclick="kp('1')">١</button>
        <button class="k" onclick="kp('2')">٢</button>
        <button class="k" onclick="kp('3')">٣</button>
        <button class="k" onclick="kp('4')">٤</button>
        <button class="k" onclick="kp('5')">٥</button>
        <button class="k" onclick="kp('6')">٦</button>
        <button class="k" onclick="kp('7')">٧</button>
        <button class="k" onclick="kp('8')">٨</button>
        <button class="k" onclick="kp('9')">٩</button>
        <button class="k del" onclick="kdel()">⌫</button>
        <button class="k" onclick="kp('0')">٠</button>
        <button class="k go" onclick="kgo()">دخول</button>
      </div>
      <div class="lk-err" id="lerr"></div>
    </div>`;
}

// ==================== منطق PIN ====================

let _pin = '';

function getPass() {
  const d   = new Date();
  const num = ((d.getDate() * (d.getMonth() + 1)) + 5) * 7;
  return String(num).padStart(4, '0');
}

function kp(c) {
  if (_pin.length >= 4) return;
  _pin += c;
  upDots();
  if (_pin.length === 4) setTimeout(kgo, 180);
}

function kdel() {
  _pin = _pin.slice(0, -1);
  upDots();
}

function upDots() {
  for (let i = 0; i < 4; i++) {
    document.getElementById('d' + i)?.classList.toggle('on', i < _pin.length);
  }
}

function kgo() {
  if (_pin === getPass()) {
    document.getElementById('lock-screen').style.display = 'none';
    document.getElementById('app').classList.add('on');
    initApp();
  } else {
    const errEl = document.getElementById('lerr');
    if (errEl) errEl.textContent = '❌ رمز خاطئ';
    const box = document.getElementById('lkbox');
    if (box) { box.classList.add('shake'); setTimeout(() => box.classList.remove('shake'), 400); }
    _pin = '';
    upDots();
  }
}

// ==================== قفل التطبيق ====================

function lockApp() {
  confirm2('تريد قفل التطبيق؟').then(yes => {
    if (!yes) return;
    _pin = '';
    const state = getLicenseState();
    if (state === 'perm' || state === 'temp_active') {
      _showPinScreen();
    } else if (state === 'trial') {
      document.getElementById('lock-screen').style.display = 'none';
      document.getElementById('app').classList.add('on');
    } else {
      _showPurchaseScreen();
    }
  });
}
