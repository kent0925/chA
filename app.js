// --- 0. 核心安全配置 ---
const SYSTEM_SALT = "TrU$t_Sca1e_8xP@qL9!mZ";
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw0dAVQ2HOQDvJKNBpj0FT1HJIPW6GLCdJkye3419ZMi2lzFqTUExD8oHdvLG4H_pKq/exec";
const DEFAULT_LIFF_ID = "2009974240-zhGWMVVX";

// --- 0.5 通用 API 呼叫 ---
async function callGAS(payload) {
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();

        // --- 除錯模式：若有伺服器內部錯誤，直接噴出詳細 log ---
        if (result.status === 'error' && result.details) {
            console.error("GAS 內部錯誤:", result.details, "\nStack:", result.stack);
            alert(`伺服器內部錯誤詳細資訊：\n\n${result.details}\n\n請截圖回報開發者。`);
        }

        return result;
    } catch (error) {
        console.error("API Error:", error);
        return { status: "error", message: "連線失敗，請檢查網路連線" };
    }
}

async function getClientIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) {
        return "UNKNOWN";
    }
}

function getDeviceFingerprint() {
    return new Promise(resolve => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = "top";
            ctx.font = "14px 'Arial'";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = "#069";
            ctx.fillText("TrustScale", 2, 15);
            ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
            ctx.fillText("TrustScale", 4, 17);
            const dataUrl = canvas.toDataURL();
            hashData(dataUrl).then(hash => resolve(hash.substring(0, 16)));
        } catch (e) {
            resolve("UNKNOWN_DEVICE");
        }
    });
}

let currentUser = { uid: 'GUEST', platform: 'WEB', displayName: '訪客測試', pictureUrl: '', personalCount: 0 };

// --- 1. 加密引擎 ---
function hashData(text) {
    if (!text) return Promise.resolve("");
    var saltedText = text + SYSTEM_SALT;
    var sha256 = function (ascii) {
        function rR(v, a) { return (v >>> a) | (v << (32 - a)); };
        var mP = Math.pow, mW = mP(2, 32), res = '', words = [], h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], k = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
        ascii += '\x80'; while (ascii.length % 64 - 56) ascii += '\x00';
        for (var i = 0; i < ascii.length; i++) { var j = ascii.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
        words[words.length] = ((ascii.length * 8 / mW) | 0); words[words.length] = (ascii.length * 8 | 0);
        for (j = 0; j < words.length; j += 16) {
            var w = words.slice(j, j + 16), oldH = h.slice(0);
            for (i = 0; i < 64; i++) {
                var w15 = w[i - 15], w2 = w[i - 2];
                var a = h[0], e = h[4];
                var t1 = h[7] + (rR(e, 6) ^ rR(e, 11) ^ rR(e, 25)) + ((e & h[5]) ^ ((~e) & h[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rR(w15, 7) ^ rR(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rR(w2, 17) ^ rR(w2, 19) ^ (w2 >>> 10))) | 0);
                var t2 = (rR(a, 2) ^ rR(a, 13) ^ rR(a, 22)) + ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]));
                h = [(t1 + t2) | 0].concat(h); h[4] = (h[4] + t1) | 0; h = h.slice(0, 8);
            }
            for (i = 0; i < 8; i++) h[i] = (h[i] + oldH[i]) | 0;
        }
        for (i = 0; i < 8; i++) { for (var b, k = 3; k + 1; k--) { b = (h[i] >> (k * 8)) & 255; res += ((b < 16) ? '0' : '') + b.toString(16); } }
        return res;
    };
    return Promise.resolve(sha256(saltedText));
}

// --- 2. 身分識別 ---
async function initializeAuth() {
    try {
        if (window.liff) {
            await liff.init({ liffId: DEFAULT_LIFF_ID });
            if (liff.isLoggedIn()) {
                const profile = await liff.getProfile();
                currentUser = { uid: `LINE_${profile.userId}`, platform: 'LINE', displayName: profile.displayName, pictureUrl: profile.pictureUrl };
            } else { liff.login(); return; }
        }
    } catch (e) { console.error("Auth Error:", e.message); currentUser = { uid: 'GUEST_DEFAULT', platform: 'WEB', displayName: '訪客測試' }; }

    // --- 黑名單狀態檢查 ---
    try {
        const hUid = await hashData(currentUser.uid);
        const statusRes = await callGAS({ action: 'check_user_status', uid: hUid });
        if (statusRes.status === 'ok' && statusRes.violation) {
            if (statusRes.violation.banned) {
                alert("🚫 【系統通知】您因多次惡意通報，已被永久列入黑名單，無法使用本系統任何功能。");
                document.body.innerHTML = '<div style="text-align:center; padding: 50px; color: var(--danger); font-weight: bold; font-size: 20px;">此帳號已被永久停權。</div>';
                return;
            } else if (statusRes.violation.suspensionDays > 0) {
                alert(`⚠️ 【系統通知】您因違反平台規範被下架紀錄，目前受到停權處分。\n\n您在接下來的 ${statusRes.violation.suspensionDays} 天內僅能查詢，無法新增回報！`);
                // 隱藏回報按鈕
                const btnOpenReport = document.getElementById('btn-open-report');
                if (btnOpenReport) btnOpenReport.style.display = 'none';

                // 覆寫 openReportView 以防繞過
                window.openReportView = function () {
                    alert("您目前在停權期間，無法新增回報！");
                };
            }
        }
    } catch (e) { console.error("狀態檢查失敗", e); }

    updateUserInfoUI();
}

function updateUserInfoUI() {
    const n = document.getElementById('user-name'), a = document.getElementById('user-avatar'), b = document.getElementById('user-bar');
    if (n) n.innerText = currentUser.displayName;
    if (a && currentUser.pictureUrl) a.src = currentUser.pictureUrl;
    if (b) b.classList.remove('hidden');
}

// --- 3. 標籤庫 (與 Code.gs 100% 對接) ---
const TAG_LIBRARY = {
    tenant: [
        { text: "✨ 屋況維持極佳", impact: "good" },
        { text: "🛠️ 擅自更動裝修", impact: "bad" },
        { text: "🤫 維持鄰里安寧", impact: "good" },
        { text: "📦 堆置雜物爭議", impact: "bad" },
        { text: "🛡️ 設備妥善維護", impact: "good" },
        { text: "🏚️ 設備毀損紀錄", impact: "bad" },
        { text: "📱 溝通聯繫順暢", impact: "good" },
        { text: "🔊 鄰里噪音投訴", impact: "bad" },
        { text: "🧹 空間整潔清空", impact: "good" },
        { text: "🚬 菸寵異味殘留", impact: "bad" },
        { text: "💰 準時給付租金", impact: "good" },
        { text: "💸 租金給付遲延", impact: "bad" }
    ],
    landlord: [
        { text: "💸 押金如期返還", impact: "good" },
        { text: "🔍 押金扣留爭議", impact: "bad" },
        { text: "⚡ 修繕處理迅速", impact: "good" },
        { text: "⏳ 修繕推託延遲", impact: "bad" },
        { text: "🏠 尊重房客隱私", impact: "good" },
        { text: "👣 未經授權入內", impact: "bad" },
        { text: "💧 台水台電計費", impact: "good" },
        { text: "📈 超收水電費用", impact: "bad" },
        { text: "📜 契約條款透明", impact: "good" },
        { text: "⚖️ 契約條款嚴苛", impact: "bad" },
        { text: "👼 配合申報稅補", impact: "good" },
        { text: "🚫 拒絕租金補貼", impact: "bad" },
        { text: "🤝 溝通明理友善", impact: "good" },
        { text: "💢 情緒勒索施壓", impact: "bad" }
    ],
    student: [
        { text: "🎓 專注學業單純", impact: "good" },
        { text: "🎉 帶人開趴喧嘩", impact: "bad" },
        { text: "🧹 宿舍維持整潔", impact: "good" },
        { text: "🛵 機車違規停放", impact: "bad" },
        { text: "🤝 家長理性溝通", impact: "good" },
        { text: "🛡️ 家長過度介入", impact: "bad" },
        { text: "💰 租金按時繳納", impact: "good" },
        { text: "💸 寒暑假欠繳/空窗", impact: "bad" }
    ],
    car_consumer: [
        { text: "💥 發生事故隱瞞", impact: "bad" },
        { text: "🚗 車輛惡意毀損", impact: "bad" },
        { text: "💸 租金罰單欠繳", impact: "bad" },
        { text: "⚠️ 嚴重逾期歸還", impact: "bad" },
        { text: "🚭 車內吸菸異味", impact: "bad" },
        { text: "✨ 車況維持極佳", impact: "good" },
        { text: "💰 費用結清迅速", impact: "good" },
        { text: "⏰ 準時歸還車輛", impact: "good" },
        { text: "🤝 配合調度溝通", impact: "good" },
        { text: "🛡️ 駕駛習慣優良", impact: "good" }
    ],
    car_company: [
        { text: "🔍 惡意扣留押金", impact: "bad" },
        { text: "⚖️ 租賃契約陷阱", impact: "bad" },
        { text: "🚗 隱瞞車況瑕疵", impact: "bad" },
        { text: "💸 巧立名目扣款", impact: "bad" },
        { text: "🚨 事故推卸責任", impact: "bad" },
        { text: "👼 退還押金迅速", impact: "good" },
        { text: "🛡️ 車輛保養確實", impact: "good" },
        { text: "🤝 點交透明確實", impact: "good" },
        { text: "🆘 道路救援迅速", impact: "good" },
        { text: "📜 契約條款合理", impact: "good" }
    ]
};
let selectedTags = new Set();
let currentSystemMode = 'house';
let currentSearchType = 'tenant';
let currentReportType = 'tenant';
let currentRecordIdToModify = null;

function setSystemMode(mode) {
    currentSystemMode = mode;
    const searchIdentitySwitch = document.getElementById('search-identity-switch');
    const reportIdentitySwitch = document.getElementById('report-identity-switch');
    const searchCardTag = document.getElementById('search-card-tag');
    const reportCardTag = document.getElementById('report-card-tag');

    if (mode === 'house') {
        searchCardTag.innerText = '🏠 房屋租賃查詢';
        reportCardTag.innerText = '👤 建立房屋履約回報';
        if (searchIdentitySwitch) searchIdentitySwitch.innerHTML = `
            <button id="btn-search-tenant" class="active" onclick="setSearchType('tenant')">一般房客</button>
            <button id="btn-search-student" onclick="setSearchType('student')">學生房客</button>
            <button id="btn-search-landlord" onclick="setSearchType('landlord')">房東紀錄</button>
        `;
        if (reportIdentitySwitch) reportIdentitySwitch.innerHTML = `
            <button id="btn-report-tenant" class="active" onclick="setReportType('tenant')">一般房客</button>
            <button id="btn-report-student" onclick="setReportType('student')">學生房客</button>
            <button id="btn-report-landlord" onclick="setReportType('landlord')">房東紀錄</button>
        `;
        setSearchType('tenant');
        setReportType('tenant');
    } else {
        searchCardTag.innerText = '🚗 車輛租賃查詢';
        reportCardTag.innerText = '🚗 建立車輛履約回報';
        if (searchIdentitySwitch) searchIdentitySwitch.innerHTML = `
            <button id="btn-search-car_consumer" class="active" onclick="setSearchType('car_consumer')">承租人 (查租客)</button>
            <button id="btn-search-car_company" onclick="setSearchType('car_company')">車行 (查車行)</button>
        `;
        if (reportIdentitySwitch) reportIdentitySwitch.innerHTML = `
            <button id="btn-report-car_consumer" class="active" onclick="setReportType('car_consumer')">承租人 (查租客)</button>
            <button id="btn-report-car_company" onclick="setReportType('car_company')">車行 (查車行)</button>
        `;
        setSearchType('car_consumer');
        setReportType('car_consumer');
    }

    switchView('view-search');
}

function setSearchType(type) {
    currentSearchType = type;
    document.querySelectorAll('#search-identity-switch button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-search-${type}`)?.classList.add('active');

    const isVehicle = (currentSystemMode === 'vehicle');
    const isCompany = (type === 'car_company');
    const isConsumer = (type === 'car_consumer');

    if (document.getElementById('search-company-input-method')) document.getElementById('search-company-input-method').style.display = isCompany ? 'block' : 'none';
    if (document.getElementById('search-car-type-group')) document.getElementById('search-car-type-group').style.display = isConsumer ? 'block' : 'none';
    if (document.getElementById('search-age-group')) document.getElementById('search-age-group').style.display = isVehicle ? 'none' : 'block';
    if (document.getElementById('search-gender-group')) document.getElementById('search-gender-group').style.display = isCompany ? 'none' : 'block';

    if (document.getElementById('lbl-search-name')) document.getElementById('lbl-search-name').innerHTML = isCompany ? '車行名稱 <span class="required">*</span>' : '對象姓名 <span class="required">*</span>';

    if (isCompany) {
        toggleSearchCompMethod();
    } else {
        if (document.getElementById('search-taxid-group')) document.getElementById('search-taxid-group').style.display = 'none';
        if (document.getElementById('in-name')) {
            document.getElementById('in-name').readOnly = false;
            document.getElementById('in-name').placeholder = '請輸入真實姓名';
        }
    }
}

function setReportType(type) {
    currentReportType = type;
    document.querySelectorAll('#report-identity-switch button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-report-${type}`)?.classList.add('active');

    const isVehicle = (currentSystemMode === 'vehicle');
    const isCompany = (type === 'car_company');
    const isConsumer = (type === 'car_consumer');

    if (document.getElementById('report-company-input-method')) document.getElementById('report-company-input-method').style.display = isCompany ? 'block' : 'none';
    if (document.getElementById('report-car-type-group')) document.getElementById('report-car-type-group').style.display = isConsumer ? 'block' : 'none';

    if (document.getElementById('report-age-gender-group')) document.getElementById('report-age-gender-group').style.display = isCompany ? 'none' : 'flex';
    if (document.getElementById('report-age-container')) document.getElementById('report-age-container').style.display = (isVehicle) ? 'none' : 'block';
    if (document.getElementById('report-gender-container')) document.getElementById('report-gender-container').style.display = isCompany ? 'none' : 'block';

    if (document.getElementById('report-area-group')) document.getElementById('report-area-group').style.display = 'block';
    if (document.getElementById('report-year-rent-group')) document.getElementById('report-year-rent-group').style.display = isVehicle ? 'none' : 'flex';
    if (document.getElementById('report-layout-group')) document.getElementById('report-layout-group').style.display = isVehicle ? 'none' : 'block';

    if (document.getElementById('fields-tenant')) document.getElementById('fields-tenant').style.display = (type === 'tenant' || type === 'student') ? 'block' : 'none';
    if (document.getElementById('fields-landlord')) document.getElementById('fields-landlord').style.display = (type === 'landlord') ? 'block' : 'none';

    if (document.getElementById('lbl-report-name')) document.getElementById('lbl-report-name').innerHTML = isCompany ? '車行名稱 <span class="required">*</span>' : '對象姓名 <span class="required">*</span>';

    if (isCompany) {
        toggleReportCompMethod();
    } else {
        if (document.getElementById('report-taxid-group')) document.getElementById('report-taxid-group').style.display = 'none';
        if (document.getElementById('report-name')) {
            document.getElementById('report-name').readOnly = false;
            document.getElementById('report-name').placeholder = '請輸入對象真實姓名';
        }
    }

    selectedTags.clear();
    renderTags();
}

function toggleSearchCompMethod() {
    const el = document.querySelector('input[name="search_comp_method"]:checked');
    if (!el) return;
    const method = el.value;
    const nameInput = document.getElementById('in-name');
    const taxidGroup = document.getElementById('search-taxid-group');
    if (method === 'taxid') {
        taxidGroup.style.display = 'block';
        nameInput.readOnly = true;
        nameInput.placeholder = '請先輸入上方統編以自動帶入名稱';
        nameInput.value = '';
    } else {
        taxidGroup.style.display = 'none';
        nameInput.readOnly = false;
        nameInput.placeholder = '請手動輸入車行名稱';
        nameInput.value = '';
    }
}

function toggleReportCompMethod() {
    const el = document.querySelector('input[name="report_comp_method"]:checked');
    if (!el) return;
    const method = el.value;
    const nameInput = document.getElementById('report-name');
    const taxidGroup = document.getElementById('report-taxid-group');
    if (method === 'taxid') {
        taxidGroup.style.display = 'block';
        nameInput.readOnly = true;
        nameInput.placeholder = '請先輸入上方統編以自動帶入名稱';
        nameInput.value = '';
    } else {
        taxidGroup.style.display = 'none';
        nameInput.readOnly = false;
        nameInput.placeholder = '請手動輸入車行名稱';
        nameInput.value = '';
    }
}

async function fetchCompanyName(taxId, targetInputId) {
    if (taxId.length === 8) {
        try {
            const res = await fetch(`https://company.g0v.ronny.tw/api/show/${taxId}`);
            const data = await res.json();
            // 同時支援公司登記（公司名稱）與商業登記（商業名稱）
            const name = data?.data?.['公司名稱'] || data?.data?.['商業名稱'] || data?.data?.['Company_Name'] || null;
            if (name) {
                document.getElementById(targetInputId).value = name;
            } else {
                document.getElementById(targetInputId).value = '';
                document.getElementById(targetInputId).placeholder = '查無此統編，請改用手動輸入';
            }
        } catch (e) {
            console.error("查無此統編或網路錯誤", e);
            document.getElementById(targetInputId).placeholder = '統編查詢失敗，請改用手動輸入';
        }
    }
}

function renderTags() {
    const container = document.getElementById('tag-container');
    if (!container) return;
    container.innerHTML = '';
    selectedTags.clear();

    // 初始化時隱藏說明框
    const descGroup = document.getElementById('report-description-group');
    if (descGroup) descGroup.style.display = 'none';

    // 以中文關鍵字做 includes 比對，完全不依賴 emoji 編碼
    const HIGH_RISK_KEYWORDS = [
        "擅自更動裝修", "設備毀損紀錄", "押金扣留爭議",
        "契約條款嚴苛", "未經授權入內", "發生事故隱瞞",
        "車輛惡意毀損", "惡意扣留押金", "租賃契約陷阱", "隱瞞車況瑕疵"
    ];
    const isHighRisk = (tagText) => HIGH_RISK_KEYWORDS.some(kw => tagText.includes(kw));

    TAG_LIBRARY[currentReportType].forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerText = tag.text;
        chip.onclick = () => {
            if (selectedTags.has(tag.text)) { selectedTags.delete(tag.text); chip.classList.remove('selected'); }
            else { selectedTags.add(tag.text); chip.classList.add('selected'); }

            // 檢查目前已選標籤是否包含重大違規
            const hasHighRisk = [...selectedTags].some(t => isHighRisk(t));
            if (descGroup) descGroup.style.display = hasHighRisk ? 'block' : 'none';
            if (!hasHighRisk) {
                const ta = document.getElementById('report-description');
                if (ta) ta.value = '';
            }
        };
        container.appendChild(chip);
    });
}

// --- 4. 搜尋與結果渲染 (補全參數) ---

async function handleSearch() {
    const isVehicle = (currentSystemMode === 'vehicle');
    const isCompany = (currentSearchType === 'car_company');
    const isConsumer = (currentSearchType === 'car_consumer');

    const name = document.getElementById('in-name').value.trim();
    const phoneRaw = document.getElementById('in-phone').value.trim();
    const phoneClean = phoneRaw.replace(/\D/g, '').slice(-4);

    let gender = "";
    let ageRange = "";

    if (isVehicle) {
        if (isCompany) {
            const methodEl = document.querySelector('input[name="search_comp_method"]:checked');
            if (methodEl && methodEl.value === 'taxid') {
                const taxId = document.getElementById('in-taxid').value.trim();
                if (taxId.length !== 8) return alert("請輸入完整的8碼統一編號");
            }
        } else if (isConsumer) {
            ageRange = document.getElementById('in-car-type')?.value || ""; // 借用 ageRange 傳遞特徵以計算關聯
        }
        if (!isCompany) {
            gender = document.getElementById('in-gender')?.value || "";
        }
    } else {
        gender = document.getElementById('in-gender')?.value || "";
        ageRange = document.getElementById('in-age')?.value || "";
    }

    if (!name) return alert(isCompany ? "請輸入車行名稱" : "請輸入姓名");
    if (phoneClean.length > 0 && phoneClean.length !== 4) return alert("請輸入完整的 4 位電話末四碼，或保持空白");
    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = phoneClean ? await hashData(phoneClean) : "";
    const hUid = await hashData(currentUser.uid);
    try {
        const result = await callGAS({ action: "search", uid: hUid, platform: currentUser.platform, systemMode: currentSystemMode, hName, hPhone, gender, ageRange });
        if (result && result.status === 'ok') {
            updateResultsUI(result);
            switchView('view-results');
        } else {
            alert(result?.message || "查詢遭到拒絕，請確認是否已透過 LINE 登入或額度已用盡。");
            switchView('view-search');
        }
    } catch (e) {
        alert("網路連線異常，請稍後再試。");
        switchView('view-search');
    }
}

function updateResultsUI(input) {
    const adviceEl = document.getElementById('risk-advice');
    const risk = input.riskLevel || 'NONE';

    let advice = "建議依標準程序查核";
    if (risk === "HIGH") advice = "建議強化風險控管或評估承租必要性";
    else if (risk === "MEDIUM") advice = "建議補強第三方擔保或查驗佐證資料";
    else if (risk === "LOW") advice = "建議落實約定事項並留存紀錄";
    else advice = "未偵測到異常關聯，可依一般流程作業";

    adviceEl.innerText = advice;

    // 渲染特徵標籤，確保讀取 userInfo 內的 tags
    if (input.userInfo && input.userInfo.tags && input.userInfo.tags.length > 0) {
        renderResultTags(input.userInfo.tags);
    } else {
        renderResultTags([]); // 清空或顯示查無資料
    }

    updateSpectrum(risk);
    renderQueryRef(input.isAdmin);

    // 處理自身提報紀錄的修改介面（ownReport 包在 userInfo 裡）
    const modSection = document.getElementById('modify-report-section');
    if (modSection) {
        const ownReport = input.userInfo && input.userInfo.ownReport;
        if (ownReport) {
            currentRecordIdToModify = ownReport.recordId;
            modSection.classList.remove('hidden');
            renderModifyTags(ownReport.tags);
        } else {
            currentRecordIdToModify = null;
            modSection.classList.add('hidden');
        }
    }

    // 若為管理員，顯示管理員工具入口按鈕（結果頁 + footer）
    const adminEntryBtn = document.getElementById('admin-entry-btn');
    if (adminEntryBtn) {
        adminEntryBtn.classList.toggle('hidden', !input.isAdmin);
    }
    const adminToolSection = document.getElementById('admin-tool-section');
    if (adminToolSection) {
        adminToolSection.classList.toggle('hidden', !input.isAdmin);
    }
}

function renderResultTags(tags) {
    const container = document.getElementById('results-tags');
    if (!container) return;
    container.innerHTML = '';

    const wrapper = document.getElementById('results-tags-container');
    const header = wrapper?.querySelector('.results-tags-header');

    if (!tags || tags.length === 0) {
        // 顯示容器但隱藏 header，讓「查無紀錄」提示可見
        if (wrapper) wrapper.classList.remove('hidden');
        if (header) header.style.display = 'none';
        container.innerHTML = "<div class='sub-text' style='color:#94a3b8; padding: 10px 0;'>🛡️ 資料庫內查無此對象之異常履約紀錄</div>";
        return;
    }

    // 有標籤時顯示容器與 header
    if (wrapper) wrapper.classList.remove('hidden');
    if (header) header.style.display = '';
    tags.forEach(tag => {
        const el = document.createElement('div');
        el.className = 'ui-tag';
        if (tag.weight <= 0.4) el.classList.add('decay-40');
        else if (tag.weight <= 0.75) el.classList.add('decay-70');
        el.innerHTML = `${tag.text} <span class="tag-count">${tag.count}</span>`;
        container.appendChild(el);
    });
}

function updateSpectrum(riskKey) {
    const pointer = document.getElementById('spectrum-pointer');
    const posMap = { NONE: '12.5%', LOW: '37.5%', MEDIUM: '62.5%', HIGH: '87.5%' };
    if (pointer) pointer.style.left = posMap[riskKey] || '12.5%';
    document.querySelectorAll('.spectrum-seg').forEach((seg, i) => {
        const segKeys = ['NONE', 'LOW', 'MEDIUM', 'HIGH'];
        seg.classList.toggle('active', segKeys[i] === riskKey);
    });
}

function renderQueryRef(isAdmin = false) {
    const refEl = document.getElementById('query-ref');
    if (!refEl) return;
    let html = `查詢流水號: REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    // 🛠️ 只有管理員會看到流水號旁邊的小齒輪，點了才在最下方顯示工具
    if (isAdmin) {
        html += ` <span onclick="toggleAdminTool()" style="cursor:pointer; color:var(--primary); font-size:1.1em; vertical-align:middle; margin-left:10px; opacity:0.6;">🛠️</span>`;
    }
    refEl.innerHTML = html;
}

function toggleAdminTool() {
    switchView('view-admin-tool');
}

function renderModifyTags(existingTags) {
    const container = document.getElementById('modify-tags-grid');
    if (!container) return;
    container.innerHTML = '';

    const allAvailableTags = TAG_LIBRARY[currentSearchType] || [];

    selectedTags.clear();
    existingTags.forEach(t => selectedTags.add(t));

    allAvailableTags.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        if (selectedTags.has(tag.text)) chip.classList.add('selected');
        chip.innerText = tag.text;
        chip.onclick = () => {
            if (selectedTags.has(tag.text)) { selectedTags.delete(tag.text); chip.classList.remove('selected'); }
            else { selectedTags.add(tag.text); chip.classList.add('selected'); }
        };
        container.appendChild(chip);
    });
}

async function submitModifiedReport() {
    if (!currentRecordIdToModify && currentRecordIdToModify !== 0) return alert("無效的紀錄 ID");
    if (selectedTags.size === 0) return alert("請至少選擇一個標籤");
    if (!confirm("確定要修改這筆紀錄的標籤嗎？")) return;

    switchView('view-loading');
    const hUid = await hashData(currentUser.uid);
    try {
        const res = await callGAS({
            action: 'modify_report',
            uid: hUid,
            platform: currentUser.platform,
            systemMode: currentSystemMode,
            recordId: currentRecordIdToModify,
            tags: Array.from(selectedTags)
        });
        if (res.status === 'ok') {
            alert("✅ 標籤已修改成功！");
            resetApp();
        } else {
            alert(res.message || "修改失敗");
            switchView('view-results');
        }
    } catch (e) {
        alert("網路連線異常，請稍後再試。");
        switchView('view-results');
    }
}

// --- 5. 回報提交 (補全性別欄位) ---
async function submitReport() {
    // 蜜罐檢查
    const honeypot = document.getElementById('report-honeypot');
    if (honeypot && honeypot.value) {
        alert("建檔完成");
        location.reload();
        return;
    }

    const isVehicle = (currentSystemMode === 'vehicle');
    const isCompany = (currentReportType === 'car_company');
    const isConsumer = (currentReportType === 'car_consumer');

    const name = document.getElementById('report-name').value.trim();
    const phoneRaw = document.getElementById('report-phone').value.trim();
    const phoneClean = phoneRaw.replace(/\D/g, '').slice(-4);

    const agreement = document.getElementById('report-agreement').checked;

    if (!agreement) return alert("請勾選切結書");
    if (!name) return alert(isCompany ? "請輸入車行名稱" : "請輸入對象姓名");
    if (phoneClean.length !== 4 && !isCompany) return alert("請輸入正確的電話末四碼");

    let area = "", age = "", gender = "", year = "", specificData = {};

    if (isVehicle) {
        year = new Date().getFullYear().toString();
        area = document.getElementById('report-area').value;
        if (!area) return alert("請選擇發生區域");

        if (isCompany) {
            const methodEl = document.querySelector('input[name="report_comp_method"]:checked');
            if (methodEl && methodEl.value === 'taxid') {
                const taxId = document.getElementById('report-taxid').value.trim();
                if (taxId.length !== 8) return alert("請輸入完整的8碼統一編號");
                specificData.taxId = await hashData(taxId);
            }
        } else if (isConsumer) {
            age = document.getElementById('report-car-type')?.value;
            if (!age) return alert("請選擇租賃車種");
            specificData.carType = age;
            gender = document.getElementById('report-gender').value;
            if (!gender) return alert("請選擇性別");
        }
    } else {
        area = document.getElementById('report-area').value;
        age = document.getElementById('report-age').value;
        gender = document.getElementById('report-gender').value;
        year = document.getElementById('report-year').value;

        if (!age) return alert("請選擇年齡");
        if (!gender) return alert("請選擇性別");
        if (!area) return alert("請選擇區域");
        if (!year) return alert("請選擇回報年份");
        if (!document.getElementById('report-rent')?.value) return alert("請選擇每月租金");
        if (!document.getElementById('report-layout')?.value) return alert("請選擇格局類型");

        if ((currentReportType === 'tenant' || currentReportType === 'student') && !document.getElementById('report-tenant-target')?.value) {
            return alert("請選擇承租型態");
        }
        if (currentReportType === 'landlord' && !document.getElementById('report-landlord-type')?.value) {
            return alert("請選擇房東屬性");
        }

        specificData = {
            rentRange: document.getElementById('report-rent')?.value || '',
            layout: document.getElementById('report-layout')?.value || '',
            target: document.getElementById('report-tenant-target')?.value || '',
            landlordType: document.getElementById('report-landlord-type')?.value || ''
        };
    }

    if (selectedTags.size === 0) return alert("請至少選擇一個標籤");

    // 檢查高風險標籤（以中文關鍵字 includes 比對）
    const HIGH_RISK_KEYWORDS = [
        "擅自更動裝修", "設備毀損紀錄", "押金扣留爭議",
        "契約條款嚴苛", "未經授權入內", "發生事故隱瞞",
        "車輛惡意毀損", "惡意扣留押金", "租賃契約陷阱", "隱瞞車況瑕疵"
    ];
    const hasHighRisk = [...selectedTags].some(t => HIGH_RISK_KEYWORDS.some(kw => t.includes(kw)));
    const description = document.getElementById('report-description') ? document.getElementById('report-description').value.trim() : "";
    if (hasHighRisk && description.length < 30) {
        return alert("您選擇了重大違規特徵，請在「詳細事發經過」欄位清楚說明人、事、時、地、物，且必須至少 30 字以上以供備查。");
    }
    specificData.description = description;

    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = await hashData(phoneClean);
    const hUid = await hashData(currentUser.uid);

    // 取得法庭證據包
    const ip = await getClientIP();
    const deviceId = await getDeviceFingerprint();
    const evidence = {
        displayName: currentUser.displayName,
        ip: ip,
        deviceId: deviceId,
        userAgent: navigator.userAgent
    };

    const payload = {
        action: "report", uid: hUid, platform: currentUser.platform, systemMode: currentSystemMode, type: currentReportType,
        area, hName, hPhone, ageRange: age, gender, year, tags: Array.from(selectedTags), timestamp: new Date().toISOString(), specificData, evidence
    };

    try {
        const result = await callGAS(payload);
        if (result?.status === 'ok') {
            alert(result.message || "建檔完成");
            location.reload();
        } else {
            alert(result?.message || "建檔失敗，請稍後再試");
            switchView('view-report');
        }
    } catch (e) { alert("網路連線異常，請稍後再試。"); switchView('view-report'); }
}

// --- 6. ToS 與 UI 管理 ---
function openToSModal(force = false) {
    const modal = document.getElementById('tos-modal');
    const acceptBtn = document.getElementById('btn-accept-tos');
    const content = document.getElementById('tos-content');
    modal.classList.remove('hidden');
    if (force) {
        const closeBtn = document.getElementById('tos-close-btn');
        if (closeBtn) closeBtn.style.display = 'none';
        acceptBtn.disabled = true;
        content.onscroll = () => { if (content.scrollTop + content.clientHeight >= content.scrollHeight - 5) { acceptBtn.disabled = false; acceptBtn.innerText = "我同意"; } };
    }
}
function acceptToS() { localStorage.setItem('tos_v1', 'true'); document.getElementById('tos-modal').classList.add('hidden'); }
function checkFirstTimeUser() { if (!localStorage.getItem('tos_v1')) openToSModal(true); }
function switchView(vId) {
    ['view-home', 'view-search', 'view-loading', 'view-results', 'view-report', 'view-admin-tool'].forEach(id => {
        const v = document.getElementById(id);
        if (v) v.classList.toggle('hidden', id !== vId);
    });
    // 切換標籤後回到頁面頂端，避免瀏覽器自動捧動至不對的位置
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function resetApp() {
    if (document.getElementById('in-name')) document.getElementById('in-name').value = '';
    if (document.getElementById('in-phone')) document.getElementById('in-phone').value = '';
    if (document.getElementById('in-taxid')) document.getElementById('in-taxid').value = '';
    switchView('view-home');
}

function openReportView() {
    // 🔓 徹底解鎖：不再進行前端身分判定，直接進入回報頁面
    switchView('view-report');
    renderTags();
}
function openTakedownForm() { window.open("https://line.me/R/ti/p/@994sepbg", '_blank'); }

// --- 7. 初始化 ---
window.onload = async () => {
    await initializeAuth();
    if (document.getElementById('report-year')) {
        const s = document.getElementById('report-year'), cur = new Date().getFullYear();
        const def = document.createElement('option'); def.value = ''; def.disabled = true; def.selected = true; def.innerText = '請選擇年份'; s.appendChild(def);
        for (let y = cur; y >= 2018; y--) { const o = document.createElement('option'); o.value = y; o.innerText = `${y} 年`; s.appendChild(o); }
    }
    switchView('view-home');
    updateLiveStats();
    checkFirstTimeUser();
};

// --- 8. 管理員工具 ---
async function adminSearch() {
    const name = document.getElementById('admin-search-name').value.trim();
    const phone = document.getElementById('admin-search-phone').value.trim();
    if (!name) return alert("請輸入目標對象姓名");
    if (phone.length > 0 && phone.length !== 4) return alert("請輸入完整的 4 位電話末四碼，或保持空白");

    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = phone.length === 4 ? await hashData(phone) : "";
    const hUid = await hashData(currentUser.uid);

    try {
        const res = await callGAS({ action: 'admin_search', uid: hUid, platform: currentUser.platform, hName, hPhone });
        if (res.status === 'ok') {
            switchView('view-admin-tool');
            const container = document.getElementById('admin-results-container');
            const results = document.getElementById('admin-results');
            container.classList.remove('hidden');
            results.innerHTML = '';

            if (!res.records || res.records.length === 0) {
                results.innerHTML = '<p class="sub-text">找不到任何符合的活躍紀錄。</p>';
                return;
            }

            res.records.forEach(rec => {
                const el = document.createElement('div');
                const isPending = rec.status === 'pending';
                el.style = `padding: 15px; border-bottom: 1px solid var(--card-border); margin-bottom: 10px; ${isPending ? 'border-left: 3px solid #f39c12; background: rgba(243,156,18,0.05);' : ''}`;
                el.innerHTML = `
                    <div style="color:var(--text); font-weight:700;">
                        內部流水號: ${rec.id}
                        ${isPending ? '<span style="color:#f39c12; font-size:0.85em; margin-left:8px;">⚠️ 待審核（集中攻擊隔離）</span>' : ''}
                    </div>
                    <div class="sub-text">建檔日期: ${rec.date} | 標籤數: ${rec.tags}</div>
                    <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                        <button class="btn-small-outline" style="color:var(--danger); border-color:var(--danger);" onclick="adminTakedown('${rec.id}')">強制下架</button>
                        ${isPending ? `<button class="btn-small-outline" style="color:var(--success,#27ae60); border-color:var(--success,#27ae60);" onclick="adminApprove('${rec.id}')">批准上架</button>` : ''}
                    </div>
                `;
                results.appendChild(el);
            });

        } else {
            alert(res.message || "搜尋失敗或您沒有管理員權限");
            switchView('view-admin-tool');
        }
    } catch (e) {
        alert("網路連線異常，請稍後再試。");
        switchView('view-admin-tool');
    }
}

async function adminTakedown(recordId) {
    if (!confirm("確定要強制下架這筆紀錄嗎？下架後系統將永久不再採用此筆數據！")) return;
    switchView('view-loading');
    const hUid = await hashData(currentUser.uid);
    try {
        const res = await callGAS({ action: 'admin_takedown', uid: hUid, platform: currentUser.platform, recordId });
        if (res.status === 'ok') {
            alert("✅ 紀錄已成功下架！");
            document.getElementById('admin-results-container').classList.add('hidden');
        } else {
            alert(res.message || "下架失敗");
        }
    } catch (e) {
        alert("網路連線異常，請稍後再試。");
    }
    switchView('view-admin-tool');
}

async function adminApprove(recordId) {
    if (!confirm("確定要批准這筆待審核紀錄嗎？批准後將正式計入風險評分。")) return;
    switchView('view-loading');
    const hUid = await hashData(currentUser.uid);
    try {
        const res = await callGAS({ action: 'admin_approve', uid: hUid, platform: currentUser.platform, recordId });
        if (res.status === 'ok') {
            alert("✅ 紀錄已批准上架！");
            document.getElementById('admin-results-container').classList.add('hidden');
        } else {
            alert(res.message || "批准失敗");
        }
    } catch (e) {
        alert("網路連線異常，請稍後再試。");
    }
    switchView('view-admin-tool');
}

async function updateLiveStats() {
    try {
        const s = await callGAS({ action: "stats" });
        if (s && s.status === "ok") {
            document.getElementById("stat-total").innerText = s.total || 0;
            document.getElementById("stat-high").innerText = s.highRisk || 0;
            document.getElementById("stat-today").innerText = s.today || 0;
        }
    } catch (e) { }
}