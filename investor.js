/* =========================
   VANCROX • INVESTOR DASHBOARD
========================= */

/* 🔐 Protect page FIRST */
requireAuth("investor");

/* ================= CONFIG ================= */
const API_BASE = window.API_BASE ||"https://vancrox-backend.onrender.com";

/* ================= ELEMENTS ================= */
const screen = document.getElementById("screen");
const modal = document.getElementById("modal");
const modalCard = document.getElementById("modalCard");
const toast = document.getElementById("toast");

/* ================= HELPERS ================= */
function showToast(msg){
  if (!toast) return alert(msg);
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function openModal(html){
  if (!modal || !modalCard) return;
  modalCard.innerHTML = html;
  modal.classList.remove("hidden");
}

function closeModal(){
  if (!modal || !modalCard) return;
  modal.classList.add("hidden");
  modalCard.innerHTML = "";
}

if (modal){
  modal.onclick = e => {
    if (e.target.id === "modal") closeModal();
  };
}

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
document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ DOM READY");
  await init();
});

async function init(){
  try {
    console.log("🚀 INIT START");

    const me = await api("/api/auth/me", "GET", null, true);
    console.log("👤 ME RESPONSE:", me);

    if (!me.ok || !me.data?.user){
      showToast("Session expired");
      return logout();
    }

    if (me.data.user.role !== "investor"){
      showToast("Unauthorized");
      return logout();
    }

    state.user = me.data.user;

    /* ✅ SAFE DOM SET */
    const nameEl = document.getElementById("userName");
    const idEl = document.getElementById("userId");

    if (nameEl) nameEl.innerText = state.user.name || "Investor";
    if (idEl) idEl.innerText = "UID" + (state.user.uid || "----");

    await loadAll();
  }
  catch (err){
    console.error("❌ INIT ERROR:", err);
    showToast("Initialization failed");
  }
}

/* ================= LOAD ALL ================= */
async function loadAll(){
  try {
    console.log("📡 Loading dashboard data...");

    await Promise.all([
      loadHistory(),
      loadTopTraders(),
      loadMyTrades(),
      loadAddresses()
    ]);

    console.log("✅ All data loaded");
    render();
  }
  catch (err){
    console.error("❌ LOAD ALL ERROR:", err);
    showToast("Loading failed");
  }
}

/* ================= LOADERS ================= */
async function loadHistory(){
  try {
    const r = await api("/api/investor/history", "GET", null, true);
    state.history = r.data?.tx || [];

    let bal = 0;

    state.history.forEach(t => {
      if (t.status !== "SUCCESS") return;
      if (t.type === "DEPOSIT") bal += t.amount;
      if (t.type === "WITHDRAW") bal -= t.amount;
      if (t.type === "PROFIT_CREDIT") bal += t.amount;
    });

    state.balance = bal;
  }
  catch (err){
    console.error("❌ History load error:", err);
    state.history = [];
    state.balance = 0;
  }
}

async function loadTopTraders(){
  try {
    const r = await api("/api/investor/top-traders", "GET", null, true);
    state.topTraders = r.data?.ads || [];
  }
  catch (err){
    console.error("❌ Top traders error:", err);
    state.topTraders = [];
  }
}

async function loadMyTrades(){
  try {
    const r = await api("/api/investor/my-traders", "GET", null, true);
    state.myTrades = r.data?.list || [];
  }
  catch (err){
    console.error("❌ My trades error:", err);
    state.myTrades = [];
  }
}

async function loadAddresses(){
  try {
    const r = await api("/api/investor/system-address", "GET", null, true);
    state.addresses = r.data?.addresses || {};
  }
  catch (err){
    console.error("❌ Address load error:", err);
    state.addresses = {};
  }
}

/* ================= NAV ================= */
function goTab(tab){
  state.tab = tab;

  document.querySelectorAll(".nav-item")
    .forEach(b => b.classList.remove("active"));

  document.getElementById(
    "nav" + tab.charAt(0).toUpperCase() + tab.slice(1)
  )?.classList.add("active");

  render();
}

/* ================= RENDER ================= */
function render(){
  if (!screen) return;

  if (state.tab === "home") renderHome();
  if (state.tab === "chart") renderChart();
  if (state.tab === "traders") renderMyTrades();
  if (state.tab === "history") renderHistory();
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
        state.topTraders.length === 0
        ? `<div class="empty">No any traders active</div>`
        : state.topTraders.map(t => `
          <div class="trader-card">
            <div>
              <div class="t-name">${t.traderId?.name || "Trader"}</div>
              <div class="t-sub">Trade Amount $${t.minAmount}</div>
            </div>
            <div>
              <div class="t-return">${t.profitPercent}%</div>
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
    <div class="chart-card">
      <iframe src="https://s.tradingview.com/widgetembed/?symbol=XAUUSD&interval=15&theme=dark"></iframe>
    </div>
  `;
}

/* ================= MY TRADES ================= */
function renderMyTrades(){
  screen.innerHTML = state.myTrades.length === 0
    ? `<div class="empty">No trades yet</div>`
    : state.myTrades.map(t => `
        <div class="trade-card">
          <div>${t.traderId?.name || "Trader"}</div>
          <div>$${t.amount}</div>
        </div>
      `).join("");
}

/* ================= HISTORY ================= */
function renderHistory(){
  screen.innerHTML = state.history.length === 0
    ? `<div class="empty">No history</div>`
    : state.history.map(h => `
        <div class="history-card">
          <div>${h.type}</div>
          <div>$${h.amount}</div>
        </div>
      `).join("");
}

/* ================= ACTIONS ================= */
function hireTrader(adId){
  openModal(`
    <h3>Confirm Trade</h3>
    <button class="btn full" onclick="confirmHire('${adId}')">Confirm</button>
  `);
}

async function confirmHire(adId){
  const r = await api("/api/investor/hire", "POST", { traderAdId: adId }, true);
  if (!r.ok) return showToast(r.data?.message || "Failed");

  closeModal();
  showToast("Trade started");
  await loadAll();
}

/* ================= MODALS ================= */
function openDeposit(){
  openModal(`<pre>${JSON.stringify(state.addresses, null, 2)}</pre>`);
}

function openWithdraw(){
  openModal(`<p>Withdraw request will be pending until admin approval</p>`);
}

/* ================= LOGOUT ================= */
function logout(){
  localStorage.removeItem("vancrox_auth");
  location.href = "./login.html";
}