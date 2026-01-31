/* ===========================
   VANCROX Frontend Auth (FINAL)
   ✅ role detect + correct dashboard
   ✅ auto fetch /me to store name + uid/tid
   ✅ investor/trader dashboard protection
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

// ---------- API ----------
async function api(path, method = "GET", body = null, withAuth = false) {
  const headers = { "Content-Type": "application/json" };

  if (withAuth) {
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

// ✅ Fetch real user data after login/register
async function syncMe() {
  const a = getAuth();
  if (!a?.token) return null;

  const { ok, data } = await api("/api/auth/me", "GET", null, true);
  if (!ok) return null;

  // backend: { success:true, user:{} }
  const user = data?.user || null;
  if (!user) return null;

  const updated = {
    ...a,
    role: user.role || a.role,
    name: user.name || a.name || "",
    email: user.email || a.email || "",
    mobile: user.mobile || a.mobile || "",
    uid: user.uid || a.uid || 0,
    tid: user.tid || a.tid || 0,
  };

  saveAuth(updated);
  return updated;
}

// ---------- Route Protection ----------
async function requireAuth(role) {
  const auth = getAuth();

  if (!auth || !auth.token || !auth.role) {
    window.location.href = "./login.html";
    return;
  }

  // ✅ auto refresh user profile data
  await syncMe();

  const refreshed = getAuth();

  if (role && refreshed?.role !== role) {
    redirectDashboard(refreshed?.role);
  }
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
      return showMsg("err", data?.message || "Invalid");
    }

    // ✅ Save token + role
    saveAuth({
      token: data.token,
      role: data.role,
      uid: data.uid || 0,
      tid: data.tid || 0,
      name: "", // will update from /me
    });

    // ✅ Sync full profile (name, uid/tid correct)
    await syncMe();

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
    showMsg("err", "Invalid");
    return;
  }

  try {
    const payload = { emailOrMobile, password };

    const { ok, data } = await api("/api/auth/login", "POST", payload);

    if (!ok) {
      return showMsg("err", data?.message || "Invalid");
    }

    // ✅ Save basic auth
    saveAuth({
  token: data.token,
  role: data.role,
  uid: data.uid || null,
  tid: data.tid || null,
  user: {
    name: data.name || "",
    email: data.email || "",
    mobile: data.mobile || "",
    uid: data.uid || 0,
    tid: data.tid || 0,
    role: data.role
  }
});

    // ✅ Always refresh from /me (final source of truth)
    await syncMe();

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

  // register page
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