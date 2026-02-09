/* =========================================================
   TRADER DASHBOARD – FRONTEND JS (FINAL – FIXED)
   Project: VANCROX
   Role: Trader
   Auth handled ONLY by auth.js
   ========================================================= */

// 🔐 protect page (auth.js must be loaded before this file)
requireAuth("trader");

/* =========================================================
   GLOBAL STATE
========================================================= */
const screen = document.getElementById("screen");
const toast = document.getElementById("toast");
const modal = document.getElementById("modal");
const modalCard = document.getElementById("modalCard");

const state = {
  trader: {},
  verified: false,
  historyStatus: "NOT_UPLOADED", // NOT_UPLOADED | PENDING | APPROVED | REJECTED
  securityMoney: 0,
  earning: 0,
  level: 1,
  maxAds: 1,
  ads: [],
  inventory: [],
};

/* =========================================================
   HELPERS
========================================================= */
function showToast(msg) {
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function openModal(html) {
  modalCard.innerHTML = html;
  modal.classList.remove("hidden");
}
function closeModal() {
  modal.classList.add("hidden");
  modalCard.innerHTML = "";
}
modal.onclick = (e) => {
  if (e.target.id === "modal") closeModal();
};

async function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* =========================================================
   INIT
========================================================= */
(async function init() {
  const r = await api("/api/auth/me", "GET", null, true);
  if (!r.ok || r.data.user.role !== "trader") {
    logout();
    return;
  }

  state.trader = r.data.user;
  document.getElementById("tName").innerText = state.trader.name;
  document.getElementById("tId").innerText = "TID" + state.trader.tid;

  await loadTraderStatus();
  render();
})();

/* =========================================================
   LOAD STATUS
========================================================= */
async function loadTraderStatus() {
  const r = await api("/api/trader/status", "GET", null, true);
  if (!r.ok) return;

  const d = r.data;

  state.historyStatus = d.historyStatus;
  state.securityMoney = d.securityMoney;
  state.earning = d.earning;
  state.level = d.level;
  state.maxAds = d.maxAds;
  state.verified = d.dashboardUnlocked;

  document.getElementById("secText").innerText =
    "$" + Number(state.securityMoney).toFixed(2);
  document.getElementById("earnText").innerText =
    "$" + Number(state.earning).toFixed(2);
  document.getElementById("levelText").innerText = "Level " + state.level;
}

/* =========================================================
   RENDER ROUTER
========================================================= */
function render() {
  if (!state.verified) {
    renderLocked();
  } else {
    renderDashboard();
  }
}

/* =========================================================
   LOCKED FLOW
========================================================= */
function renderLocked() {
  if (state.historyStatus === "NOT_UPLOADED") {
    renderUploadHistory();
    return;
  }

  if (state.historyStatus === "PENDING") {
    screen.innerHTML = `
      <div class="card center">
        <h3>Verification Pending</h3>
        <p class="muted">
          Your 2-year trading history is under review.
        </p>
      </div>`;
    return;
  }

  if (state.historyStatus === "REJECTED") {
    screen.innerHTML = `
      <div class="card center">
        <h3>Verification Rejected</h3>
        <p class="muted">Please upload again.</p>
        <button class="btn" onclick="renderUploadHistory()">Re-upload</button>
      </div>`;
    return;
  }

  renderSecurityDeposit();
}

function renderUploadHistory() {
  screen.innerHTML = `
    <div class="card center">
      <h3>Upload 2 Years Trading History</h3>
      <input type="file" id="historyFile" accept="image/*,.pdf"/>
      <button class="btn full" onclick="submitHistory()">Submit</button>
    </div>`;
}

async function submitHistory() {
  const file = document.getElementById("historyFile").files[0];
  if (!file) return showToast("Upload required");

  const proof = await fileToBase64(file);
  const r = await api("/api/trader/upload-history", "POST", { proof }, true);
  if (!r.ok) return showToast(r.data?.message || "Failed");

  showToast("History submitted");
  await loadTraderStatus();
  render();
}

/* =========================================================
   SECURITY DEPOSIT
========================================================= */
function renderSecurityDeposit() {
  screen.innerHTML = `
    <div class="card center">
      <h3>Security Money Required</h3>
      <p class="muted">Minimum $100</p>
      <button class="btn" onclick="openSecurityDeposit()">Deposit</button>
    </div>`;
}

async function openSecurityDeposit() {
  const a = await api("/api/investor/system-address", "GET", null, true);
  const addr = a.data?.addresses || {};

  openModal(`
    <div class="modal-title">Security Deposit</div>
    ${["erc20","trc20","bep20"].map(n=>`
      <div class="addr-block">
        <b>${n.toUpperCase()}</b>
        <input readonly value="${addr[n]||""}">
      </div>`).join("")}
    <input id="secAmt" type="number" placeholder="Amount">
    <input id="secProof" type="file" accept="image/*">
    <button class="btn full" onclick="submitSecurity()">Submit</button>
  `);
}

async function submitSecurity() {
  const amt = Number(document.getElementById("secAmt").value || 0);
  const file = document.getElementById("secProof").files[0];
  if (amt < 100 || !file) return showToast("Invalid input");

  const proof = await fileToBase64(file);
  const r = await api(
    "/api/trader/security-deposit",
    "POST",
    { amount: amt, proof },
    true
  );

  if (!r.ok) return showToast(r.data?.message || "Failed");

  closeModal();
  showToast("Security submitted");
  await loadTraderStatus();
  render();
}

/* =========================================================
   DASHBOARD
========================================================= */
function renderDashboard() {
  screen.innerHTML = `
    <section class="balance-card">
      <div>Security: $${state.securityMoney}</div>
      <div>Level ${state.level} • Max Ads ${state.maxAds}</div>
    </section>
    <section>
      <button class="btn" onclick="openCreateAd()">Create Ad</button>
      <div id="invList">Loading...</div>
    </section>`;
  loadInventory();
}

/* =========================================================
   ADS + INVENTORY
========================================================= */
function openCreateAd() {
  openModal(`
    <input id="adPct" type="number" placeholder="Profit %">
    <button class="btn" onclick="createAd()">Create</button>
  `);
}

async function createAd() {
  const pct = Number(document.getElementById("adPct").value || 0);
  if (pct <= 0) return showToast("Invalid %");

  const r = await api(
    "/api/trader/create-ad",
    "POST",
    { profitPercent: pct },
    true
  );

  if (!r.ok) return showToast("Failed");
  closeModal();
  showToast("Ad created");
}

async function loadInventory() {
  const el = document.getElementById("invList");
  const r = await api("/api/trader/inventory", "GET", null, true);
  if (!r.ok) return (el.innerHTML = "Failed");

  const list = r.data.items || [];
  el.innerHTML = list.length
    ? list.map(t=>`
      <div class="trade-card">
        ${t.investorName}
        ${t.status==="WAITING_TRADER_CONFIRMATION"
          ? `<button onclick="confirmTrade('${t._id}')">Confirm</button>`
          : ""}
      </div>`).join("")
    : "No trades";
}

async function confirmTrade(id){
  await api("/api/trader/confirm-trade","POST",{hireId:id},true);
  loadInventory();
}
async function rejectTrade(id){
  await api("/api/trader/reject-trade","POST",{hireId:id},true);
  loadInventory();
}