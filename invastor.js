/* =========================
   VANCROX • INVESTOR DASHBOARD (FINAL)
========================= */

requireAuth("investor");

/* ================= CONFIG ================= */
var API_BASE = window.API_BASE || "https://vancrox-backend.onrender.com";

/* ================= ELEMENTS ================= */
const screen = document.getElementById("screen");
const modal = document.getElementById("modal");
const modalCard = document.getElementById("modalCard");
const toast = document.getElementById("toast");

const drawer = document.getElementById("drawer");
const menuBtn = document.getElementById("menuBtn");
const closeDrawer = document.getElementById("closeDrawer");

const profileBtn = document.getElementById("profileBtn");
const profilePop = document.getElementById("profilePop");

/* ================= HELPERS ================= */
function showToast(msg){
  if (!toast) return alert(msg);
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function openModal(html){
  modalCard.innerHTML = html;
  modal.classList.remove("hidden");
}

function closeModal(){
  modal.classList.add("hidden");
  modalCard.innerHTML = "";
}

modal?.addEventListener("click", e => {
  if (e.target.id === "modal") closeModal();
});

function copyText(text){
  if (!text) return;
  navigator.clipboard.writeText(text);
  showToast("Copied");
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
  initUI();
  await init();
});

function initUI(){
  menuBtn?.addEventListener("click", () => drawer.classList.add("open"));
  closeDrawer?.addEventListener("click", () => drawer.classList.remove("open"));

  profileBtn?.addEventListener("click", () => {
    profilePop.classList.toggle("open");
  });

  document.addEventListener("click", e => {
    if (!profileBtn?.contains(e.target)) {
      profilePop?.classList.remove("open");
    }
  });
}

async function init(){
  try{
    const me = await api("/api/auth/me", "GET", null, true);

    if (!me.ok || !me.data?.user){
      showToast("Session expired");
      return logout();
    }

    if (me.data.user.role !== "investor"){
      showToast("Unauthorized");
      return logout();
    }

    state.user = me.data.user;

    document.getElementById("userName").innerText =
      state.user.name || "Investor";

    document.getElementById("userId").innerText =
      "UID" + (state.user.uid || "----");

    await loadAll();
  }
  catch(err){
    console.error(err);
    showToast("Initialization failed");
  }
}

/* ================= LOAD ALL ================= */
async function loadAll(){
  await Promise.all([
    loadHistory(),
    loadTopTraders(),
    loadMyTrades(),
    loadAddresses()
  ]);

  render();
}

/* ================= LOADERS ================= */
async function loadHistory(){
  try{
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
  } catch {
    state.history = [];
    state.balance = 0;
  }
}

async function loadTopTraders(){
  try{
    const r = await api("/api/investor/top-traders", "GET", null, true);
    state.topTraders = r.data?.ads || [];
  } catch {
    state.topTraders = [];
  }
}

async function loadMyTrades(){
  try{
    const r = await api("/api/investor/my-traders", "GET", null, true);
    state.myTrades = r.data?.list || [];
  } catch {
    state.myTrades = [];
  }
}

async function loadAddresses(){
  try{
    const r = await api("/api/investor/system-address", "GET", null, true);
    state.addresses = r.data?.addresses || {};
  } catch {
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
  `;
}

/* ================= CHART ================= */
function renderChart(){
  screen.innerHTML = `
    <div class="chart-grid">
      <div class="chart-card">
        <iframe src="https://s.tradingview.com/widgetembed/?symbol=XAUUSD&interval=15&theme=dark"></iframe>
      </div>
    </div>
  `;
}
function openChart(symbol){
  openModal(`
    <div class="chart-full">
      <iframe 
        src="https://s.tradingview.com/widgetembed/?symbol=${symbol}&interval=15&theme=dark"
        allowfullscreen
      ></iframe>
    </div>
  `);
}

/* ================= HISTORY ================= */
function renderHistory(){
  screen.innerHTML = state.history.length === 0
    ? `<div class="empty">No history</div>`
    : state.history.map(h => `
        <div class="history-card">
          <div>
            <div class="h-type">${h.type}</div>
            <div class="h-date">${new Date(h.createdAt).toLocaleString()}</div>
          </div>
          <div class="h-right">
            <div class="h-amt">$${h.amount}</div>
            <div class="h-status">${h.status}</div>
          </div>
        </div>
      `).join("");
}

/* ================= MODALS ================= */

function openDeposit(){
  openModal(`
    <h3>Deposit USDT</h3>

    <label>Amount (Min 50)</label>
    <input id="depAmount" type="number"/>

    <label>Upload Proof</label>
    <input id="depProof" type="file"/>

    <button class="btn full" onclick="submitDeposit()">Submit</button>
  `);
}

async function submitDeposit(){
  const amount = Number(document.getElementById("depAmount").value);
  const file = document.getElementById("depProof").files[0];

  if (!amount || amount < 50)
    return showToast("Minimum deposit is 50 USDT");

  if (!file)
    return showToast("Upload proof");

  const reader = new FileReader();
  reader.onload = async () => {
    const r = await api("/api/wallet/deposit", "POST", {
      amount,
      proof: reader.result
    }, true);

    if (!r.ok) return showToast(r.data?.message || "Deposit failed");

    closeModal();
    showToast("Deposit submitted");
    await loadAll();
  };
  reader.readAsDataURL(file);
}

function openWithdraw(){
  openModal(`
    <h3>Withdraw USDT</h3>

    <label>Amount (Min 100)</label>
    <input id="wdAmount" type="number"/>

    <label>Withdraw Address</label>
    <input id="wdAddress"/>

    <button class="btn full" onclick="submitWithdraw()">Submit</button>
  `);
}

async function submitWithdraw(){
  const amount = Number(document.getElementById("wdAmount").value);
  const withdrawTo = document.getElementById("wdAddress").value;

  if (!amount || amount < 100)
    return showToast("Minimum withdraw is 100 USDT");

  if (!withdrawTo)
    return showToast("Enter withdraw address");

  const r = await api("/api/investor/withdraw", "POST", {
    amount,
    withdrawTo
  }, true);

  if (!r.ok) return showToast(r.data?.message || "Withdraw failed");

  closeModal();
  showToast("Withdraw request submitted");
  await loadAll();
}

/* ================= LOGOUT ================= */
function logout(){
  localStorage.removeItem("vancrox_auth");
  location.href = "./login.html";
}