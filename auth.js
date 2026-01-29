/* ===========================
   VANCROX Auth (FULL & FINAL)
   - Register/Login
   - Role detect
   - Auto redirect dashboard
   - Works on Netlify + Render
   =========================== */

const API_BASE = "https://vancrox-backend.onrender.com/api";

// ---------- helpers ----------
function $(id) {
  return document.getElementById(id);
}

function showMsg(type, text) {
  const msg = $("msg");
  if (!msg) return alert(text);

  msg.className = "msg show " + (type === "ok" ? "ok" : "err");
  msg.innerText = text;
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function saveAuth(data) {
  // store complete response
  localStorage.setItem("vancrox_auth", JSON.stringify(data));
}

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem("vancrox_auth")) || null;
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem("vancrox_auth");
  window.location.href = "login.html";
}

function redirectDashboard(role) {
  const r = normalizeRole(role);

  if (r === "investor") return (window.location.href = "investor-dashboard.html");
  if (r === "trader") return (window.location.href = "trader-dashboard.html");
  if (r === "admin") return (window.location.href = "admin-dashboard.html");

  window.location.href = "login.html";
}

// ---------- API ----------
async function api(path, method = "GET", body = null, useAuth = false) {
  const headers = { "Content-Type": "application/json" };

  if (useAuth) {
    const a = getAuth();
    if (a?.token) headers["Authorization"] = `Bearer ${a.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data?.message || "Invalid request");
  }

  return data;
}

// ---------- ROUTE PROTECT ----------
function requireAuth(role) {
  const auth = getAuth();
  if (!auth?.token || !auth?.role) {
    window.location.href = "login.html";
    return;
  }

  const currentRole = normalizeRole(auth.role);
  if (role && currentRole !== normalizeRole(role)) {
    redirectDashboard(currentRole);
  }
}

// ---------- REGISTER ----------
async function handleRegister(e, role) {
  e.preventDefault();

  const name = $("name")?.value?.trim();
  const email = $("email")?.value?.trim();
  const mobile = $("mobile")?.value?.trim();
  const password = $("password")?.value?.trim();

  if (!name || !email || !mobile || !password) {
    showMsg("err", "Invalid input. Please try again.");
    return;
  }

  try {
    const payload = {
      name,
      email,
      mobile,
      password,
      role: normalizeRole(role),
    };

    const res = await api("/auth/register", "POST", payload);

    saveAuth(res);

    const uid = res?.user?.uid || "";
    const tid = res?.user?.tid || "";
    const showId = uid || tid;

    showMsg("ok", showId ? `Registered ✅ Your ID: ${showId}` : "Registered ✅");

    setTimeout(() => redirectDashboard(res.role), 700);
  } catch (err) {
    showMsg("err", err.message || "Invalid");
  }
}

// ---------- LOGIN ----------
async function handleLogin(e) {
  e.preventDefault();

  const emailOrMobile = $("email")?.value?.trim();
  const password = $("password")?.value?.trim();

  if (!emailOrMobile || !password) {
    showMsg("err", "Invalid input. Please try again.");
    return;
  }

  try {
    const payload = { emailOrMobile, password };

    const res = await api("/auth/login", "POST", payload);

    saveAuth(res);

    showMsg("ok", "Login successful ✅ Redirecting...");

    setTimeout(() => redirectDashboard(res.role), 700);
  } catch (err) {
    showMsg("err", err.message || "Invalid credentials");
  }
}

// ---------- AUTO BIND ----------
document.addEventListener("DOMContentLoaded", () => {
  // logout
  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // login form
  const loginForm = $("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  // register investor form
  const regInvestor = $("registerInvestorForm");
  if (regInvestor) {
    regInvestor.addEventListener("submit", (e) =>
      handleRegister(e, "investor")
    );
  }

  // register trader form
  const regTrader = $("registerTraderForm");
  if (regTrader) {
    regTrader.addEventListener("submit", (e) =>
      handleRegister(e, "trader")
    );
  }

  // protect dashboards
  const path = window.location.pathname;

  if (path.includes("investor-dashboard.html")) requireAuth("investor");
  if (path.includes("trader-dashboard.html")) requireAuth("trader");
  if (path.includes("admin-dashboard.html")) requireAuth("admin");
});
