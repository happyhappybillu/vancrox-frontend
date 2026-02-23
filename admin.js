/* =====================================================
   VANCROX • ADMIN PANEL (FINAL FIXED)
   ===================================================== */

const API = "https://vancrox-backend.onrender.com";

/* ================= AUTH ================= */
requireAuth("admin");

function getToken() {
  const a = getAuth();
  return a?.token || null;
}

/* ================= API HELPER ================= */
async function api(path, method = "GET", body = null) {
  const token = getToken();

  if (!token) {
    logout();
    return { ok: false, data: {} };
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

/* ================= OVERVIEW ================= */
async function loadOverview() {
  const r = await api("/api/admin/dashboard");
  if (!r.ok) return;

  statInvestors.innerText = r.data.totalInvestors || 0;
  statTraders.innerText = r.data.totalTraders || 0;
  statPending.innerText = r.data.pendingRequests || 0;
  statTickets.innerText = r.data.openTickets || 0;
}

/* ================= USERS ================= */
async function loadInvestors() {
  const r = await api("/api/admin/users?role=investor");
  if (!r.ok) return;

  investorList.innerHTML = "";

  r.data.users.forEach(u => {
    investorList.innerHTML += `
      <tr onclick="viewUser('${u._id}')">
        <td>${u.name}</td>
        <td>UID${u.uid}</td>
        <td>${u.email || "-"}</td>
        <td>$${(u.balance || 0).toFixed(2)}</td>
        <td>
          <span class="tag ${u.isBlocked ? "failed" : "success"}">
            ${u.isBlocked ? "Blocked" : "Active"}
          </span>
        </td>
        <td>
          <button onclick="event.stopPropagation(); toggleBlock('${u._id}', ${!u.isBlocked})">
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

  traderList.innerHTML = "";

  r.data.users.forEach(u => {
    traderList.innerHTML += `
      <tr onclick="viewUser('${u._id}')">
        <td>${u.name}</td>
        <td>TID${u.tid}</td>
        <td>${u.email || "-"}</td>
        <td>${u.traderVerificationStatus || "NOT_SUBMITTED"}</td>
        <td>$${(u.securityMoney || 0).toFixed(2)}</td>
        <td>$${(u.traderTotalEarning || 0).toFixed(2)}</td>
        <td>${u.traderLevel || 1}</td>
        <td>
          <button onclick="event.stopPropagation(); toggleBlock('${u._id}', ${!u.isBlocked})">
            ${u.isBlocked ? "Unblock" : "Block"}
          </button>
        </td>
      </tr>
    `;
  });
}

async function toggleBlock(userId, block) {
  await api(`/api/admin/users/${userId}/block`, "POST", { block });
  loadInvestors();
  loadTraders();
}

/* ================= USER HISTORY ================= */
async function viewUser(userId) {
  const r = await api(`/api/admin/users`);
  if (!r.ok) return;

  const user = r.data.users.find(u => u._id === userId);
  if (!user) return;

  const tx = await api(`/api/admin/transactions/pending`);

  openModal(`
    <h3>${user.name}</h3>
    <p>${user.role.toUpperCase()}</p>
    <p>ID: ${user.role === "investor" ? "UID"+user.uid : "TID"+user.tid}</p>
  `);
}

/* ================= PENDING TX ================= */
async function loadPending() {
  const r = await api("/api/admin/transactions/pending");
  if (!r.ok) return;

  pendingList.innerHTML = "";

  r.data.list.forEach(t => {
    pendingList.innerHTML += `
      <tr>
        <td>${t.userId?.name || "-"}</td>
        <td>${t.userId?.uid ? "UID"+t.userId.uid : "TID"+t.userId?.tid}</td>
        <td>${t.userId?.role}</td>
        <td>${t.type}</td>
        <td>$${t.amount}</td>
        <td>${new Date(t.createdAt).toLocaleString()}</td>
        <td>
          <button onclick="approveTx('${t._id}')">Approve</button>
          <button onclick="rejectTx('${t._id}')">Reject</button>
        </td>
      </tr>
    `;
  });
}

async function approveTx(txId) {
  await api("/api/admin/transactions/approve", "POST", { txId });
  loadPending();
}

async function rejectTx(txId) {
  await api("/api/admin/transactions/reject", "POST", { txId });
  loadPending();
}

/* ================= SUPPORT ================= */
async function loadTickets() {
  const r = await api("/api/admin/support");
  if (!r.ok) return;

  ticketList.innerHTML = "";

  r.data.list.forEach(t => {
    ticketList.innerHTML += `
      <tr>
        <td>${t.userId?.name}</td>
        <td>${t.userId?.role}</td>
        <td>${t.message}</td>
        <td>${new Date(t.createdAt).toLocaleString()}</td>
        <td>
          <button onclick="replyTicket('${t._id}')">Reply</button>
          <button onclick="resolveTicket('${t._id}')">Resolve</button>
        </td>
      </tr>
    `;
  });
}

async function replyTicket(ticketId) {
  const reply = prompt("Enter reply:");
  if (!reply) return;

  await api("/api/admin/support/reply", "POST", { ticketId, reply });
  loadTickets();
}

async function resolveTicket(ticketId) {
  await api("/api/admin/support/resolve", "POST", { ticketId });
  loadTickets();
}

/* ================= ADDRESSES ================= */
async function loadAddresses() {
  const r = await api("/api/admin/addresses");
  if (!r.ok) return;

  addrErc.value = r.data.addresses?.erc20 || "";
  addrTrc.value = r.data.addresses?.trc20 || "";
  addrBep.value = r.data.addresses?.bep20 || "";
}

async function saveAddresses() {
  await api("/api/admin/addresses", "POST", {
    erc20: addrErc.value,
    trc20: addrTrc.value,
    bep20: addrBep.value,
  });

  alert("Addresses updated ✅");
}

/* ================= NOTIFICATIONS ================= */
async function sendNotification() {
  const title = nTitle.value.trim();
  const message = nMsg.value.trim();

  if (!title || !message) return alert("Enter title & message");

  await api("/api/admin/notifications", "POST", { title, message });
  alert("Notification sent ✅");
}

/* ================= INIT ================= */
(async function init(){
  await loadOverview();
  await loadInvestors();
  await loadTraders();
  await loadPending();
  await loadTickets();
  await loadAddresses();
})();