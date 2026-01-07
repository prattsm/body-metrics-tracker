const APP_VERSION = "pwa-0.1.1";
const RELAY_URL_DEFAULT = "/relay";
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
const entryDateInput = document.getElementById("entryDate");
const entryTimeInput = document.getElementById("entryTime");
const weightInput = document.getElementById("weightInput");
const waistInput = document.getElementById("waistInput");
const noteInput = document.getElementById("noteInput");
const saveEntryBtn = document.getElementById("saveEntry");
const entryStatusEl = document.getElementById("entryStatus");
const todayStatusEl = document.getElementById("todayStatus");
const todaySummaryEl = document.getElementById("todaySummary");
const historyRangeSelect = document.getElementById("historyRange");
const historyList = document.getElementById("historyList");
const passphraseStatusEl = document.getElementById("passphraseStatus");
const unlockVaultBtn = document.getElementById("unlockVault");
const setPassphraseBtn = document.getElementById("setPassphrase");
const changePassphraseBtn = document.getElementById("changePassphrase");
const disablePassphraseBtn = document.getElementById("disablePassphrase");

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
  const isRelative = url.startsWith("/") || url.startsWith(".");
  if (!isRelative && !/^https?:\/\//i.test(url)) {
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

const DB_NAME = "bmt_pwa_db";
const DB_VERSION = 1;
const META_STORE = "meta";
const ENTRIES_STORE = "entries";
const CRYPTO_META_KEY = "crypto_meta";
const DEVICE_KEY_KEY = "device_key";
const PBKDF2_ITERATIONS = 200000;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let dbPromise = null;
let cryptoMeta = null;
let currentKey = null;
let isUnlocked = false;
let entriesCache = [];

function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(ENTRIES_STORE)) {
        const store = db.createObjectStore(ENTRIES_STORE, { keyPath: "id" });
        store.createIndex("date_local", "date_local", { unique: false });
        store.createIndex("updated_at", "updated_at", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function dbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGet(storeName, key) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, "readonly");
  return dbRequest(tx.objectStore(storeName).get(key));
}

async function dbPut(storeName, value) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, "readwrite");
  await dbRequest(tx.objectStore(storeName).put(value));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function dbDelete(storeName, key) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, "readwrite");
  await dbRequest(tx.objectStore(storeName).delete(key));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function dbGetAll(storeName) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, "readonly");
  return dbRequest(tx.objectStore(storeName).getAll());
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getDeviceKey() {
  const stored = await dbGet(META_STORE, DEVICE_KEY_KEY);
  let rawKey;
  if (stored && stored.value) {
    rawKey = base64ToBytes(stored.value);
  } else {
    rawKey = crypto.getRandomValues(new Uint8Array(32));
    await dbPut(META_STORE, { key: DEVICE_KEY_KEY, value: bytesToBase64(rawKey) });
  }
  return crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function deriveKeyFromPassphrase(passphrase, saltB64, iterations) {
  const salt = base64ToBytes(saltB64);
  const material = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPayload(payload, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipher)),
  };
}

async function decryptPayload(record, key) {
  const iv = base64ToBytes(record.iv);
  const ciphertext = base64ToBytes(record.ciphertext);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(textDecoder.decode(decrypted));
}

async function loadCryptoMeta() {
  if (cryptoMeta) {
    return cryptoMeta;
  }
  const stored = await dbGet(META_STORE, CRYPTO_META_KEY);
  if (stored && stored.value) {
    cryptoMeta = stored.value;
    return cryptoMeta;
  }
  cryptoMeta = {
    mode: "device",
    salt: null,
    iterations: PBKDF2_ITERATIONS,
    check: null,
  };
  await dbPut(META_STORE, { key: CRYPTO_META_KEY, value: cryptoMeta });
  return cryptoMeta;
}

async function saveCryptoMeta(nextMeta) {
  cryptoMeta = nextMeta;
  await dbPut(META_STORE, { key: CRYPTO_META_KEY, value: cryptoMeta });
}

async function createKeyCheck(key) {
  return encryptPayload({ check: "ok" }, key);
}

async function verifyKeyCheck(key, meta) {
  if (!meta.check) {
    meta.check = await createKeyCheck(key);
    await saveCryptoMeta(meta);
    return true;
  }
  const payload = await decryptPayload(meta.check, key);
  if (!payload || payload.check !== "ok") {
    throw new Error("Invalid passphrase.");
  }
  return true;
}

async function ensureCryptoReady() {
  const meta = await loadCryptoMeta();
  if (meta.mode === "device") {
    currentKey = await getDeviceKey();
    await verifyKeyCheck(currentKey, meta);
    isUnlocked = true;
  } else {
    isUnlocked = Boolean(currentKey);
  }
  updatePassphraseStatus();
}

async function unlockWithPassphrase(passphrase) {
  const meta = await loadCryptoMeta();
  if (meta.mode !== "passphrase") {
    return;
  }
  const key = await deriveKeyFromPassphrase(passphrase, meta.salt, meta.iterations);
  await verifyKeyCheck(key, meta);
  currentKey = key;
  isUnlocked = true;
  updatePassphraseStatus();
}

async function setPassphrase(passphrase) {
  const meta = await loadCryptoMeta();
  const salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const key = await deriveKeyFromPassphrase(passphrase, salt, PBKDF2_ITERATIONS);
  await reencryptAllEntries(key);
  const nextMeta = {
    mode: "passphrase",
    salt,
    iterations: PBKDF2_ITERATIONS,
    check: await createKeyCheck(key),
  };
  await saveCryptoMeta(nextMeta);
  currentKey = key;
  isUnlocked = true;
  updatePassphraseStatus();
}

async function disablePassphrase() {
  const meta = await loadCryptoMeta();
  const key = await getDeviceKey();
  await reencryptAllEntries(key);
  const nextMeta = {
    mode: "device",
    salt: null,
    iterations: PBKDF2_ITERATIONS,
    check: await createKeyCheck(key),
  };
  await saveCryptoMeta(nextMeta);
  currentKey = key;
  isUnlocked = true;
  updatePassphraseStatus();
}

async function reencryptAllEntries(newKey) {
  if (!currentKey) {
    return;
  }
  const records = await dbGetAll(ENTRIES_STORE);
  for (const record of records) {
    try {
      const payload = await decryptPayload(record, currentKey);
      const encrypted = await encryptPayload(payload, newKey);
      await dbPut(ENTRIES_STORE, {
        ...record,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      logDebug(`reencrypt failed: ${formatError(err)}`);
    }
  }
}

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTimeString(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function applyEntryDefaults(latestEntry) {
  const now = new Date();
  if (entryDateInput && !entryDateInput.value) {
    entryDateInput.value = toLocalDateString(now);
  }
  if (entryTimeInput && !entryTimeInput.value) {
    entryTimeInput.value = toLocalTimeString(now);
  }
  if (weightInput && latestEntry && Number.isFinite(latestEntry.weight)) {
    weightInput.value = String(latestEntry.weight);
  }
  if (waistInput && latestEntry && Number.isFinite(latestEntry.waist)) {
    waistInput.value = String(latestEntry.waist);
  }
}

function updatePassphraseStatus() {
  if (!passphraseStatusEl) {
    return;
  }
  const mode = cryptoMeta?.mode || "device";
  if (mode === "device") {
    passphraseStatusEl.textContent = "Encryption: device-only";
    unlockVaultBtn.disabled = true;
    setPassphraseBtn.disabled = false;
    changePassphraseBtn.disabled = true;
    disablePassphraseBtn.disabled = true;
  } else {
    passphraseStatusEl.textContent = isUnlocked ? "Encryption: passphrase (unlocked)" : "Encryption: passphrase (locked)";
    unlockVaultBtn.disabled = isUnlocked;
    setPassphraseBtn.disabled = true;
    changePassphraseBtn.disabled = !isUnlocked;
    disablePassphraseBtn.disabled = !isUnlocked;
  }
}

function setLockedState(locked) {
  const disabled = Boolean(locked);
  if (saveEntryBtn) {
    saveEntryBtn.disabled = disabled;
  }
  if (weightInput) {
    weightInput.disabled = disabled;
    waistInput.disabled = disabled;
    noteInput.disabled = disabled;
    entryDateInput.disabled = disabled;
    entryTimeInput.disabled = disabled;
  }
  if (historyRangeSelect) {
    historyRangeSelect.disabled = disabled;
  }
  if (historyList) {
    historyList.innerHTML = locked ? "<div class=\"muted\">Unlock to view history.</div>" : "";
  }
  if (todayStatusEl && todaySummaryEl) {
    if (locked) {
      todayStatusEl.textContent = "Locked";
      todaySummaryEl.textContent = "Unlock to view today's status.";
    }
  }
}

async function loadEntries() {
  if (!currentKey || !isUnlocked) {
    entriesCache = [];
    setLockedState(true);
    return;
  }
  setLockedState(false);
  const records = await dbGetAll(ENTRIES_STORE);
  const entries = [];
  for (const record of records) {
    if (record.is_deleted) {
      continue;
    }
    try {
      const payload = await decryptPayload(record, currentKey);
      entries.push({
        id: record.id,
        measured_at: record.measured_at,
        date_local: record.date_local,
        updated_at: record.updated_at,
        weight: payload.weight,
        waist: payload.waist,
        note: payload.note || "",
      });
    } catch (err) {
      logDebug(`decrypt failed: ${formatError(err)}`);
    }
  }
  entries.sort((a, b) => b.measured_at.localeCompare(a.measured_at));
  entriesCache = entries;
  renderHistory();
  updateTodayStatus();
  applyEntryDefaults(entriesCache[0]);
}

function updateTodayStatus() {
  if (!todayStatusEl || !todaySummaryEl) {
    return;
  }
  const today = toLocalDateString(new Date());
  const entry = entriesCache.find((item) => item.date_local === today);
  if (!entry) {
    todayStatusEl.textContent = "Not logged";
    todaySummaryEl.textContent = "No entry yet.";
    return;
  }
  todayStatusEl.textContent = "Logged";
  todaySummaryEl.textContent = `${entry.weight ?? "--"} lbs · ${entry.waist ?? "--"} in`;
}

function renderHistory() {
  if (!historyList) {
    return;
  }
  historyList.innerHTML = "";
  const range = historyRangeSelect ? historyRangeSelect.value : "7";
  let items = [...entriesCache];
  if (range !== "all") {
    const limit = parseInt(range, 10);
    if (!Number.isNaN(limit)) {
      items = items.slice(0, limit);
    }
  }
  if (items.length === 0) {
    historyList.innerHTML = "<div class=\"muted\">No entries yet.</div>";
    return;
  }
  for (const entry of items) {
    const wrapper = document.createElement("div");
    wrapper.className = "list-item";
    const top = document.createElement("div");
    top.className = "row";
    const title = document.createElement("strong");
    const dateText = entry.date_local || entry.measured_at.split("T")[0];
    title.textContent = `${dateText} · ${entry.weight ?? "--"} lbs · ${entry.waist ?? "--"} in`;
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "secondary";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteEntry(entry.id));
    top.appendChild(title);
    top.appendChild(deleteBtn);
    wrapper.appendChild(top);
    if (entry.note) {
      const note = document.createElement("div");
      note.className = "muted";
      note.textContent = entry.note;
      wrapper.appendChild(note);
    }
    historyList.appendChild(wrapper);
  }
}

async function deleteEntry(entryId) {
  const record = await dbGet(ENTRIES_STORE, entryId);
  if (!record) {
    return;
  }
  record.is_deleted = true;
  record.updated_at = new Date().toISOString();
  await dbPut(ENTRIES_STORE, record);
  await loadEntries();
  setStatus("Entry deleted.");
}

async function saveEntry() {
  if (!isUnlocked || !currentKey) {
    setStatus("Unlock to save entries.");
    return;
  }
  const weight = parseFloat(weightInput.value);
  const waist = parseFloat(waistInput.value);
  if (Number.isNaN(weight) || Number.isNaN(waist)) {
    entryStatusEl.textContent = "Enter both weight and waist.";
    return;
  }
  const warnings = [];
  if (weight < 70 || weight > 500) {
    warnings.push(`Weight looks unusual (${weight} lbs).`);
  }
  if (waist < 20 || waist > 80) {
    warnings.push(`Waist looks unusual (${waist} in).`);
  }
  if (warnings.length) {
    if (entryStatusEl) {
      entryStatusEl.textContent = warnings.join(" ");
    }
    if (!confirm(`${warnings.join(" ")} Save anyway?`)) {
      return;
    }
  }
  const dateValue = entryDateInput.value || toLocalDateString(new Date());
  const timeValue = entryTimeInput.value || toLocalTimeString(new Date());
  const measuredAt = new Date(`${dateValue}T${timeValue}`);
  const entry = {
    id: crypto.randomUUID(),
    date_local: dateValue,
    measured_at: measuredAt.toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
  };
  const payload = {
    weight,
    waist,
    note: noteInput.value.trim(),
  };
  const encrypted = await encryptPayload(payload, currentKey);
  await dbPut(ENTRIES_STORE, {
    ...entry,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
  });
  entryStatusEl.textContent = "Saved.";
  noteInput.value = "";
  await loadEntries();
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
  if (baseUrl.startsWith("/")) {
    const [pathname, query] = path.split("?");
    url = `${baseUrl}?path=${encodeURIComponent(pathname)}`;
    if (query) {
      url = `${url}&${query}`;
    }
  } else {
    if (path) {
      if (!path.startsWith("/")) {
        url += "/";
      }
      url += path;
    }
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
  logDebug(
    `response status=${response.status} type=${response.type} redirected=${response.redirected} url=${describeValue(response.url)} content-type=${response.headers.get("content-type") || ""}`,
  );
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
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) {
      serviceWorkerRegistration = existing;
    } else {
      serviceWorkerRegistration = await navigator.serviceWorker.register("/sw.js");
    }
    await navigator.serviceWorker.ready;
    serviceWorkerRegistration = await navigator.serviceWorker.ready;
    return serviceWorkerRegistration;
  } catch (err) {
    logDebug(`service worker register failed: ${formatError(err)}`);
    setPushStatus(`Service worker error: ${formatError(err)}`);
    return null;
  }
}

async function promptPassphrase(label) {
  const passphrase = prompt(label || "Enter passphrase:");
  if (!passphrase) {
    return null;
  }
  return passphrase;
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
  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error("Service worker is not available.");
  }
  if (!registration.pushManager) {
    throw new Error("Push Manager is unavailable in this browser.");
  }
  const existing = await registration.pushManager.getSubscription();
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

  saveEntryBtn.addEventListener("click", async () => {
    try {
      await saveEntry();
    } catch (err) {
      entryStatusEl.textContent = formatError(err);
    }
  });

  historyRangeSelect.addEventListener("change", () => {
    renderHistory();
  });

  unlockVaultBtn.addEventListener("click", async () => {
    if (cryptoMeta?.mode !== "passphrase") {
      return;
    }
    const passphrase = await promptPassphrase("Enter passphrase to unlock:");
    if (!passphrase) {
      return;
    }
    try {
      await unlockWithPassphrase(passphrase);
      await loadEntries();
      setStatus("Vault unlocked.");
    } catch (err) {
      setStatus(`Unlock failed: ${formatError(err)}`);
    }
  });

  setPassphraseBtn.addEventListener("click", async () => {
    const passphrase = await promptPassphrase("Set a new passphrase:");
    if (!passphrase) {
      return;
    }
    const confirmPass = await promptPassphrase("Confirm passphrase:");
    if (passphrase !== confirmPass) {
      setStatus("Passphrases do not match.");
      return;
    }
    try {
      await setPassphrase(passphrase);
      await loadEntries();
      setStatus("Passphrase enabled.");
    } catch (err) {
      setStatus(`Passphrase failed: ${formatError(err)}`);
    }
  });

  changePassphraseBtn.addEventListener("click", async () => {
    if (!isUnlocked) {
      setStatus("Unlock first to change passphrase.");
      return;
    }
    const passphrase = await promptPassphrase("Enter a new passphrase:");
    if (!passphrase) {
      return;
    }
    const confirmPass = await promptPassphrase("Confirm new passphrase:");
    if (passphrase !== confirmPass) {
      setStatus("Passphrases do not match.");
      return;
    }
    try {
      await setPassphrase(passphrase);
      await loadEntries();
      setStatus("Passphrase updated.");
    } catch (err) {
      setStatus(`Passphrase update failed: ${formatError(err)}`);
    }
  });

  disablePassphraseBtn.addEventListener("click", async () => {
    if (!isUnlocked && cryptoMeta?.mode === "passphrase") {
      setStatus("Unlock first to disable passphrase.");
      return;
    }
    try {
      await disablePassphrase();
      await loadEntries();
      setStatus("Passphrase disabled.");
    } catch (err) {
      setStatus(`Disable failed: ${formatError(err)}`);
    }
  });
}

async function init() {
  bindEvents();
  if (relayUrlInput) {
    try {
      relayUrlInput.value = getRelayUrl();
    } catch (_err) {
      relayUrlInput.value = "";
    }
  }
  logDebug(`BMT_RELAY_URL type=${typeof window.BMT_RELAY_URL} value=${describeValue(window.BMT_RELAY_URL || "")}`);
  await registerServiceWorker();
  try {
    await ensureProfile();
    setStatus("Ready.");
  } catch (err) {
    setStatus(`Setup failed: ${err.message}`);
  }

  try {
    await openDatabase();
    await ensureCryptoReady();
    if (isUnlocked) {
      await loadEntries();
    } else {
      setLockedState(true);
    }
  } catch (err) {
    setStatus(`Local storage error: ${formatError(err)}`);
  }
  applyEntryDefaults(null);

  if (!profile || !profile.token) {
    let relayHint = "";
    try {
      relayHint = ` (${getRelayUrl()})`;
    } catch (_err) {
      relayHint = "";
    }
    setPushStatus(`Relay not connected. Use Reconnect relay.${relayHint}`);
  } else if (!window.matchMedia("(display-mode: standalone)").matches) {
    setPushStatus("Install to Home Screen for notifications.");
  } else if (Notification.permission === "granted") {
    setPushStatus("Notifications enabled.");
  } else {
    setPushStatus("Notifications not enabled yet.");
  }
}

init();
