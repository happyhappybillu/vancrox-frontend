/* ===========================
   VANCROX Frontend Auth (FINAL)
   - Works with backend API
   - Proper redirect investor/trader
   - Strong error handling
   - Role normalize
   - UID/TID support
   =========================== */

const API_BASE = "https://vancrox-backend.onrender.com/api";
// ✅ IMPORTANT: backend me routes /api/... ke andar hain

// ---------- Helpers ----------
function $(id) {
  return document.getElementById(id);
}

function toast(msg) {
  alert(msg); // simple final
}

function saveAuth(data) {
  // expected response example:
  // { token, role, user: { uid/tid, name, email, mobile } }
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

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function redirectDashboard(role) {
  const r = normalizeRole(role);

  if (r === "investor") {
    window.location.href = "investor-dashboard.html";
    return;
  }

  if (r === "trader") {
    window.location.href = "trader-dashboard.html";
    return;
  }

  // fallback
  window.location.href = "login.html";
}

// ---------- Route Protection ----------
function requireAuth(role) {
  const auth = getAuth();
  if (!auth || !auth.role) {
    window.location.href = "login.html";
    return;
  }

  const currentRole = normalizeRole(auth.role);

  if (role && currentRole !== normalizeRole(role)) {
    redirectDashboard(currentRole);
    return;
  }
}

// ---------- API ----------
async function api(path, method = "GET", body = null, useAuth = false) {
  const headers = { "Content-Type": "application/json" };

  if (useAuth) {
    const a = getAuth();
    if (a?.token) headers["Authorization"] = `Bearer ${a.token}`;
  }

  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
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
    // backend error message
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

/* ===========================
   REGISTER (Investor/Trader)
   =========================== */
async function handleRegister(e, role) {
  e.preventDefault();

  const name = $("name")?.value?.trim();
  const email = $("email")?.value?.trim();
  const mobile = $("mobile")?.value?.trim();
  const password = $("password")?.value?.trim();

  if (!name || !email || !mobile || !password) {
    toast("Please fill all details.");
    return;
  }

  try {
    const payload = {
      name,
      email,
      mobile,
      password,
      role: normalizeRole(role), // ✅ investor/trader
    };

    // ✅ correct route: /api/auth/register
    const res = await api("/auth/register", "POST", payload);

    // ✅ Save token + role + user
    saveAuth(res);

    // ✅ show generated uid/tid if available
    const uid = res?.user?.uid || res?.user?.UID;
    const tid = res?.user?.tid || res?.user?.TID;
    if (uid || tid) {
      toast(`Registered successfully ✅\nYour ID: ${uid || tid}`);
    } else {
      toast("Registered successfully ✅");
    }

    redirectDashboard(res.role);
  } catch (err) {
    toast(err.message || "Invalid");
  }
}

/* ===========================
   LOGIN (Investor/Trader)
   =========================== */
async function handleLogin(e) {
  e.preventDefault();

  const emailOrMobile = $("email")?.value?.trim();
  const password = $("password")?.value?.trim();

  if (!emailOrMobile || !password) {
    toast("Enter Email/Mobile & Password.");
    return;
  }

  try {
    const payload = { emailOrMobile, password };

    // ✅ correct route: /api/auth/login
    const res = await api("/auth/login", "POST", payload);

    saveAuth(res);

    toast("Login success ✅");
    redirectDashboard(res.role);
  } catch (err) {
    toast(err.message || "Invalid");
  }
}

/* ===========================
   Auto Bind by Page
   =========================== */
document.addEventListener("DOMContentLoaded", () => {
  // logout
  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // login page
  const loginForm = $("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // register investor
  const regInvestor = $("registerInvestorForm");
  if (regInvestor) {
    regInvestor.addEventListener("submit", (e) =>
      handleRegister(e, "investor")
    );
  }

  // register trader
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
});
