/* ===========================
   VANCROX Frontend Auth (Final)
   Works with backend API
   =========================== */

const API_BASE = "https://vancrox-backend.onrender.com"; 
// Render pe deploy ke baad isko replace kar dena:
// const API_BASE = "https://YOUR-RENDER-URL.onrender.com/api";

// ---------- Helpers ----------
function $(id) {
  return document.getElementById(id);
}

function toast(msg) {
  alert(msg); // simple final (aap chahe to premium toast bana denge)
}

function saveAuth(data) {
  // backend response expected:
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

function redirectDashboard(role) {
  if (role === "investor") {
    window.location.href = "investor-dashboard.html";
  } else if (role === "trader") {
    window.location.href = "trader-dashboard.html";
  } else {
    window.location.href = "login.html";
  }
}

// ---------- Route Protection ----------
function requireAuth(role) {
  const auth = getAuth();
  if (!auth || !auth.role) {
    window.location.href = "login.html";
    return;
  }

  if (role && auth.role !== role) {
    // wrong dashboard open kiya
    redirectDashboard(auth.role);
    return;
  }
}

// ---------- API ----------
async function api(path, method = "GET", body = null, auth = false) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const a = getAuth();
    if (a?.token) headers["Authorization"] = `Bearer ${a.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
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
    const payload = { name, email, mobile, password, role };

    // backend endpoint:
    // POST /auth/register
    const res = await api("/auth/register", "POST", payload);

    // expected response:
    // { token, role, user }
    saveAuth(res);

    toast("Registered successfully ✅");
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

    // backend endpoint:
    // POST /auth/login
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
  // Logout button support
  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // login page
  const loginForm = $("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // register page (investor)
  const regInvestor = $("registerInvestorForm");
  if (regInvestor) {
    regInvestor.addEventListener("submit", (e) => handleRegister(e, "investor"));
  }

  // register page (trader)
  const regTrader = $("registerTraderForm");
  if (regTrader) {
    regTrader.addEventListener("submit", (e) => handleRegister(e, "trader"));
  }

  // investor dashboard protect
  if (window.location.pathname.includes("investor-dashboard.html")) {
    requireAuth("investor");
  }

  // trader dashboard protect
  if (window.location.pathname.includes("trader-dashboard.html")) {
    requireAuth("trader");
  }
});
