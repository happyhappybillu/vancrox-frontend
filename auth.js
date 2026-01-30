/* ===========================
   VANCROX Frontend Auth (FINAL)
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
  // Save full response in storage
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
  else if (role === "admin") window.location.href = "./admin-panel.html"; // admin direct URL se
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

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

/* ===========================
   REGISTER
   =========================== */
async function handleRegister(e) {
  e.preventDefault();

  const role = $("role")?.value?.trim(); // investor / trader
  const name = $("name")?.value?.trim();
  const email = $("email")?.value?.trim();
  const mobile = $("mobile")?.value?.trim();
  const password = $("password")?.value?.trim();

  if (!role || !name || !email || !mobile || !password) {
    return showMsg("err", "Please fill all details.");
  }

  try {
    const payload = { name, email, mobile, password };

    // ✅ correct endpoints based on role
    const endpoint =
      role === "trader"
        ? "/api/auth/register/trader"
        : "/api/auth/register/investor";

    const res = await api(endpoint, "POST", payload);

    // expected backend response:
    // { success:true, token, role, uid/tid }
    saveAuth(res);

    showMsg("ok", "Registered successfully ✅ Redirecting...");

    setTimeout(() => redirectDashboard(res.role), 600);
  } catch (err) {
    showMsg("err", err.message || "Invalid request");
  }
}

/* ===========================
   LOGIN
   =========================== */
async function handleLogin(e) {
  e.preventDefault();

  const emailOrMobile = $("email")?.value?.trim();
  const password = $("password")?.value?.trim();

  if (!emailOrMobile || !password) {
    return showMsg("err", "Enter Email/Mobile & Password.");
  }

  try {
    const payload = { emailOrMobile, password };

    const res = await api("/api/auth/login", "POST", payload);

    saveAuth(res);

    showMsg("ok", "Login success ✅ Redirecting...");

    setTimeout(() => redirectDashboard(res.role), 600);
  } catch (err) {
    showMsg("err", err.message || "Invalid");
  }
}

/* ===========================
   Auto Bind by Page
   =========================== */
document.addEventListener("DOMContentLoaded", () => {
  // logout support
  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // login page
  const loginForm = $("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  // register page
  const regForm = $("registerInvestorForm");
  if (regForm) regForm.addEventListener("submit", handleRegister);

  // protect dashboards
  if (window.location.pathname.includes("investor-dashboard.html")) {
    requireAuth("investor");
  }

  if (window.location.pathname.includes("trader-dashboard.html")) {
    requireAuth("trader");
  }
});
