/* =========================================================
   TRADER DASHBOARD – FRONTEND JS (FINAL)
   Project: VANCROX
   Role: Trader
   ========================================================= */

const API = "https://vancrox-backend.onrender.com";
const TOKEN = localStorage.getItem("token");

if (!TOKEN) {
  alert("Session expired. Please login again.");
  location.href = "./login.html";
}

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

async function api(path, method = "GET", body) {
  const r = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + TOKEN,
    },
    body: body ? JSON.stringify(body) : null,
  });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, data: d };
}

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
  const me = await api("/api/auth/me");
  if (!me.ok || me.data.user.role !== "trader") {
    alert("Unauthorized access");
    location.href = "./login.html";
    return;
  }

  state.trader = me.data.user;
  document.getElementById("tName").innerText = state.trader.name;
  document.getElementById("tId").innerText = "TID" + state.trader.tid;

  await loadTraderStatus();
  render();
})();

/* =========================================================
   LOAD STATUS
========================================================= */
async function loadTraderStatus() {
  const r = await api("/api/trader/status");
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
          Your 2-year trading history is under review by the System Team.
        </p>
      </div>
    `;
    return;
  }

  if (state.historyStatus === "REJECTED") {
    screen.innerHTML = `
      <div class="card center">
        <h3>Verification Rejected</h3>
        <p class="muted">
          Your trading history was rejected. Please upload again.
        </p>
        <button class="btn" onclick="renderUploadHistory()">Re-upload</button>
      </div>
    `;
    return;
  }

  // history approved → security deposit
  renderSecurityDeposit();
}

function renderUploadHistory() {
  screen.innerHTML = `
    <div class="card center">
      <h3>Upload 2 Years Trading History</h3>
      <p class="muted">PDF or Image supported</p>

      <input type="file" id="historyFile" accept="image/*,.pdf" />

      <button class="btn full" onclick="submitHistory()">Submit</button>
    </div>
  `;
}

async function submitHistory() {
  const file = document.getElementById("historyFile").files[0];
  if (!file) return showToast("Upload required");

  const proof = await fileToBase64(file);
  const r = await api("/api/trader/upload-history", "POST", { proof });

  if (!r.ok) {
    showToast(r.data?.message || "Failed");
    return;
  }

  showToast("History submitted (Pending)");
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
      <p class="muted">Minimum $100 required to unlock dashboard</p>
      <button class="btn" onclick="openSecurityDeposit()">Deposit</button>
    </div>
  `;
}

async function openSecurityDeposit() {
  const a = await api("/api/investor/system-address");
  const addr = a.data?.addresses || {};

  openModal(`
    <div class="modal-title">Security Deposit</div>

    ${["erc20","trc20","bep20"].map(n=>`
      <div class="addr-block">
        <div class="addr-title">${n.toUpperCase()}</div>
        <div class="addr-row">
          <input readonly value="${addr[n]||""}">
          <button onclick="copyAddr('${addr[n]||""}')">Copy</button>
        </div>
      </div>
    `).join("")}

    <div class="field">
      <label>Amount</label>
      <input id="secAmt" type="number" placeholder="Minimum 100">
    </div>

    <div class="field">
      <label>Proof Image</label>
      <input id="secProof" type="file" accept="image/*">
    </div>

    <button class="btn full" onclick="submitSecurity()">Submit</button>
    <button class="btn ghost full" onclick="closeModal()">Close</button>
  `);
}

async function submitSecurity() {
  const amt = Number(document.getElementById("secAmt").value || 0);
  const file = document.getElementById("secProof").files[0];

  if (amt < 100) return showToast("Minimum is 100");
  if (!file) return showToast("Upload proof");

  const proof = await fileToBase64(file);
  const r = await api("/api/trader/security-deposit", "POST", {
    amount: amt,
    proof,
  });

  if (!r.ok) {
    showToast(r.data?.message || "Failed");
    return;
  }

  closeModal();
  showToast("Security submitted (Pending)");
  await loadTraderStatus();
  render();
}

/* =========================================================
   DASHBOARD (UNLOCKED)
========================================================= */
function renderDashboard() {
  screen.innerHTML = `
    <section class="balance-card">
      <div class="bal-label">Security Money</div>
      <div class="bal-amt">$${state.securityMoney}</div>
      <div class="bal-note">Level ${state.level} • Max Ads ${state.maxAds}</div>
    </section>

    <section class="section">
      <div class="sec-title">Create Ad</div>
      <button class="btn" onclick="openCreateAd()">Create New Ad</button>
    </section>

    <section class="section">
      <div class="sec-title">My Inventory</div>
      <div id="invList" class="empty">Loading...</div>
    </section>
  `;

  loadInventory();
}

/* =========================================================
   ADS
========================================================= */
function openCreateAd() {
  if (state.ads.length >= state.maxAds) {
    showToast("Ad limit reached");
    return;
  }

  openModal(`
    <div class="modal-title">Create Trader Ad</div>

    <div class="field">
      <label>Profit %</label>
      <input id="adPct" type="number" placeholder="Example: 25">
    </div>

    <button class="btn full" onclick="createAd()">Create</button>
    <button class="btn ghost full" onclick="closeModal()">Close</button>
  `);
}

async function createAd() {
  const pct = Number(document.getElementById("adPct").value || 0);
  if (pct <= 0) return showToast("Invalid percent");

  const r = await api("/api/trader/create-ad", "POST", { profitPercent: pct });
  if (!r.ok) return showToast(r.data?.message || "Failed");

  closeModal();
  showToast("Ad created");
}

/* =========================================================
   INVENTORY
========================================================= */
async function loadInventory() {
  const el = document.getElementById("invList");
  const r = await api("/api/trader/inventory");

  if (!r.ok) {
    el.innerHTML = "Failed";
    return;
  }

  const list = r.data.items || [];
  if (list.length === 0) {
    el.innerHTML = "No active trades";
    return;
  }

  el.innerHTML = list.map(t=>`
    <div class="trade-card">
      <b>${t.investorName}</b>
      <div>Status: ${t.status}</div>
      ${
        t.status==="WAITING_TRADER_CONFIRMATION"
        ? `<button class="btn-small" onclick="confirmTrade('${t._id}')">Confirm</button>
           <button class="btn-small ghost" onclick="rejectTrade('${t._id}')">Reject</button>`
        : ""
      }
    </div>
  `).join("");
}

async function confirmTrade(id){
  await api("/api/trader/confirm-trade","POST",{hireId:id});
  loadInventory();
}
async function rejectTrade(id){
  await api("/api/trader/reject-trade","POST",{hireId:id});
  loadInventory();
}

/* =========================================================
   UTILS
========================================================= */
function copyAddr(t){
  navigator.clipboard.writeText(t);
  showToast("Copied");
}