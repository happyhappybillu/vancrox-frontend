/* ======================================================
   VANCROX • INVESTOR DASHBOARD (FINAL – STABLE)
   ✔ auth.js based
   ✔ No TOKEN bug
   ✔ All features included
   ====================================================== */
const auth = JSON.parse(localStorage.getItem("vancrox_auth") || "{}");
const TOKEN = auth.token;
// 🔐 protect page
requireAuth("investor");

/* ================= CONFIG ================= */
const API_BASE = "https://vancrox-backend.onrender.com";

/* ================= ELEMENTS ================= */
const screen = document.getElementById("screen");
const modal = document.getElementById("modal");
const modalCard = document.getElementById("modalCard");
const toast = document.getElementById("toast");

/* ================= HELPERS ================= */
function showToast(msg){
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"),2600);
}

function openModal(html){
  modalCard.innerHTML = html;
  modal.classList.remove("hidden");
}
function closeModal(){
  modal.classList.add("hidden");
  modalCard.innerHTML="";
}
modal.onclick = e=>{
  if(e.target.id==="modal") closeModal();
};

/* ================= STATE ================= */
const state = {
  tab: "home",
  user: {},
  balance: 0,
  history: [],
  topTraders: [],
  myTrades: [],
  addresses: {}
};

/* ================= INIT ================= */
(async function init(){
  const me = await api("/api/auth/me","GET",null,true);
  if(!me.ok) return logout();

  if(me.data.user.role !== "investor"){
    alert("Unauthorized");
    return logout();
  }

  state.user = me.data.user;
  document.getElementById("userName").innerText = state.user.name;
  document.getElementById("userId").innerText = "UID" + state.user.uid;

  await loadAll();
})();

/* ================= LOAD ALL ================= */
async function loadAll(){
  await loadHistory();
  await loadTopTraders();
  await loadMyTrades();
  await loadAddresses();
  render();
}

/* ================= LOADERS ================= */
async function loadHistory(){
  const r = await api("/api/investor/history","GET",null,true);
  state.history = r.data?.tx || [];

  let bal = 0;
  state.history.forEach(t=>{
    if(t.status !== "SUCCESS") return;
    if(t.type==="DEPOSIT") bal += t.amount;
    if(t.type==="WITHDRAW") bal -= t.amount;
    if(t.type==="PROFIT_CREDIT") bal += t.amount;
  });
  state.balance = bal;
}

async function loadTopTraders(){
  const r = await api("/api/investor/top-traders","GET",null,true);
  state.topTraders = r.data?.ads || [];
}

async function loadMyTrades(){
  const r = await api("/api/investor/my-traders","GET",null,true);
  state.myTrades = r.data?.list || [];
}

async function loadAddresses(){
  const r = await api("/api/investor/system-address","GET",null,true);
  state.addresses = r.data?.addresses || {};
}

/* ================= NAV ================= */
function goTab(tab){
  state.tab = tab;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
  document.getElementById("nav"+tab.charAt(0).toUpperCase()+tab.slice(1))
    ?.classList.add("active");
  render();
}

/* ================= RENDER ================= */
function render(){
  if(state.tab==="home") renderHome();
  if(state.tab==="chart") renderChart();
  if(state.tab==="traders") renderMyTrades();
  if(state.tab==="history") renderHistory();
}

/* ================= HOME ================= */
function renderHome(){
  screen.innerHTML = `
  <section class="balance-card">
    <div class="bal-top">
      <div>
        <div class="bal-label">TOTAL BALANCE</div>
        <div class="bal-amt">$${state.balance.toFixed(2)}</div>
      </div>
      <div class="shield">
        <div class="shield-title">100% Refund Guarantee</div>
        <div class="shield-sub">If trader makes loss</div>
      </div>
    </div>

    <div class="bal-actions">
      <button class="btn" onclick="openDeposit()">+ Add Money</button>
      <button class="btn ghost" onclick="openWithdraw()">Withdraw</button>
    </div>
  </section>

  <section class="section">
    <div class="sec-title">Top Traders</div>
    ${
      state.topTraders.length===0
      ? `<div class="empty">No any traders active</div>`
      : state.topTraders.map(t=>`
        <div class="trader-card">
          <div>
            <div class="t-name">${t.traderId.name}</div>
            <div class="t-sub">Trade Amount $${t.minAmount}</div>
          </div>
          <div>
            <div class="t-return">${t.profitPercent}%</div>
            <div class="t-return-sub">Expected Return</div>
            <button class="btn-small" onclick="hireTrader('${t._id}')">Hire</button>
          </div>
        </div>
      `).join("")
    }
  </section>
  `;
}

/* ================= CHART ================= */
function renderChart(){
  screen.innerHTML = `
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-head"><span>XAUUSD</span><span class="live">LIVE</span></div>
      <iframe src="https://s.tradingview.com/widgetembed/?symbol=XAUUSD&interval=15&theme=dark"></iframe>
    </div>

    <div class="chart-card">
      <div class="chart-head"><span>BTCUSDT</span><span class="live">LIVE</span></div>
      <iframe src="https://s.tradingview.com/widgetembed/?symbol=BTCUSDT&interval=15&theme=dark"></iframe>
    </div>
  </div>`;
}

/* ================= MY TRADES ================= */
function renderMyTrades(){
  screen.innerHTML = state.myTrades.length===0
  ? `<div class="empty">No trades yet</div>`
  : state.myTrades.map(t=>`
    <div class="trade-card">
      <div class="trade-top">
        <div class="trade-name">${t.traderId.name}</div>
        <div class="trade-badge">${t.status}</div>
      </div>
      <div class="trade-row">
        <span>Amount</span><span>$${t.amount}</span>
      </div>
    </div>
  `).join("");
}

/* ================= HISTORY ================= */
function renderHistory(){
  screen.innerHTML = state.history.length===0
  ? `<div class="empty">No history</div>`
  : state.history.map(h=>`
    <div class="history-card">
      <div>
        <div class="h-type">${h.type}</div>
        <div class="h-date">${new Date(h.createdAt).toLocaleString()}</div>
      </div>
      <div class="h-right">
        <div class="h-amt ${h.type==="WITHDRAW"?"red":"green"}">$${h.amount}</div>
        <div class="h-status ${h.status.toLowerCase()}">${h.status}</div>
      </div>
    </div>
  `).join("");
}

/* ================= ACTIONS ================= */
function hireTrader(adId){
  openModal(`
    <h3>Confirm Trade</h3>
    <p>This amount will be locked until trade completes.</p>
    <button class="btn full" onclick="confirmHire('${adId}')">Confirm</button>
    <button class="btn ghost full" onclick="closeModal()">Cancel</button>
  `);
}

async function confirmHire(adId){
  const r = await api("/api/investor/hire","POST",{ traderAdId: adId },true);
  if(!r.ok) return showToast(r.data?.message || "Failed");
  closeModal();
  showToast("Trade started");
  await loadAll();
}

function openDeposit(){
  openModal(`
    <h3>Deposit</h3>
    <p>Use address shown below</p>
    <pre>${JSON.stringify(state.addresses,null,2)}</pre>
  `);
}

function openWithdraw(){
  openModal(`
    <h3>Withdraw</h3>
    <p>Withdraw request will be pending until admin approval</p>
  `);
}

/* ================= LOGOUT ================= */
function logout(){
  localStorage.removeItem("vancrox_auth");
  location.href="./login.html";
}