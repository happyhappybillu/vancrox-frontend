/* =====================================================
   SYSTEM CONTROL PANEL – ADMIN JS (FINAL)
   VANCROX
   ===================================================== */

/* ================= CONFIG ================= */
const API = "https://vancrox-backend.onrender.com";

/* ================= AUTH ================= */
// 🔐 auth.js already loaded in admin-panel.html
requireAuth("admin");

function getToken() {
  const a = getAuth();
  return a?.token || null;
}

/* ================= API HELPER ================= */
async function api(path, method = "GET", body) {
  const token = getToken();
  if (!token) {
    logout();
    return { ok: false };
  }

  const res = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/* ================= GLOBAL STATE ================= */
const state = {
  users: [],
  investors: [],
  traders: [],
  pending: [],
  tickets: [],
  notifications: [],
  addresses: {},
};

/* ================= NAV ================= */
function openView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.querySelector(`[data-view="${id}"]`)?.classList.add("active");
}

/* ================= DASHBOARD ================= */
async function loadDashboard() {
  const u = await api("/api/admin/users");
  if (u.ok) {
    state.users = u.data.users || [];
    state.investors = state.users.filter(x => x.role === "investor");
    state.traders = state.users.filter(x => x.role === "trader");
  }

  document.getElementById("statInvestors").innerText = state.investors.length;
  document.getElementById("statTraders").innerText = state.traders.length;
}

/* ================= USERS ================= */
async function loadInvestors() {
  const r = await api("/api/admin/users?role=investor");
  if (!r.ok) return;

  const tbody = document.getElementById("investorBody");
  tbody.innerHTML = "";

  r.data.users.forEach(u => {
    tbody.innerHTML += `
      <tr>
        <td>${u.name}</td>
        <td>UID${u.uid}</td>
        <td>${u.email || u.mobile || "-"}</td>
        <td>
          <span class="tag ${u.isBlocked ? "failed" : "success"}">
            ${u.isBlocked ? "Blocked" : "Active"}
          </span>
        </td>
        <td>
          <button onclick="toggleBlock('${u._id}', ${!u.isBlocked})">
            ${u.isBlocked ? "Unblock" : "Block"}
          </button>
        </td>
      </tr>
    `;
  });
}

async function loadTraders() {
  const r = await api("/api/admin/users?role=trader");
  if (!r.ok) return;

  const tbody = document.getElementById("traderBody");
  tbody.innerHTML = "";

  r.data.users.forEach(u => {
    tbody.innerHTML += `
      <tr>
        <td>${u.name}</td>
        <td>TID${u.tid}</td>
        <td>${u.email || "-"}</td>
        <td><span class="tag pending">Verification Pending</span></td>
        <td><button onclick="viewTrader('${u._id}')">View</button></td>
      </tr>
    `;
  });
}

async function toggleBlock(userId, block) {
  if (!confirm(block ? "Block this user?" : "Unblock this user?")) return;
  await api(`/api/admin/block/${userId}`, "POST", { block });
  loadInvestors();
  loadTraders();
}

/* ================= PENDING ================= */
async function loadPending() {
  const r = await api("/api/admin/pending");
  if (!r.ok) return;

  const tbody = document.getElementById("pendingBody");
  tbody.innerHTML = "";

  r.data.list.forEach(p => {
    tbody.innerHTML += `
      <tr>
        <td>${p.userName}</td>
        <td>${p.userCode}</td>
        <td>${p.type}</td>
        <td>$${p.amount}</td>
        <td>${new Date(p.createdAt).toLocaleString()}</td>
        <td>
          <button onclick="approve('${p._id}','${p.type}')">Approve</button>
          <button onclick="reject('${p._id}','${p.type}')">Reject</button>
        </td>
      </tr>
    `;
  });
}

async function approve(id, type) {
  await api(`/api/admin/approve-${type}`, "POST", { id });
  loadPending();
}

async function reject(id, type) {
  await api(`/api/admin/reject-${type}`, "POST", { id });
  loadPending();
}

/* ================= SUPPORT ================= */
async function loadTickets() {
  const r = await api("/api/support/all");
  if (!r.ok) return;

  const tbody = document.getElementById("supportBody");
  tbody.innerHTML = "";

  r.data.tickets.forEach(t => {
    tbody.innerHTML += `
      <tr>
        <td>${t.userCode}</td>
        <td>${t.name}</td>
        <td>${t.message.slice(0,40)}...</td>
        <td>${new Date(t.createdAt).toLocaleString()}</td>
        <td><button onclick="openTicket('${t._id}')">View</button></td>
      </tr>
    `;
  });
}

/* ================= ADDRESS ================= */
async function loadAddresses() {
  const r = await api("/api/admin/addresses");
  if (!r.ok) return;

  const d = r.data.doc || {};
  document.getElementById("erc20").value = d.erc20 || "";
  document.getElementById("trc20").value = d.trc20 || "";
  document.getElementById("bep20").value = d.bep20 || "";
}

async function saveAddresses() {
  const erc20 = erc20.value;
  const trc20 = trc20.value;
  const bep20 = bep20.value;

  await api("/api/admin/addresses", "POST", { erc20, trc20, bep20 });
  alert("Addresses updated");
}

/* ================= INIT ================= */
(async function init() {
  await loadDashboard();
  await loadInvestors();
  await loadTraders();
  await loadPending();
  await loadTickets();
  await loadAddresses();
})();