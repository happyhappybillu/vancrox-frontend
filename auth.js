/* ===========================
   VANCROX Frontend Auth (FINAL)
   ✔ Single source of truth
   ✔ Register + Login
   ✔ Role detect (investor / trader)
   ✔ Correct dashboard redirect
   ✔ Dashboard protection
   =========================== */

const API_BASE = "https://vancrox-backend.onrender.com";

/* ---------- Helpers ---------- */
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
    return JSON.parse(localStorage.getItem("vancrox_auth"));
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem("vancrox_auth");
  window.location.href = "./login.html";
}

function redirectDashboard(role) {
  if (role === "investor") {
    window.location.href = "./investor-dashboard.html";
  } else if (role === "trader") {
    window.location.href = "./trader-dashboard.html";
  } else {
    window.location.href = "./login.html";
  }
}

/* ---------- API Helper ---------- */
async function api(path, method = "GET", body = null, withAuth = false) {
  const headers = { "Content-Type": "application/json" };
  if (withAuth) {
    const a = getAuth();
    if (a?.token) headers.Authorization = `Bearer ${a.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/* ---------- Sync real profile ---------- */
async function syncMe() {
  const a = getAuth();
  if (!a?.token) return;

  const { ok, data } = await api("/api/auth/me", "GET", null, true);
  if (!ok || !data?.user) return;

  saveAuth({
    token: a.token,
    role: data.user.role,
    uid: data.user.uid || null,
    tid: data.user.tid || null,
    name: data.user.name || "",
    email: data.user.email || "",
    mobile: data.user.mobile || "",
  });
}

/* ---------- Route Protection ---------- */
async function requireAuth(role) {
  const auth = getAuth();
  if (!auth || !auth.token || !auth.role) {
    window.location.href = "./login.html";
    return;
  }

  await syncMe();
  const fresh = getAuth();

  if (role && fresh.role !== role) {
    redirectDashboard(fresh.role);
  }
}

/* ===========================
   REGISTER
   =========================== */
async function handleRegister(e) {
  e.preventDefault();

  const role = $("role").value;
  const name = $("name").value.trim();
  const email = $("email").value.trim();
  const mobile = $("mobile").value.trim();
  const password = $("password").value.trim();

  if (!role || !name || !password || (!email && !mobile)) {
    return showMsg("err", "Fill all required details");
  }

  const endpoint =
    role === "trader"
      ? "/api/auth/register/trader"
      : "/api/auth/register/investor";

  const { ok, data } = await api(endpoint, "POST", {
    name,
    email,
    mobile,
    password,
  });

  if (!ok) {
    return showMsg("err", data?.message || "Registration failed");
  }

  saveAuth({
    token: data.token,
    role: data.role,
  });

  await syncMe();

  showMsg("ok", "Registered successfully ✅ Redirecting...");
  setTimeout(() => redirectDashboard(data.role), 600);
}

/* ===========================
   LOGIN
   =========================== */
async function handleLogin(e) {
  e.preventDefault();

  const emailOrMobile = $("email").value.trim();
  const password = $("password").value.trim();

  if (!emailOrMobile || !password) {
    return showMsg("err", "Credentials required");
  }

  const { ok, data } = await api("/api/auth/login", "POST", {
    emailOrMobile,
    password,
  });

  if (!ok) {
    return showMsg("err", data?.message || "Login failed");
  }

  saveAuth({
    token: data.token,
    role: data.role,
  });
localStorage.setItem("token", data.token);
localStorage.setItem("role", data.role);

if (data.uid) {
  localStorage.setItem("uid", data.uid);
}
if (data.tid) {
  localStorage.setItem("tid", data.tid);
}

  await syncMe();

  showMsg("ok", "Login successful ✅ Redirecting...");
  setTimeout(() => redirectDashboard(data.role), 600);
}

/* ===========================
   AUTO BIND
   =========================== */
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = $("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const registerForm = $("registerForm");
  if (registerForm) registerForm.addEventListener("submit", handleRegister);

  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  if (location.pathname.includes("investor-dashboard.html")) {
    requireAuth("investor");
  }
  if (location.pathname.includes("trader-dashboard.html")) {
    requireAuth("trader");
  }
});