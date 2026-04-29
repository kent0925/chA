// --- 0. 核心安全配置 ---
const SYSTEM_SALT = "TrU$t_Sca1e_8xP@qL9!mZ";

// 🌟 新增：全域使用者身分狀態
let currentUser = {
    uid: 'GUEST_DEFAULT',
    platform: 'WEB',
    quota: 0 // 預設 0 次
};

// --- 1. 安全模組：加鹽雜湊 (SHA-256) ---
async function hashData(text) {
    if (!text) return "";
    const saltedText = text + SYSTEM_SALT;
    const msgBuffer = new TextEncoder().encode(saltedText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 🌟 新增：雙軌環境偵測與登入模組 (LINE / Telegram)
async function initializeAuth() {
    try {
        // 偵測 A：Telegram (每日 1 次)
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            currentUser = { uid: `TG_${tgUser.id}`, platform: 'TELEGRAM', quota: 1 };
            console.log("🛡️ Telegram 模式：每日 1 次查詢額度");
            return;
        }

        // 偵測 B：LINE (每日 3 次)
        if (window.liff) {
            await liff.init({ liffId: "YOUR_LIFF_ID_HERE" });
            if (liff.isLoggedIn()) {
                const profile = await liff.getProfile();
                currentUser = { uid: `LINE_${profile.userId}`, platform: 'LINE', quota: 3 };
                console.log("🛡️ LINE 模式：每日 3 次查詢額度");
                return;
            }
        }

        // 偵測 C：網頁訪客 (試用版 - 僅能看 Demo)
        currentUser = { uid: 'TRIAL_USER', platform: 'WEB', quota: 0 };
        console.log("🛑 訪客模式：啟動試用版引流邏輯");

    } catch (error) {
        currentUser = { uid: 'TRIAL_USER', platform: 'WEB', quota: 0 };
    }
}

// --- 2. 視圖切換管理 ---
function switchView(viewId) {
    const allViews = ['view-search', 'view-loading', 'view-results', 'view-report'];
    allViews.forEach(id => {
        const view = document.getElementById(id);
        if (view) {
            view.classList.toggle('hidden', id !== viewId);
        }
    });
}

// --- 3. 雙向評鑑標籤庫資料 (Version 2.8 完整版) ---
const TAG_LIBRARY = {
    tenant: [
        { id: "T1", text: "✨ 屋況維持極佳", impact: "good" },
        { id: "T2", text: "🛠️ 擅自更動裝修", impact: "bad" },
        { id: "T3", text: "🤫 維持鄰里安寧", impact: "good" },
        { id: "T4", text: "📦 堆置雜物爭議", impact: "bad" },
        { id: "T5", text: "🛡️ 設備妥善維護", impact: "good" },
        { id: "T6", text: "🏚️ 設備毀損紀錄", impact: "bad" },
        { id: "T7", text: "📱 溝通聯繫順暢", impact: "good" },
        { id: "T8", text: "🔊 鄰里噪音投訴", impact: "bad" },
        { id: "T9", text: "🧹 空間整潔清空", impact: "good" },
        { id: "T10", text: "🚬 菸寵異味殘留", impact: "bad" },
        { id: "T11", text: "💰 準時給付租金", impact: "good" },
        { id: "T12", text: "💸 租金給付遲延", impact: "bad" }
    ],
    landlord: [
        { id: "L1", text: "💸 押金如期返還", impact: "good" },
        { id: "L2", text: "🔍 押金返還爭議", impact: "bad" },
        { id: "L3", text: "⚡ 修繕處理迅速", impact: "good" },
        { id: "L4", text: "⏳ 修繕進度緩慢", impact: "bad" },
        { id: "L5", text: "🏠 尊重個人隱私", impact: "good" },
        { id: "L6", text: "👣 未經授權入內", impact: "bad" },
        { id: "L7", text: "📺 附屬設備完善", impact: "good" },
        { id: "L8", text: "📈 租金調整頻繁", impact: "bad" },
        { id: "L9", text: "📜 契約條款透明", impact: "good" },
        { id: "L10", text: "⚖️ 契約條款爭議", impact: "bad" },
        { id: "L11", text: "👼 配合申報稅費", impact: "good" },
        { id: "L12", text: "🚫 拒絕租金補貼", impact: "bad" }
    ]
};

let currentReportType = 'tenant';
let selectedTags = new Set();

// --- 4. 搜尋邏輯 (已修復整合版) ---
async function handleSearch() {
    // 🌟 訪客試用版邏輯
    if (currentUser.platform === 'WEB') {
        switchView('view-loading');
        setTimeout(() => {
            // 試用版固定給予「極高風險」的 Demo，讓訪客知道系統的威力
            updateResultsUI(99);
            switchView('view-results');
            // 在結果頁額外提示
            alert("✨ 這是「試用版預覽」。\n若要查詢真實資料庫，請點擊下方按鈕加入 LINE 或 Telegram 官方帳號。");
        }, 1500);
        return;
    }

    // 🌟 正式用戶 (LINE/TG) 查詢邏輯
    const name = document.getElementById('in-name').value.trim();
    const area = document.getElementById('in-area').value;
    const ageRange = document.getElementById('in-age').value;

    const phoneRaw = document.getElementById('in-phone').value;
    const phoneClean = String(phoneRaw).replace(/\D/g, '').slice(0, 4);

    if (!name || !area) return alert("姓名與地區為必填");
    if (phoneRaw && phoneClean.length !== 4) return alert("電話末四碼必須為 4 位數字");

    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = phoneClean ? await hashData(phoneClean) : "";

    const payload = {
        action: "search",
        uid: currentUser.uid,
        platform: currentUser.platform,
        limit: currentUser.quota,
        hName,
        hPhone,
        area,
        ageRange
    };

    console.log("🚀 [搜尋 Payload]:", payload);

    setTimeout(() => {
        updateResultsUI(95);
        switchView('view-results');
    }, 1500);
}

// --- 5. 結果渲染引擎 (前端完全無分數版) ---
function updateResultsUI(input) {
    const statusTag = document.querySelector('.status-tag');
    const courtCard = document.querySelector('.court-data');
    const userCard = document.querySelector('.user-data');
    const legalFooter = document.querySelector('.legal-footer');

    // ── 模式判斷 ──
    if (typeof input === 'number') {
        // 【Demo 測試模式】: 這邊的數字是我們寫死在前端測試用的，不會產生真實的封包外洩資安問題
        const R = input;
        let cfg = { color: 'green', text: '🟢 查無顯著關聯紀錄' };
        if (R > 80) cfg = { color: 'red', text: '🔴 具備密集關聯紀錄' };
        else if (R > 50) cfg = { color: 'orange', text: '🟠 具備多項關聯紀錄' };
        else if (R > 20) cfg = { color: 'yellow', text: '🟡 具備少數關聯紀錄' };

        if (statusTag) {
            statusTag.innerText = cfg.text;
            statusTag.className = 'status-tag text-' + cfg.color;
        }
        if (courtCard) courtCard.className = 'result-card court-data border-' + cfg.color;
        if (userCard) userCard.className = 'result-card user-data border-' + cfg.color;

        if (R > 80) {
            const courtLink = document.getElementById('res-court-link');
            const courtEmpty = document.getElementById('res-court-empty');
            if (courtLink) {
                courtLink.href = 'https://judgment.judicial.gov.tw/FJUD/default.aspx';
                courtLink.innerText = 'https://judgment.judicial.gov.tw/FJUD/ (示意網址)';
                courtLink.style.display = 'block';
                courtLink.setAttribute('rel', 'noopener noreferrer');
            }
            if (courtEmpty) courtEmpty.style.display = 'none';

            if (userCard) userCard.style.display = 'block';
            const userTitle = document.getElementById('res-user-title');
            if (userTitle) userTitle.innerText = '共 1 筆回報';
            const userTagsRow = document.getElementById('res-user-tags');
            if (userTagsRow) userTagsRow.innerHTML = `<span class="ui-tag user-tag">📦 雜物領主</span>`;

            if (legalFooter) legalFooter.style.display = 'block';
        } else {
            const courtLink = document.getElementById('res-court-link');
            const courtEmpty = document.getElementById('res-court-empty');
            if (courtLink) courtLink.style.display = 'none';
            if (courtEmpty) courtEmpty.style.display = 'block';

            if (userCard) userCard.style.display = 'none';
            if (legalFooter) legalFooter.style.display = 'none';
        }

    } else {
        // 【正式連線模式】: 與 GAS 後端對接
        // 💡 關鍵升級：前端不再接收 "score"，而是接收後端判定好的抽象代號 "riskLevel"
        const { riskLevel, courtInfo, userInfo } = input;

        let cfg;
        // 前端徹底淪為只負責顯示外觀的「笨蛋(Dumb UI)」，不含任何評分計算邏輯
        if (riskLevel === 'HIGH') {
            cfg = { color: 'red', text: '🔴 具備密集關聯紀錄' };
        } else if (riskLevel === 'MEDIUM') {
            cfg = { color: 'orange', text: '🟠 具備多項關聯紀錄' };
        } else if (riskLevel === 'LOW') {
            cfg = { color: 'yellow', text: '🟡 具備少數關聯紀錄' };
        } else {
            cfg = { color: 'green', text: '🟢 查無顯著關聯紀錄' };
        }

        if (statusTag) {
            statusTag.className = `status-tag text-${cfg.color}`;
            statusTag.innerText = cfg.text;
        }
        if (courtCard) courtCard.className = `result-card court-data border-${cfg.color}`;
        if (userCard) userCard.className = `result-card user-data border-${cfg.color}`;

        const courtTitle = courtCard ? courtCard.querySelector('h3') : null;
        if (courtTitle) courtTitle.style.display = 'none';

        const courtSummary = courtCard ? courtCard.querySelector('.summary') : null;
        if (courtSummary) {
            if (courtInfo && courtInfo.url) {
                courtSummary.innerHTML = `<a href="${courtInfo.url}" target="_blank" rel="noopener noreferrer" style="color: #3498db; word-break: break-all;">${courtInfo.url}</a>`;
            } else {
                courtSummary.innerText = "查無相關判決網址";
            }
            courtSummary.style.display = 'block';
        }
        const courtTagRow = courtCard ? courtCard.querySelector('.tag-row') : null;
        if (courtTagRow) courtTagRow.innerHTML = '';

        if (userInfo && userInfo.found) {
            if (userCard) userCard.style.display = 'block';
            const userTitle = userCard.querySelector('h3');
            if (userTitle) {
                userTitle.innerText = `共 ${userInfo.reportCount || 0} 筆回報`;
                userTitle.style.display = 'block';
            }
            const userSummary = userCard.querySelector('.summary');
            if (userSummary) userSummary.style.display = 'none';

            const tagRow = userCard.querySelector('.tag-row');
            if (tagRow) {
                tagRow.innerHTML = '';
                if (userInfo.tags && userInfo.tags.length > 0) {
                    userInfo.tags.forEach(tagText => {
                        const span = document.createElement('span');
                        span.className = `ui-tag user-tag`;
                        span.innerText = tagText;
                        tagRow.appendChild(span);
                    });
                }
            }
            if (legalFooter) legalFooter.style.display = 'block';
        } else {
            if (userCard) userCard.style.display = 'none';
            if (legalFooter) legalFooter.style.display = 'none';
        }
    }
}

function renderResultTags(containerId, tags, cssClass) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!tags || tags.length === 0) return;
    tags.forEach(tagText => {
        const span = document.createElement('span');
        span.className = `ui-tag ${cssClass}`;
        span.innerText = tagText;
        container.appendChild(span);
    });
}

// --- 6. 回報系統邏輯 ---
function setReportType(type) {
    currentReportType = type;
    selectedTags.clear();

    const btnTenant = document.getElementById('btn-report-tenant');
    const btnLandlord = document.getElementById('btn-report-landlord');
    if (btnTenant) btnTenant.className = type === 'tenant' ? 'active' : '';
    if (btnLandlord) btnLandlord.className = type === 'landlord' ? 'active' : '';

    const lblName = document.getElementById('lbl-name');
    const lblAge = document.getElementById('lbl-age');
    if (lblName) lblName.innerHTML = type === 'tenant' ? '房客姓名 <span class="required">*</span>' : '房東/出租人姓名 <span class="required">*</span>';
    if (lblAge) lblAge.innerHTML = type === 'tenant' ? '房客目測年齡 <span class="required">*</span>' : '房東目測年齡 <span class="required">*</span>';

    // 動態切換專屬欄位區塊
    const fieldsTenant = document.getElementById('fields-tenant');
    const fieldsLandlord = document.getElementById('fields-landlord');
    if (type === 'tenant') {
        if (fieldsTenant) fieldsTenant.style.display = 'block';
        if (fieldsLandlord) fieldsLandlord.style.display = 'none';
    } else {
        if (fieldsTenant) fieldsTenant.style.display = 'none';
        if (fieldsLandlord) fieldsLandlord.style.display = 'block';
    }

    renderTags();
}

// --- 渲染特徵標籤 (中立合併版) ---
function renderTags() {
    const container = document.getElementById('tag-container');
    if (!container) return;

    container.innerHTML = '';

    TAG_LIBRARY[currentReportType].forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerText = tag.text;

        chip.onclick = () => {
            if (selectedTags.has(tag.text)) {
                selectedTags.delete(tag.text);
                chip.classList.remove('selected');
            } else {
                selectedTags.add(tag.text);
                chip.classList.add('selected');
            }
        };

        container.appendChild(chip);
    });
}

async function submitReport() {
    const area = document.getElementById('report-area').value;
    const name = document.getElementById('report-name').value.trim();
    const age = document.getElementById('report-age').value;
    const phoneRaw = document.getElementById('report-phone').value;
    const year = document.getElementById('report-year').value;
    const isAgreed = document.getElementById('report-agreement').checked;

    const phoneClean = String(phoneRaw).replace(/\D/g, '').slice(0, 4);

    if (!isAgreed) return alert("請勾選同意法律免責切結書");
    if (!area || !name || !age || !year) return alert("請完整填寫生活圈、姓名、年齡與發生年份");
    if (phoneClean.length !== 4) return alert("電話末四碼必須為 4 位數字");
    if (selectedTags.size === 0) return alert("請至少選擇一個特徵標籤");

    let specificData = {};
    if (currentReportType === 'tenant') {
        const tTarget = document.getElementById('report-tenant-target');
        const tRent = document.getElementById('report-tenant-rent');
        if (!tTarget.value || !tRent.value) return alert("請選擇承租型態與租金級距");
        specificData = { target: tTarget.value, rentLevel: tRent.value };
    } else {
        const lType = document.getElementById('report-landlord-type');
        const lTarget = document.getElementById('report-landlord-target');
        if (!lType.value || !lTarget.value) return alert("請選擇出租人屬性與出租型態");
        specificData = { landlordType: lType.value, target: lTarget.value };
    }

    switchView('view-loading');

    const hName = await hashData(name);
    const hPhone = await hashData(phoneClean);

    const payload = {
        action: "report",
        uid: currentUser.uid,
        platform: currentUser.platform,
        type: currentReportType,
        area: area,
        hName,
        hPhone,
        ageRange: age,
        year: year,
        specificData: specificData,
        tags: Array.from(selectedTags),
        timestamp: new Date().toISOString()
    };

    console.log("🚀 [回報 Payload]:", payload);

    setTimeout(() => {
        alert("✅ 紀錄已完成單向加密建檔。原始輸入資訊已於本地端清除。");
        resetApp();
    }, 1200);
}

// --- 7. 通用輔助函式 ---

/** 開啟回報視圖 */
function openReportView() {
    if (currentUser.platform === 'WEB' || currentUser.uid === 'BLOCKED') {
        alert("🔒 安全驗證要求：\n請使用 LINE 開啟本系統，以解鎖建立履約紀錄建檔之權限。");
        return;
    }
    if (currentUser.platform === 'TELEGRAM') {
        alert("🔒 訪客權限限制：\n為確保資料庫真實性，Telegram 環境目前僅開放「查詢」功能。若需新增履約紀錄，請改用 LINE 官方帳號開啟本系統。");
        return;
    }

    switchView('view-report');
    renderTags();
}

/** 返回搜尋視圖，並重置所有輸入 */
function resetApp() {
    switchView('view-search');

    const reportName = document.getElementById('report-name');
    const reportPhone = document.getElementById('report-phone');
    const reportArea = document.getElementById('report-area');
    const reportAge = document.getElementById('report-age');
    const reportYear = document.getElementById('report-year');
    const agreement = document.getElementById('report-agreement');

    if (reportName) reportName.value = '';
    if (reportPhone) reportPhone.value = '';
    if (reportArea) reportArea.selectedIndex = 0;
    if (reportAge) reportAge.selectedIndex = 0;
    if (reportYear) reportYear.selectedIndex = 0;
    if (agreement) agreement.checked = false;

    const selects = document.querySelectorAll('.dynamic-fields select');
    selects.forEach(s => s.selectedIndex = 0);

    selectedTags.clear();
    renderTags();

    const legalFooter = document.querySelector('.legal-footer');
    if (legalFooter) legalFooter.style.display = 'none';

    window.scrollTo(0, 0);
}

function openTakedownForm() {
    // 💡 替換說明：請將 @your_line_oa_id 改為你真實的 LINE 官方帳號 ID (記得保留 @ 符號)
    const lineOaUrl = "https://line.me/R/ti/p/@your_line_oa_id";

    // 開啟新視窗/喚醒 LINE App 進入聊天室
    window.open(lineOaUrl, '_blank');
}

// --- 8. 即時數據儀表板更新 ---
async function updateLiveStats() {
    try {
        const simulatedData = {
            courtCount: 5012345,
            userCount: 1204
        };
        const stCourt = document.getElementById('stat-court-num');
        const stUser = document.getElementById('stat-user-num');
        if (stCourt) stCourt.innerText = simulatedData.courtCount.toLocaleString();
        if (stUser) stUser.innerText = simulatedData.userCount.toLocaleString();
        console.log("📊 儀表板數據已同步更新");
    } catch (error) {
        console.error("無法更新儀表板數據:", error);
    }
}

// --- 8.5 動態生成發生年份 ---
function generateYearOptions() {
    const yearSelect = document.getElementById('report-year');
    if (!yearSelect) return;

    // 自動取得當下時間並換算為民國年
    const currentYear = new Date().getFullYear();
    const twYear = currentYear - 1911; // 系統將自動算出 115

    // 清除舊選項，確保只保留第一個預設值
    yearSelect.length = 1;

    // 動態新增選項 1：今年 (例如：115年)
    yearSelect.add(new Option(`${twYear}年 (近期)`, twYear.toString()));

    // 動態新增選項 2：前三年 (例如：112-114年)
    yearSelect.add(new Option(`${twYear - 3}-${twYear - 1}年`, `${twYear - 3}-${twYear - 1}`));

    // 動態新增選項 3：更早以前 (例如：111年以前)
    yearSelect.add(new Option(`${twYear - 4}年以前`, `${twYear - 4}以前`));
}

// --- 9. 初始化 ---
window.onload = async () => {
    await initializeAuth();
    generateYearOptions(); // 🌟 呼叫動態年份生成
    switchView('view-search');
    renderTags();
    updateLiveStats();
};