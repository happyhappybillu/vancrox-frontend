/* ===========================
   VANCROX Frontend Auth (FINAL)
   Works with Backend Routes:
   POST /api/auth/register/investor
   POST /api/auth/register/trader
   POST /api/auth/login
   GET  /api/auth/me
   =========================== */

const API_BASE = "https://vancrox-backend.onrender.com";

// ---------- Helpers ----------
function $(id) {
  return document.getElementById(id);
}

function showMsg(type, text) {
  const msg = $("msg");
  if (!msg) return alert(text);

  msg.className = "msg show " + (type === "ok" ? "ok" : "err");
  msg.innerText = text;
}

function saveAuth(data) {
  // expected: { success, token, role, uid/tid }
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
  window.location.href = "./login.html";
}

function redirectDashboard(role) {
  if (role === "investor") window.location.href = "./investor-dashboard.html";
  else if (role === "trader") window.location.href = "./trader-dashboard.html";
  else window.location.href = "./login.html";
}

// ---------- Route Protection ----------
function requireAuth(role) {
  const auth = getAuth();

  if (!auth || !auth.token || !auth.role) {
    window.location.href = "./login.html";
    return;
  }

  if (role && auth.role !== role) {
    redirectDashboard(auth.role);
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

  return { ok: res.ok, data };
}

/* ===========================
   REGISTER (Investor/Trader)
   =========================== */
async function handleRegister(e) {
  e.preventDefault();

  const role = $("role")?.value?.trim(); // investor/trader
  const name = $("name")?.value?.trim();
  const email = $("email")?.value?.trim();
  const mobile = $("mobile")?.value?.trim();
  const password = $("password")?.value?.trim();

  if (!role || !name || !password || (!email && !mobile)) {
    showMsg("err", "Please fill all details correctly.");
    return;
  }

  try {
    const payload = { name, email, mobile, password };

    const endpoint =
      role === "trader"
        ? "/api/auth/register/trader"
        : "/api/auth/register/investor";

    const { ok, data } = await api(endpoint, "POST", payload);

    if (!ok) {
      return showMsg("err", data?.message || "Registration failed.");
    }

    saveAuth({
      token: data.token,
      role: data.role,
      uid: data.uid || null,
      tid: data.tid || null,
    });

    showMsg("ok", "Registered successfully ✅ Redirecting...");
    setTimeout(() => redirectDashboard(data.role), 600);
  } catch (err) {
    showMsg("err", "Server error. Try again.");
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
    showMsg("err", "Enter Email/Mobile & Password.");
    return;
  }

  try {
    const payload = { emailOrMobile, password };

    const { ok, data } = await api("/api/auth/login", "POST", payload);

    if (!ok) {
      return showMsg("err", data?.message || "Invalid credentials.");
    }

    saveAuth({
      token: data.token,
      role: data.role,
      uid: data.uid || null,
      tid: data.tid || null,
    });

    showMsg("ok", "Login successful ✅ Redirecting...");
    setTimeout(() => redirectDashboard(data.role), 600);
  } catch (err) {
    showMsg("err", "Server error. Try again.");
  }
}

/* ===========================
   AUTO BIND
   =========================== */
document.addEventListener("DOMContentLoaded", () => {
  // logout button support
  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // login page
  const loginForm = $("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  // register page (single form)
  const regForm = $("registerInvestorForm") || $("registerForm");
  if (regForm) regForm.addEventListener("submit", handleRegister);

  // protect dashboards
  if (window.location.pathname.includes("investor-dashboard.html")) {
    requireAuth("investor");
  }
  if (window.location.pathname.includes("trader-dashboard.html")) {
    requireAuth("trader");
  }
});
