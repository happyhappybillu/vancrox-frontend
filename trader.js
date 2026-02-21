/* =========================================================
   TRADER DASHBOARD – FRONTEND JS (FINAL – STABLE FIXED)
   Project: VANCROX
   Role: Trader
   Auth: auth.js
========================================================= */

/* 🔐 Protect page FIRST */
requireAuth("trader");

/* ================= CONFIG ================= */
const API_BASE = "https://vancrox-backend.onrender.com";

/* ================= ELEMENTS ================= */
const screen = document.getElementById("screen");
const toast = document.getElementById("toast");
const modal = document.getElementById("modal");
const modalCard = document.getElementById("modalCard");

/* ================= STATE ================= */
const state = {
  trader: {},
  historyStatus: "NOT_SUBMITTED",
  dashboardUnlocked: false,
  securityMoney: 0,
  earning: 0,
  level: 1,
  maxAds: 1,
  inventory: []
};

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
  modalCard.innerHTML = "";
}
modal.onclick = e=>{
  if(e.target.id === "modal") closeModal();
};

function fileToBase64(file){
  return new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ================= SAFE INIT ================= */
document.addEventListener("DOMContentLoaded", async () => {
  await init();
});

async function init(){

  const me = await api("/api/auth/me","GET",null,true);

  if(!me.ok){
    showToast("Session expired");
    return logout();
  }

  if(me.data.user.role !== "trader"){
    showToast("Unauthorized");
    return logout();
  }

  state.trader = me.data.user;

  document.getElementById("tName").innerText =
    state.trader.name || "Trader";

  document.getElementById("tId").innerText =
    "TID" + (state.trader.tid || "----");

  await loadStatus();
  render();
}

/* ================= LOAD STATUS ================= */
async function loadStatus(){
  const r = await api("/api/trader/status","GET",null,true);

  if(!r.ok){
    showToast("Failed to load status");
    return;
  }

  const d = r.data || {};

  state.historyStatus = d.historyStatus || "NOT_SUBMITTED";
  state.dashboardUnlocked = d.dashboardUnlocked || false;
  state.securityMoney = d.securityMoney || 0;
  state.earning = d.earning || 0;
  state.level = d.level || 1;
  state.maxAds = d.maxAds || 1;
}

/* ================= RENDER ROOT ================= */
function render(){
  if(!state.dashboardUnlocked){
    renderLockedFlow();
  } else {
    renderDashboard();
  }
}

/* ================= LOCKED FLOW ================= */
function renderLockedFlow(){

  if(state.historyStatus === "NOT_SUBMITTED"){
    screen.innerHTML = `
      <div class="card center">
        <h3>Upload 2 Years Trading History</h3>
        <p class="muted">PDF or Image required</p>
        <input type="file" id="historyFile" accept="image/*,.pdf"/>
        <button class="btn full" onclick="submitHistory()">Submit</button>
      </div>`;
    return;
  }

  if(state.historyStatus === "PENDING"){
    screen.innerHTML = `
      <div class="card center">
        <h3>Verification Pending</h3>
        <p class="muted">Admin reviewing your history</p>
      </div>`;
    return;
  }

  if(state.historyStatus === "REJECTED"){
    screen.innerHTML = `
      <div class="card center">
        <h3>Verification Rejected</h3>
        <input type="file" id="historyFile" accept="image/*,.pdf"/>
        <button class="btn full" onclick="submitHistory()">Upload Again</button>
      </div>`;
    return;
  }

  renderSecurityDeposit();
}

/* ================= HISTORY UPLOAD ================= */
async function submitHistory(){
  const file = document.getElementById("historyFile").files[0];
  if(!file) return showToast("History file required");

  const proof = await fileToBase64(file);

  const r = await api(
    "/api/trader/upload-history",
    "POST",
    { proof },
    true
  );

  if(!r.ok) return showToast(r.data?.message || "Upload failed");

  showToast("History submitted");
  await loadStatus();
  render();
}

/* ================= SECURITY ================= */
function renderSecurityDeposit(){
  screen.innerHTML = `
    <div class="card center">
      <h3>Security Deposit Required</h3>
      <p class="muted">Minimum 100 USDT</p>
      <button class="btn full" onclick="openSecurityDeposit()">Deposit Security</button>
    </div>`;
}

async function openSecurityDeposit(){

  const a = await api("/api/wallet/system-address","GET",null,true);
  const addr = a.data?.addresses || {};

  openModal(`
    <div class="modal-title">Security Deposit</div>

    ${["erc20","trc20","bep20"].map(n=>`
      <div class="addr-block">
        <label>${n.toUpperCase()}</label>
        <input readonly value="${addr[n] || ""}">
      </div>`).join("")}

    <input id="secAmt" type="number" placeholder="Amount (min 100)">
    <input id="secProof" type="file" accept="image/*">

    <button class="btn full" onclick="submitSecurity()">Submit</button>
    <button class="btn ghost full" onclick="closeModal()">Cancel</button>
  `);
}

async function submitSecurity(){

  const amt = Number(document.getElementById("secAmt").value || 0);
  const file = document.getElementById("secProof").files[0];

  if(amt < 100 || !file)
    return showToast("Invalid details");

  const proof = await fileToBase64(file);

  const r = await api(
    "/api/trader/security-deposit",
    "POST",
    { amount: amt, proof },
    true
  );

  if(!r.ok) return showToast(r.data?.message || "Submission failed");

  closeModal();
  showToast("Security submitted");

  await loadStatus();
  render();
}

/* ================= DASHBOARD ================= */
function renderDashboard(){
  screen.innerHTML = `
    <section class="balance-card">
      <div>Security: $${state.securityMoney}</div>
      <div>Earning: $${state.earning}</div>
      <div>Level ${state.level} • Max Ads ${state.maxAds}</div>
    </section>

    <section class="section">
      <button class="btn" onclick="openCreateAd()">Create Ad</button>
      <div id="invList">Loading...</div>
    </section>`;

  loadInventory();
}

/* ================= ADS ================= */
function openCreateAd(){
  openModal(`
    <div class="modal-title">Create Ad</div>
    <input id="adPct" type="number" placeholder="Profit %">
    <button class="btn full" onclick="createAd()">Create</button>
  `);
}

async function createAd(){

  const pct = Number(document.getElementById("adPct").value || 0);

  if(pct <= 0)
    return showToast("Invalid percent");

  const r = await api(
    "/api/trader/create-ad",
    "POST",
    { profitPercent: pct },
    true
  );

  if(!r.ok)
    return showToast(r.data?.message || "Failed");

  closeModal();
  showToast("Ad created");

  loadInventory();
}

/* ================= INVENTORY ================= */
async function loadInventory(){

  const el = document.getElementById("invList");

  const r = await api("/api/trader/inventory","GET",null,true);

  if(!r.ok){
    el.innerHTML = "Failed to load trades";
    return;
  }

  const list = r.data.items || [];

  el.innerHTML = list.length
    ? list.map(t=>`
      <div class="trade-card">
        <b>${t.investorName}</b>
        <div>Status: ${t.status}</div>

        ${
          t.status === "WAITING_TRADER_CONFIRMATION"
          ? `
            <button onclick="confirmTrade('${t._id}')">Confirm</button>
            <button onclick="rejectTrade('${t._id}')">Reject</button>
          `
          : ""
        }
      </div>
    `).join("")
    : "No active trades";
}

/* ================= ACTIONS ================= */
async function confirmTrade(id){
  await api("/api/trader/confirm-trade","POST",{ hireId: id },true);
  loadInventory();
}

async function rejectTrade(id){
  await api("/api/trader/reject-trade","POST",{ hireId: id },true);
  loadInventory();
}

/* ================= LOGOUT ================= */
function logout(){
  localStorage.removeItem("vancrox_auth");
  location.href="./login.html";
}