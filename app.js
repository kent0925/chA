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
    const views = ['view-search', 'view-loading', 'view-results', 'view-report'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== viewId);
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

// --- 4. 搜尋邏輯 ---
async function handleSearch() {
    const name = document.getElementById('in-name').value.trim();
    const area = document.getElementById('in-area').value;
    const ageRange = document.getElementById('in-age').value;
    const phone = document.getElementById('in-phone').value.trim();
    const phoneInput = document.getElementById('report-phone').value;
    // 強制只留下數字，並確保只有 4 碼
    const phoneClean = phoneInput.replace(/\D/g, '').slice(0, 4);

    if (phoneInput && phoneClean.length !== 4) {
        return alert("電話末四碼必須為 4 位數字");
    }

    if (!name || !area) return alert("姓名與地區為必填");

    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = phone ? await hashData(phone) : "";

    // 未來將此 Payload 透過 fetch 發送到 GAS Web App URL
    console.log("🚀 [搜尋 Payload]:", { action: "search", hName, hPhone, area, ageRange });

    setTimeout(() => {
        updateResultsUI(95); // 模擬演示用，未來由 GAS 回傳結果
        switchView('view-results');
    }, 1500);
}

// --- 5. 結果渲染引擎 ---
function updateResultsUI(R) {
    const scoreVal = document.querySelector('.score-value');
    const statusTag = document.querySelector('.status-tag');
    const court = document.querySelector('.court-data');
    const user = document.querySelector('.user-data');

    let cfg = { score: 5, color: 'green', text: '👼 天使小翅膀' };
    if (R > 80) cfg = { score: 99, color: 'red', text: '🦖 哥吉拉噴火' };
    else if (R > 50) cfg = { score: 60, color: 'orange', text: '💣 冒煙的引信' };
    else if (R > 20) cfg = { score: 30, color: 'yellow', text: '🐱 溫和的小貓' };

    scoreVal.innerText = cfg.score;
    scoreVal.className = 'score-value ' + cfg.color;
    statusTag.innerText = cfg.text;
    statusTag.className = 'status-tag text-' + cfg.color;
    court.className = 'result-card court-data border-' + cfg.color;
    user.className = 'result-card user-data border-' + cfg.color;

    if (cfg.score === 99) {
        court.querySelector('h3').innerText = "遷讓房屋 (112年)";
        court.querySelector('.summary').innerText = "法院判決紀錄：積欠租金逾期未還，且有破壞房屋設備事實。";
        court.querySelector('.tag-row').innerHTML = `<span class="ui-tag" data-type="high-risk">遷讓房屋</span><span class="ui-tag" data-type="damage">拆房專家</span>`;
        user.style.display = "block";
        user.querySelector('h3').innerText = "民間回報 (113年)";
        user.querySelector('.summary').innerText = "前任房東回報：生活習慣極差，雜物佔用公共走道。";
        user.querySelector('.tag-row').innerHTML = `<span class="ui-tag" data-type="env">雜物領主</span>`;
    } else {
        court.querySelector('h3').innerText = "查無不良訴訟";
        court.querySelector('.summary').innerText = "大數據中未發現此對象有重大租賃違約紀錄。";
        court.querySelector('.tag-row').innerHTML = `<span class="ui-tag" data-type="angel">誠實房客</span>`;
        user.style.display = "none";
    }
}

// --- 6. 回報系統邏輯 ---
function setReportType(type) {
    currentReportType = type;
    selectedTags.clear();

    document.getElementById('btn-report-tenant').classList.toggle('active', type === 'tenant');
    document.getElementById('btn-report-landlord').classList.toggle('active', type === 'landlord');

    const nameLabel = type === 'tenant' ? '房客姓名' : '房東姓名';
    const ageLabel = type === 'tenant' ? '房客目測年齡' : '房東目測年齡';
    document.getElementById('lbl-name').innerHTML = `${nameLabel} <span class="required">*</span>`;
    document.getElementById('lbl-age').innerHTML = `${ageLabel} <span class="required">*</span>`;

    renderTags();
}

function renderTags() {
    const goodContainer = document.getElementById('tag-container-good');
    const badContainer = document.getElementById('tag-container-bad');

    if (!goodContainer || !badContainer) return;

    // 清空舊標籤
    goodContainer.innerHTML = '';
    badContainer.innerHTML = '';

    TAG_LIBRARY[currentReportType].forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.dataset.impact = tag.impact;
        chip.innerText = tag.text;

        // 點擊邏輯
        chip.onclick = () => {
            if (selectedTags.has(tag.text)) {
                selectedTags.delete(tag.text);
                chip.classList.remove('selected');
            } else {
                selectedTags.add(tag.text);
                chip.classList.add('selected');
            }
        };

        // 分流：好標籤進 good 籃子，壞標籤進 bad 籃子
        if (tag.impact === 'good') {
            goodContainer.appendChild(chip);
        } else {
            badContainer.appendChild(chip);
        }
    });
}

async function submitReport() {
    const name = document.getElementById('report-name').value.trim();
    const age = document.getElementById('report-age').value;
    const phone = document.getElementById('report-phone').value.trim();

    if (!name || !age || phone.length !== 4) return alert("姓名、年齡、末四碼均為必填");
    if (selectedTags.size === 0) return alert("請至少選擇一個特徵標籤");

    switchView('view-loading');

    const hName = await hashData(name);
    const hPhone = await hashData(phone);

    const payload = {
        action: "report",
        type: currentReportType,
        hName: hName,
        hPhone: hPhone,
        ageRange: age,
        tags: Array.from(selectedTags),
        timestamp: new Date().toISOString()
    };

    console.log("🚀 [回報 Payload]:", payload);

    setTimeout(() => {
        alert("✅ 回報已完成加密傳輸。個資已於手機端銷毀。");
        resetApp();
    }, 1200);
}

// --- 7. 通用輔助函式 ---
// 開啟回報視圖
function openReportView() {
    switchView('view-report'); // 切換到回報房間
    renderTags();              // 💡 必須呼叫：標籤才會動態生成並顯示
}

// 返回搜尋視圖 (通常放在回報頁面的「取消」按鈕)
function resetApp() {
    switchView('view-search'); // 回到搜尋房間
    // 清空輸入框（選填，保持乾淨）
    document.querySelectorAll('input').forEach(i => i.value = '');
    selectedTags.clear();
}

// --- 8. 初始化 ---
window.onload = () => {
    switchView('view-search'); // 初始化只顯示搜尋畫面
    renderTags();
    updateLiveStats();
};
// 預設渲染一次標籤

// --- 9. 即時數據儀表板更新 ---
async function updateLiveStats() {
    try {
        // 未來正式上線時，將此 URL 替換為你的 GAS Web App URL
        // const GAS_URL = "你的_GAS_部署網址";
        // const response = await fetch(`${GAS_URL}?action=getStats`);
        // const data = await response.json();

        // 暫時模擬從後端抓取的動態行為
        const simulatedData = {
            courtCount: 5012345, // 這裡會隨著你 Sheets 增加而變動
            userCount: 1204      // 同上
        };

        // 更新 UI
        document.getElementById('stat-court-num').innerText = simulatedData.courtCount.toLocaleString();
        document.getElementById('stat-user-num').innerText = simulatedData.userCount.toLocaleString();

        console.log("📊 儀表板數據已同步更新");
    } catch (error) {
        console.error("無法更新儀表板數據:", error);
    }
}

// 修改初始化函式
window.onload = () => {
    renderTags();    // 渲染標籤
    updateLiveStats(); // 更新儀表板
};

// --- 更新結果 UI 的核心函式 ---
function updateResultsUI(data) {
    const { score, courtInfo, userInfo } = data;
    const scoreVal = document.querySelector('.score-value');
    const statusTag = document.querySelector('.status-tag');

    scoreVal.innerText = score;

    let cfg = { color: 'green', text: '🟢 履約狀況良好' };
    if (score >= 80) cfg = { color: 'red', text: '🔴 建議加強履約保證' };
    else if (score >= 50) cfg = { color: 'orange', text: '🟠 風險觀察中' };
    else if (score >= 20) cfg = { color: 'yellow', text: '🟡 輕微履約爭議' };

    scoreVal.className = `score-value ${cfg.color}`;
    statusTag.className = `status-tag text-${cfg.color}`;
    statusTag.innerText = cfg.text;

    // 2. 渲染官方卡片
    document.getElementById('res-court-title').innerText = courtInfo.title;
    document.getElementById('res-court-summary').innerText = courtInfo.summary;
    renderResultTags('res-court-tags', courtInfo.tags, 'high-risk');

    // 3. 渲染民間卡片 (關鍵：顯示你的圖案標籤)
    if (userInfo.found) {
        document.querySelector('.user-data').style.display = 'block';
        document.getElementById('res-user-summary').innerText = userInfo.summary;
        // 將後端傳回的標籤 ID 轉換為帶圖案的 HTML
        renderResultTags('res-user-tags', userInfo.tags, 'user-tag');
    } else {
        document.querySelector('.user-data').style.display = 'none';
    }
}

/**
 * 輔助函式：將標籤陣列轉換為 UI 元件
 * @param {string} containerId 容器 ID
 * @param {Array} tags 標籤文字陣列
 * @param {string} type 樣式類型
 */
function renderResultTags(containerId, tags, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // 清空
    if (!tags || tags.length === 0) return;

    tags.forEach(tagText => {
        const span = document.createElement('span');
        span.className = `ui-tag ${type}`;
        span.innerText = tagText; // 這裡的 tagText 會自帶圖案，如 "✨ 退租如新"
        container.appendChild(span);
    });
}

// 申訴機制導向
function openTakedownForm() {
    alert("已啟動資料查核程序。請將異議說明連同相關證明發送至申訴信箱，我們將於 72 小時內完成查核並暫時隱藏有爭議之資訊。");
}

// 修改 updateResultsUI，切換到結果頁面
function updateResultsUI(data) {
    // ... (原本的計分跟渲染邏輯) ...

    // 4. 顯示申訴按鈕 (只有顯示民間資料時才出現)
    if (userInfo.found) {
        document.getElementById('res-user-data').style.display = 'block';
        // 這裡的 userInfo.tags 已經是 HTML 標籤了
        document.getElementById('res-user-tags').innerHTML = userInfo.tags;

        // --- 新增：顯示申訴區塊 ---
        const footer = document.querySelector('.legal-footer');
        // 確保 footer 存在且原本是隱藏的
        if (footer) {
            footer.style.display = 'block';
        }
    } else {
        document.getElementById('res-user-data').style.display = 'none';
        // 隱藏申訴區塊
        const footer = document.querySelector('.legal-footer');
        if (footer) {
            footer.style.display = 'none';
        }
    }
}

// 修改 resetApp，記得隱藏 footer
function resetApp() {
    // ... (切換畫面邏輯) ...
    const footer = document.querySelector('.legal-footer');
    if (footer) {
        footer.style.display = 'none'; // 回到搜尋頁時隱藏申訴區塊
    }
}
