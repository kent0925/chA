// --- 0. 核心安全金鑰 (Salt) ---
// 注意：此鹽值必須與未來後端資料庫處理時的鹽值完全一致
const SYSTEM_SALT = "TrU$t_Sca1e_8xP@qL9!mZ";

// --- 1. 加鹽雜湊函式 (SHA-256) ---
async function hashData(text) {
    if (!text) return "";
    const saltedText = text + SYSTEM_SALT; // 實作加鹽
    const msgBuffer = new TextEncoder().encode(saltedText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- 2. 視圖切換 ---
function switchView(viewId) {
    ['view-search', 'view-loading', 'view-results', 'view-report'].forEach(id => {
        document.getElementById(id).classList.toggle('hidden', id !== viewId);
    });
}

// --- 3. 搜尋行為 ---
async function handleSearch() {
    const name = document.getElementById('in-name').value.trim();
    const area = document.getElementById('in-area').value;
    const phone = document.getElementById('in-phone').value.trim();

    if (!name || !area) { return alert("姓名與地區為必填"); }

    switchView('view-loading');
    
    // 執行安全加固：個資加鹽雜湊
    const hName = await hashData(name);
    const hPhone = phone ? await hashData(phone) : "";

    console.log("🚀 [發送 Payload]", { action: "search", hName, hPhone, area });

    // 模擬網路延遲
    setTimeout(() => {
        updateResultsUI(95); // 模擬命中地雷
        switchView('view-results');
    }, 1500);
}

// --- 4. 結果渲染 ---
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

// --- 5. 舉報行為 ---
async function submitReport() {
    const name = document.getElementById('report-name').value.trim();
    const phone = document.getElementById('report-phone').value.trim();
    if (!name || phone.length !== 4) return alert("請填寫正確姓名與末四碼");

    switchView('view-loading');
    const hName = await hashData(name);
    const hPhone = await hashData(phone);
    const tags = Array.from(document.querySelectorAll('.check-item input:checked')).map(c => c.value);

    console.log("🚀 [回報 Payload]", { action: "report", hName, hPhone, tags });

    setTimeout(() => {
        alert("✅ 回報成功！個資已在手機端完成加密銷毀。");
        resetApp();
    }, 1200);
}

function openReportView() { switchView('view-report'); }

function resetApp() {
    switchView('view-search');
    document.querySelectorAll('input').forEach(i => i.value = '');
    document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    document.getElementById('in-age').value = 'ALL';
}