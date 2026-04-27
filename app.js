// --- 0. 核心安全配置 ---
const SYSTEM_SALT = "TrU$t_Sca1e_8xP@qL9!mZ";

// --- 1. 安全模組：加鹽雜湊 (SHA-256) ---
async function hashData(text) {
    if (!text) return "";
    const saltedText = text + SYSTEM_SALT;
    const msgBuffer = new TextEncoder().encode(saltedText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
        { id: "T1",  text: "✨ 屋況維持極佳", impact: "good" },
        { id: "T2",  text: "🛠️ 擅自更動裝修", impact: "bad"  },
        { id: "T3",  text: "🤫 維持鄰里安寧", impact: "good" },
        { id: "T4",  text: "📦 堆置雜物爭議", impact: "bad"  },
        { id: "T5",  text: "🛡️ 設備妥善維護", impact: "good" },
        { id: "T6",  text: "🏚️ 設備毀損紀錄", impact: "bad"  },
        { id: "T7",  text: "📱 溝通聯繫順暢", impact: "good" },
        { id: "T8",  text: "🔊 鄰里噪音投訴", impact: "bad"  },
        { id: "T9",  text: "🧹 空間整潔清空", impact: "good" },
        { id: "T10", text: "🚬 菸寵異味殘留", impact: "bad"  },
        { id: "T11", text: "💰 準時給付租金", impact: "good" },
        { id: "T12", text: "💸 租金給付遲延", impact: "bad"  }
    ],
    landlord: [
        { id: "L1",  text: "💸 押金如期返還", impact: "good" },
        { id: "L2",  text: "🔍 押金返還爭議", impact: "bad"  },
        { id: "L3",  text: "⚡ 修繕處理迅速", impact: "good" },
        { id: "L4",  text: "⏳ 修繕進度緩慢", impact: "bad"  },
        { id: "L5",  text: "🏠 尊重個人隱私", impact: "good" },
        { id: "L6",  text: "👣 未經授權入內", impact: "bad"  },
        { id: "L7",  text: "📺 附屬設備完善", impact: "good" },
        { id: "L8",  text: "📈 租金調整頻繁", impact: "bad"  },
        { id: "L9",  text: "📜 契約條款透明", impact: "good" },
        { id: "L10", text: "⚖️ 契約條款爭議", impact: "bad"  },
        { id: "L11", text: "👼 配合申報稅費", impact: "good" },
        { id: "L12", text: "🚫 拒絕租金補貼", impact: "bad"  }
    ]
};

let currentReportType = 'tenant';
let selectedTags = new Set();

// --- 4. 搜尋邏輯 ---
async function handleSearch() {
    const name  = document.getElementById('in-name').value.trim();
    const area  = document.getElementById('in-area').value;
    const ageRange = document.getElementById('in-age').value;

    // 取搜尋頁的電話欄位（選填），強制只留數字並限 4 碼
    const phoneRaw   = document.getElementById('in-phone').value;
    const phoneClean = String(phoneRaw).replace(/\D/g, '').slice(0, 4);

    if (!name || !area) return alert("姓名與地區為必填");
    if (phoneRaw && phoneClean.length !== 4) return alert("電話末四碼必須為 4 位數字");

    switchView('view-loading');
    const hName  = await hashData(name);
    const hPhone = phoneClean ? await hashData(phoneClean) : "";

    // 未來將此 Payload 透過 fetch 發送到 GAS Web App URL
    console.log("🚀 [搜尋 Payload]:", { action: "search", hName, hPhone, area, ageRange });

    // 模擬等待 (正式上線後改為 fetch 呼叫)
    setTimeout(() => {
        updateResultsUI(95); // 模擬演示用，未來由 GAS 回傳結果
        switchView('view-results');
    }, 1500);
}

// --- 5. 結果渲染引擎 ---
// 支援兩種呼叫方式：
//   updateResultsUI(Number)   → Demo 模式（以數值模擬風險分數）
//   updateResultsUI(Object)   → 正式模式（由 GAS 回傳結構化資料）
function updateResultsUI(input) {
    const scoreVal  = document.querySelector('.score-value');
    const statusTag = document.querySelector('.status-tag');
    const courtCard = document.querySelector('.court-data');
    const userCard  = document.querySelector('.user-data');
    const legalFooter = document.querySelector('.legal-footer');

    // ── 模式判斷 ──
    if (typeof input === 'number') {
        // Demo 模式：根據數值決定風險等級
        const R = input;
        let cfg = { score: 5,  color: 'green',  text: '👼 天使小翅膀' };
        if      (R > 80) cfg = { score: 99, color: 'red',    text: '🦖 哥吉拉噴火' };
        else if (R > 50) cfg = { score: 60, color: 'orange', text: '💣 冒煙的引信' };
        else if (R > 20) cfg = { score: 30, color: 'yellow', text: '🐱 溫和的小貓' };

        scoreVal.innerText   = cfg.score;
        scoreVal.className   = 'score-value ' + cfg.color;
        statusTag.innerText  = cfg.text;
        statusTag.className  = 'status-tag text-' + cfg.color;
        courtCard.className  = 'result-card court-data border-' + cfg.color;
        userCard.className   = 'result-card user-data border-' + cfg.color;

        if (cfg.score === 99) {
            courtCard.querySelector('h3').innerText       = "遷讓房屋 (112年)";
            courtCard.querySelector('.summary').innerText = "法院判決紀錄：積欠租金逾期未還，且有破壞房屋設備事實。";
            courtCard.querySelector('.tag-row').innerHTML =
                `<span class="ui-tag high-risk">遷讓房屋</span><span class="ui-tag high-risk">拆房專家</span>`;

            userCard.style.display                      = "block";
            userCard.querySelector('h3').innerText       = "民間回報 (113年)";
            userCard.querySelector('.summary').innerText = "前任房東回報：生活習慣極差，雜物佔用公共走道。";
            userCard.querySelector('.tag-row').innerHTML =
                `<span class="ui-tag user-tag">雜物領主</span>`;

            if (legalFooter) legalFooter.style.display = 'block';
        } else {
            courtCard.querySelector('h3').innerText       = "查無不良訴訟";
            courtCard.querySelector('.summary').innerText = "大數據中未發現此對象有重大租賃違約紀錄。";
            courtCard.querySelector('.tag-row').innerHTML =
                `<span class="ui-tag" data-type="angel">誠實房客</span>`;
            userCard.style.display = "none";
            if (legalFooter) legalFooter.style.display = 'none';
        }

    } else {
        // 正式模式：由 GAS 回傳的結構化物件
        const { score, courtInfo, userInfo } = input;

        let cfg = { color: 'green',  text: '🟢 履約狀況良好' };
        if      (score >= 80) cfg = { color: 'red',    text: '🔴 建議加強履約保證' };
        else if (score >= 50) cfg = { color: 'orange', text: '🟠 風險觀察中' };
        else if (score >= 20) cfg = { color: 'yellow', text: '🟡 輕微履約爭議' };

        scoreVal.innerText   = score;
        scoreVal.className   = `score-value ${cfg.color}`;
        statusTag.className  = `status-tag text-${cfg.color}`;
        statusTag.innerText  = cfg.text;
        courtCard.className  = `result-card court-data border-${cfg.color}`;
        userCard.className   = `result-card user-data border-${cfg.color}`;

        // 渲染官方卡片
        document.getElementById('res-court-title').innerText   = courtInfo.title;
        document.getElementById('res-court-summary').innerText = courtInfo.summary;
        renderResultTags('res-court-tags', courtInfo.tags, 'high-risk');

        // 渲染民間卡片
        if (userInfo && userInfo.found) {
            userCard.style.display = 'block';
            document.getElementById('res-user-title').innerText   = userInfo.title || '民間回報';
            document.getElementById('res-user-summary').innerText = userInfo.summary;
            renderResultTags('res-user-tags', userInfo.tags, 'user-tag');
            if (legalFooter) legalFooter.style.display = 'block';
        } else {
            userCard.style.display = 'none';
            if (legalFooter) legalFooter.style.display = 'none';
        }
    }
}

/**
 * 輔助函式：將標籤陣列轉換為 UI 元件
 * @param {string} containerId - 容器元素 ID
 * @param {string[]} tags      - 標籤文字陣列
 * @param {string} cssClass    - 附加的 CSS class（如 'high-risk' 或 'user-tag'）
 */
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

    document.getElementById('btn-report-tenant').classList.toggle('active', type === 'tenant');
    document.getElementById('btn-report-landlord').classList.toggle('active', type === 'landlord');

    const nameLabel = type === 'tenant' ? '房客姓名' : '房東姓名';
    const ageLabel  = type === 'tenant' ? '房客目測年齡' : '房東目測年齡';
    document.getElementById('lbl-name').innerHTML = `${nameLabel} <span class="required">*</span>`;
    document.getElementById('lbl-age').innerHTML  = `${ageLabel} <span class="required">*</span>`;

    renderTags();
}

function renderTags() {
    const goodContainer = document.getElementById('tag-container-good');
    const badContainer  = document.getElementById('tag-container-bad');
    if (!goodContainer || !badContainer) return;

    goodContainer.innerHTML = '';
    badContainer.innerHTML  = '';

    TAG_LIBRARY[currentReportType].forEach(tag => {
        const chip = document.createElement('div');
        chip.className       = 'tag-chip';
        chip.dataset.impact  = tag.impact;
        chip.innerText       = tag.text;

        chip.onclick = () => {
            if (selectedTags.has(tag.id)) {
                selectedTags.delete(tag.id);
                chip.classList.remove('selected');
            } else {
                selectedTags.add(tag.id);
                chip.classList.add('selected');
            }
        };

        if (tag.impact === 'good') {
            goodContainer.appendChild(chip);
        } else {
            badContainer.appendChild(chip);
        }
    });
}

async function submitReport() {
    const name     = document.getElementById('report-name').value.trim();
    const age      = document.getElementById('report-age').value;
    const phoneRaw = document.getElementById('report-phone').value;

    // 強制只留數字並限 4 碼
    const phoneClean = String(phoneRaw).replace(/\D/g, '').slice(0, 4);

    if (!name || !age) return alert("姓名與年齡為必填");
    if (phoneClean.length !== 4) return alert("電話末四碼必須為 4 位數字");
    if (selectedTags.size === 0) return alert("請至少選擇一個特徵標籤");

    switchView('view-loading');

    const hName  = await hashData(name);
    const hPhone = await hashData(phoneClean);

    const payload = {
        action:    "report",
        type:      currentReportType,
        hName,
        hPhone,
        ageRange:  age,
        tags:      Array.from(selectedTags),
        timestamp: new Date().toISOString()
    };

    console.log("🚀 [回報 Payload]:", payload);

    // 模擬等待 (正式上線後改為 fetch 呼叫)
    setTimeout(() => {
        alert("✅ 回報已完成加密傳輸。個資已於手機端銷毀。");
        resetApp();
    }, 1200);
}

// --- 7. 通用輔助函式 ---

/** 開啟回報視圖 */
function openReportView() {
    switchView('view-report');
    renderTags(); // 必須呼叫：標籤才會動態生成並顯示
}

/** 返回搜尋視圖，並重置所有輸入 */
function resetApp() {
    switchView('view-search');

    // 清空回報頁面的輸入內容，避免下次打開還有舊資料
    const reportName  = document.getElementById('report-name');
    const reportPhone = document.getElementById('report-phone');
    const reportAge   = document.getElementById('report-age');
    if (reportName)  reportName.value  = '';
    if (reportPhone) reportPhone.value = '';
    if (reportAge)   reportAge.value   = '';

    // 重置標籤選擇器
    selectedTags.clear();
    renderTags(); // 確保選中的高亮樣式消失

    // 隱藏申訴區塊
    const legalFooter = document.querySelector('.legal-footer');
    if (legalFooter) legalFooter.style.display = 'none';

    // 捲動回頁面頂部（手機體驗優化）
    window.scrollTo(0, 0);
}

/** 申訴機制導向 */
function openTakedownForm() {
    alert("已啟動資料查核程序。請將異議說明連同相關證明發送至申訴信箱，我們將於 72 小時內完成查核並暫時隱藏有爭議之資訊。");
}

// --- 8. 即時數據儀表板更新 ---
async function updateLiveStats() {
    try {
        // 正式上線時，將此 URL 替換為你的 GAS Web App URL
        // const GAS_URL = "你的_GAS_部署網址";
        // const response = await fetch(`${GAS_URL}?action=getStats`);
        // const data = await response.json();

        // 暫時模擬從後端抓取的動態行為
        const simulatedData = {
            courtCount: 5012345,
            userCount:  1204
        };

        document.getElementById('stat-court-num').innerText = simulatedData.courtCount.toLocaleString();
        document.getElementById('stat-user-num').innerText  = simulatedData.userCount.toLocaleString();
        console.log("📊 儀表板數據已同步更新");
    } catch (error) {
        console.error("無法更新儀表板數據:", error);
        document.getElementById('stat-court-num').innerText = '—';
        document.getElementById('stat-user-num').innerText  = '—';
    }
}

// --- 9. 初始化（只定義一次） ---
window.onload = () => {
    switchView('view-search'); // 初始只顯示搜尋畫面
    renderTags();              // 預渲染標籤
    updateLiveStats();         // 更新儀表板
};
