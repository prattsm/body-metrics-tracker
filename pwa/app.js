const APP_VERSION = "pwa-0.0.8";
const RELAY_URL_DEFAULT = "https://body-metrics-relay.bodymetricstracker.workers.dev";
const PROFILE_KEY = "bmt_pwa_profile_v1";
const statusEl = document.getElementById("status");
const pushStatusEl = document.getElementById("pushStatus");
const displayNameInput = document.getElementById("displayName");
const friendCodeInput = document.getElementById("friendCode");
const saveProfileBtn = document.getElementById("saveProfile");
const copyCodeBtn = document.getElementById("copyCode");
const reconnectRelayBtn = document.getElementById("reconnectRelay");
const resetIdentityBtn = document.getElementById("resetIdentity");
const relayUrlInput = document.getElementById("relayUrl");
const appVersionEl = document.getElementById("appVersion");
const refreshAssetsBtn = document.getElementById("refreshAssets");
const testRelayBtn = document.getElementById("testRelay");
const copyDebugBtn = document.getElementById("copyDebug");
const debugLogEl = document.getElementById("debugLog");
const enablePushBtn = document.getElementById("enablePush");
const testPushBtn = document.getElementById("testPush");

let profile = null;
let serviceWorkerRegistration = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function setPushStatus(message) {
  pushStatusEl.textContent = message;
}

function sanitizeUrl(value) {
  return value.replace(/[\s\u200B-\u200D\uFEFF]/g, "");
}

function getRelayUrl() {
  const override = typeof window.BMT_RELAY_URL === "string" ? window.BMT_RELAY_URL : "";
  const raw = sanitizeUrl((override || RELAY_URL_DEFAULT).toString().trim());
  let url = raw || RELAY_URL_DEFAULT;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

function describeValue(value) {
  const safe = String(value);
  const codes = Array.from(safe).map((char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join(" ");
  return `${safe} [${codes}]`;
}

function formatError(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  const name = err.name ? `${err.name}: ` : "";
  return `${name}${err.message || err}`;
}

const debugEntries = [];

function logDebug(message) {
  const entry = `${new Date().toISOString()} ${message}`;
  debugEntries.push(entry);
  if (debugEntries.length > 20) {
    debugEntries.shift();
  }
  if (debugLogEl) {
    debugLogEl.textContent = debugEntries.join("\n");
  }
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function saveProfile(next) {
  profile = next;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function uuidToBytes(uuid) {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE = ALPHABET.length;

function encodeBase58(bytes) {
  let digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      const value = digits[i] * 256 + carry;
      digits[i] = value % BASE;
      carry = Math.floor(value / BASE);
    }
    while (carry) {
      digits.push(carry % BASE);
      carry = Math.floor(carry / BASE);
    }
  }
  let zeros = 0;
  for (const byte of bytes) {
    if (byte === 0) zeros += 1;
    else break;
  }
  let result = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) {
    result += ALPHABET[digits[i]];
  }
  return result;
}

function formatFriendCode(code) {
  const groups = [];
  for (let i = 0; i < code.length; i += 6) {
    groups.push(code.slice(i, i + 6));
  }
  return groups.join("-");
}

function createProfile(name) {
  const userId = crypto.randomUUID();
  const friendCode = encodeBase58(uuidToBytes(userId));
  return {
    user_id: userId,
    friend_code: friendCode,
    display_name: name || "User",
    token: null,
  };
}

async function apiRequest(path, { method = "GET", token = null, payload = null } = {}) {
  let baseUrl;
  try {
    baseUrl = getRelayUrl();
  } catch (err) {
    throw err;
  }
  logDebug(`request ${method} base=${describeValue(baseUrl)} path=${describeValue(path)}`);
  let url = baseUrl;
  if (path) {
    if (!path.startsWith("/")) {
      url += "/";
    }
    url += path;
  }
  logDebug(`request url=${describeValue(url)}`);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  let body = null;
  if (payload) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(payload);
  }
  if (token) {
    const cleanToken = String(token).trim();
    if (cleanToken) {
      headers.set("Authorization", `Bearer ${cleanToken}`);
    }
  }
  let response;
  try {
    response = await fetch(url, { method, headers, body, mode: "cors", credentials: "omit" });
  } catch (err) {
    logDebug(`fetch error: ${formatError(err)} url=${describeValue(url)}`);
    throw new Error(`${formatError(err)} (${describeValue(url)})`);
  }
  logDebug(`response status=${response.status} content-type=${response.headers.get("content-type") || ""}`);
  if (!response.ok) {
    let detail = "";
    try {
      const text = await response.text();
      if (text) {
        const data = JSON.parse(text);
        if (data && data.error) {
          detail = data.error;
        } else {
          detail = text;
        }
      }
    } catch (err) {
      detail = "";
    }
    const message = detail ? `${response.status} ${response.statusText} (${detail})` : `${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  if (response.status === 204) {
    return {};
  }
  const rawText = await response.text();
  if (!rawText) {
    return {};
  }
  try {
    return JSON.parse(rawText);
  } catch (err) {
    logDebug(`json parse error: ${formatError(err)} body=${rawText.slice(0, 200)}`);
    throw new Error(`Invalid JSON response: ${rawText.slice(0, 200)}`);
  }
}

async function ensureProfile() {
  profile = loadProfile();
  if (!profile) {
    profile = createProfile("User");
    saveProfile(profile);
  }
  displayNameInput.value = profile.display_name || "";
  friendCodeInput.value = formatFriendCode(profile.friend_code);

  if (!profile.token) {
    await registerProfile();
  }
}

async function updateProfile() {
  if (!profile) return;
  if (!profile.token) {
    await registerProfile();
    if (!profile.token) {
      return;
    }
  }
  const name = displayNameInput.value.trim() || "User";
  profile.display_name = name;
  saveProfile(profile);
  await apiRequest("/v1/profile", {
    method: "POST",
    token: profile.token,
    payload: { display_name: name, avatar_b64: null },
  });
  setStatus("Profile updated.");
}

async function registerProfile() {
  if (!profile) {
    return;
  }
  logDebug("register start");
  setStatus("Registering with relay...");
  try {
    const result = await apiRequest("/v1/register", {
      method: "POST",
      payload: {
        user_id: profile.user_id,
        friend_code: profile.friend_code,
        display_name: profile.display_name || "User",
      },
    });
    profile.token = result.token;
    saveProfile(profile);
    logDebug(`register ok token=${profile.token ? profile.token.length : 0}`);
    if (result.reissued) {
      setStatus("Relay token reissued.");
    } else {
      setStatus("Relay registration complete.");
    }
  } catch (err) {
    const message = String(err.message || err);
    if (message.includes("friend_code already registered")) {
      setStatus("Relay token missing. Reset your friend code to reconnect.");
    } else if (message.includes("user_id already registered")) {
      setStatus("Relay token missing. Use Reconnect relay to reissue.");
    } else {
      setStatus(`Relay registration failed: ${message}`);
    }
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    setPushStatus("Service workers not supported in this browser.");
    return null;
  }
  serviceWorkerRegistration = await navigator.serviceWorker.register("/sw.js");
  return serviceWorkerRegistration;
}

async function getVapidPublicKey() {
  const result = await apiRequest("/v1/push/vapid");
  if (!result.public_key) {
    throw new Error("Relay did not return a VAPID public key.");
  }
  return result.public_key;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function ensurePushSubscription() {
  await ensureProfile();
  if (!profile || !profile.token) {
    throw new Error("Missing relay token.");
  }
  if (!serviceWorkerRegistration) {
    await registerServiceWorker();
  }
  if (!serviceWorkerRegistration) {
    return;
  }
  const existing = await serviceWorkerRegistration.pushManager.getSubscription();
  if (existing) {
    setPushStatus("Notifications already enabled.");
    return existing;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    setPushStatus("Notification permission denied.");
    return null;
  }
  const publicKey = await getVapidPublicKey();
  const subscription = await serviceWorkerRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  const json = subscription.toJSON();
  await apiRequest("/v1/push/subscribe", {
    method: "POST",
    token: profile.token,
    payload: {
      endpoint: subscription.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  });
  setPushStatus("Notifications enabled.");
  return subscription;
}

async function sendTestPush() {
  if (!profile || !profile.token) {
    throw new Error("Missing relay token.");
  }
  await apiRequest("/v1/push/test", {
    method: "POST",
    token: profile.token,
  });
  setPushStatus("Test push sent. Check your notifications.");
}

function bindEvents() {
  if (appVersionEl) {
    appVersionEl.textContent = APP_VERSION;
  }

  saveProfileBtn.addEventListener("click", async () => {
    try {
      await updateProfile();
    } catch (err) {
      setStatus(`Profile update failed: ${formatError(err)}`);
    }
  });

  copyCodeBtn.addEventListener("click", () => {
    const code = friendCodeInput.value.trim();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setStatus("Friend code copied.");
  });

  reconnectRelayBtn.addEventListener("click", async () => {
    try {
      await registerProfile();
      if (profile && profile.token) {
        setPushStatus("Relay connected. Enable notifications.");
      }
    } catch (err) {
      setStatus(`Relay registration failed: ${formatError(err)}`);
    }
  });

  resetIdentityBtn.addEventListener("click", async () => {
    if (!confirm("Reset your friend code? This will create a new identity.")) {
      return;
    }
    profile = createProfile(displayNameInput.value.trim() || "User");
    saveProfile(profile);
    displayNameInput.value = profile.display_name;
    friendCodeInput.value = formatFriendCode(profile.friend_code);
    try {
      await registerProfile();
    } catch (err) {
      setStatus(`Relay registration failed: ${formatError(err)}`);
    }
  });

  refreshAssetsBtn.addEventListener("click", async () => {
    try {
      if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (_err) {
      // best-effort
    } finally {
      location.reload();
    }
  });

  copyDebugBtn.addEventListener("click", () => {
    if (!debugEntries.length) {
      setStatus("Debug log is empty.");
      return;
    }
    navigator.clipboard.writeText(debugEntries.join("\n"));
    setStatus("Debug log copied.");
  });

  testRelayBtn.addEventListener("click", async () => {
    try {
      logDebug("ping start");
      const result = await apiRequest("/v1/ping");
      logDebug(`ping ok ${JSON.stringify(result)}`);
      setStatus(`Relay ok: ${JSON.stringify(result)}`);
    } catch (err) {
      logDebug(`ping failed ${formatError(err)}`);
      setStatus(`Relay test failed: ${formatError(err)}`);
    }
  });

  enablePushBtn.addEventListener("click", async () => {
    try {
      await ensurePushSubscription();
    } catch (err) {
      setPushStatus(`Enable failed: ${formatError(err)}`);
    }
  });

  testPushBtn.addEventListener("click", async () => {
    try {
      await sendTestPush();
    } catch (err) {
      setPushStatus(`Test failed: ${formatError(err)}`);
    }
  });
}

async function init() {
  bindEvents();
  await registerServiceWorker();
  if (relayUrlInput) {
    try {
      relayUrlInput.value = getRelayUrl();
    } catch (_err) {
      relayUrlInput.value = "";
    }
  }
  logDebug(`BMT_RELAY_URL type=${typeof window.BMT_RELAY_URL} value=${describeValue(window.BMT_RELAY_URL || "")}`);
  try {
    await ensureProfile();
    setStatus("Ready.");
  } catch (err) {
    setStatus(`Setup failed: ${err.message}`);
  }

  if (!profile || !profile.token) {
    let relayHint = "";
    try {
      relayHint = ` (${getRelayUrl()})`;
    } catch (_err) {
      relayHint = "";
    }
    setPushStatus(`Relay not connected. Use Reconnect relay.${relayHint}`);
    return;
  }

  if (!window.matchMedia("(display-mode: standalone)").matches) {
    setPushStatus("Install to Home Screen for notifications.");
  } else if (Notification.permission === "granted") {
    setPushStatus("Notifications enabled.");
  } else {
    setPushStatus("Notifications not enabled yet.");
  }
}

init();
