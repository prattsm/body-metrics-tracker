const APP_VERSION = "pwa-0.3.1";
const RELAY_URL_DEFAULT = "/relay";
const PROFILE_KEY = "bmt_pwa_profile_v1";
const HISTORY_SYNC_KEY = "bmt_pwa_history_sync_v1";
const ACTIVE_TAB_KEY = "bmt_pwa_active_tab_v1";
const FRIEND_ALIAS_KEY = "bmt_pwa_friend_aliases_v1";
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
const cancelEditBtn = document.getElementById("cancelEdit");
const entryStatusEl = document.getElementById("entryStatus");
const todayStatusEl = document.getElementById("todayStatus");
const todaySummaryEl = document.getElementById("todaySummary");
const historySearchInput = document.getElementById("historySearch");
const historyFromInput = document.getElementById("historyFrom");
const historyToInput = document.getElementById("historyTo");
const historyClearBtn = document.getElementById("historyClear");
const historyExportBtn = document.getElementById("historyExport");
const historyList = document.getElementById("historyList");
const summaryLabelEl = document.getElementById("summaryLabel");
const lastEntryLabelEl = document.getElementById("lastEntryLabel");
const deltaLabelEl = document.getElementById("deltaLabel");
const passphraseStatusEl = document.getElementById("passphraseStatus");
const unlockVaultBtn = document.getElementById("unlockVault");
const setPassphraseBtn = document.getElementById("setPassphrase");
const changePassphraseBtn = document.getElementById("changePassphrase");
const disablePassphraseBtn = document.getElementById("disablePassphrase");
const reminderBannerEl = document.getElementById("reminderBanner");
const friendsTodayList = document.getElementById("friendsTodayList");
const trendRangeSelect = document.getElementById("trendRange");
const trendRawCheckbox = document.getElementById("trendRaw");
const trendWeeklyCheckbox = document.getElementById("trendWeekly");
const trendSmoothCheckbox = document.getElementById("trendSmooth");
const trendGoalsCheckbox = document.getElementById("trendGoals");
const trendSmoothWindow = document.getElementById("trendSmoothWindow");
const trendFriendsEl = document.getElementById("trendFriends");
const trendLegendEl = document.getElementById("trendLegend");
const weightChart = document.getElementById("weightChart");
const waistChart = document.getElementById("waistChart");
const trendHoverEl = document.getElementById("trendHover");
const waistChartSection = document.getElementById("waistChartSection");
const inviteCodeInput = document.getElementById("inviteCode");
const sendInviteBtn = document.getElementById("sendInvite");
const inviteStatusEl = document.getElementById("inviteStatus");
const inviteListEl = document.getElementById("inviteList");
const friendsListEl = document.getElementById("friendsList");
const reminderMessageInput = document.getElementById("reminderMessage");
const reminderTimeInput = document.getElementById("reminderTime");
const reminderDaysEl = document.getElementById("reminderDays");
const addReminderBtn = document.getElementById("addReminder");
const reminderListEl = document.getElementById("reminderList");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
const trackWaistCheckbox = document.getElementById("trackWaist");
const weightUnitSelect = document.getElementById("weightUnit");
const waistUnitSelect = document.getElementById("waistUnit");
const goalWeightEnabled = document.getElementById("goalWeightEnabled");
const goalWeightValue = document.getElementById("goalWeightValue");
const goalWaistRow = document.getElementById("goalWaistRow");
const goalWaistEnabled = document.getElementById("goalWaistEnabled");
const goalWaistValue = document.getElementById("goalWaistValue");
const darkModeCheckbox = document.getElementById("darkMode");
const accentColorInput = document.getElementById("accentColor");
const accentValueLabel = document.getElementById("accentValue");
const avatarUploadInput = document.getElementById("avatarUpload");
const avatarRemoveBtn = document.getElementById("avatarRemove");
const avatarPreview = document.getElementById("avatarPreview");
const waistField = document.getElementById("waistField");
const weightLabel = document.querySelector('label[for="weightInput"]');
const waistLabel = document.querySelector('label[for="waistInput"]');
const goalWeightLabel = document.querySelector('label[for="goalWeightValue"]');
const goalWaistLabel = document.querySelector('label[for="goalWaistValue"]');

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

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const DEFAULT_ACCENT = "#4f8cf7";

function lbsToKg(value) {
  if (!Number.isFinite(value)) return null;
  return value * KG_PER_LB;
}

function kgToLbs(value) {
  if (!Number.isFinite(value)) return null;
  return value / KG_PER_LB;
}

function inToCm(value) {
  if (!Number.isFinite(value)) return null;
  return value * CM_PER_IN;
}

function cmToIn(value) {
  if (!Number.isFinite(value)) return null;
  return value / CM_PER_IN;
}

function hexToRgb(hex) {
  if (!hex) return null;
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

function applyTheme(darkMode, accentColor) {
  const body = document.body;
  if (darkMode) {
    body.classList.add("dark");
  } else {
    body.classList.remove("dark");
  }
  const accent = accentColor || DEFAULT_ACCENT;
  const rgb = hexToRgb(accent);
  if (rgb) {
    body.style.setProperty("--accent", accent);
    body.style.setProperty("--accent-soft", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`);
  }
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", darkMode ? "#12161e" : "#f7f9fc");
  }
  if (accentColorInput) {
    accentColorInput.value = accent;
  }
  if (accentValueLabel) {
    accentValueLabel.textContent = accent;
  }
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

function pulseButton(button, label) {
  if (!button) return;
  if (label) {
    const original = button.textContent;
    button.textContent = label;
    setTimeout(() => {
      button.textContent = original;
    }, 1000);
  }
  button.classList.remove("pulse");
  void button.offsetWidth;
  button.classList.add("pulse");
  setTimeout(() => button.classList.remove("pulse"), 700);
}

function normalizeFriendCode(value) {
  return (value || "").replace(/[^A-Za-z0-9]/g, "");
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return applyProfileDefaults(data);
  } catch (err) {
    return null;
  }
}

function saveProfile(next) {
  profile = applyProfileDefaults(next);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function applyProfileDefaults(data) {
  const next = { ...data };
  if (!next.display_name) next.display_name = "User";
  if (!["lb", "kg"].includes(next.weight_unit)) next.weight_unit = "lb";
  if (!["in", "cm"].includes(next.waist_unit)) next.waist_unit = "in";
  if (typeof next.track_waist !== "boolean") next.track_waist = false;
  if (!next.accent_color) next.accent_color = DEFAULT_ACCENT;
  if (typeof next.dark_mode !== "boolean") next.dark_mode = false;
  if (typeof next.goal_weight_kg !== "number") next.goal_weight_kg = null;
  if (typeof next.goal_waist_cm !== "number") next.goal_waist_cm = null;
  if (typeof next.avatar_b64 !== "string") next.avatar_b64 = null;
  return next;
}

function loadFriendAliases() {
  try {
    const raw = localStorage.getItem(FRIEND_ALIAS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (_err) {
    return {};
  }
}

function saveFriendAlias(code, name) {
  const aliases = loadFriendAliases();
  if (name) {
    aliases[code] = name;
  } else {
    delete aliases[code];
  }
  localStorage.setItem(FRIEND_ALIAS_KEY, JSON.stringify(aliases));
}

function getFriendDisplayName(friend) {
  const aliases = loadFriendAliases();
  return aliases[friend.friend_code] || friend.display_name || friend.friend_code;
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

function getWeightUnit() {
  return profile?.weight_unit || "lb";
}

function getWaistUnit() {
  return profile?.waist_unit || "in";
}

function isTrackingWaist() {
  return Boolean(profile?.track_waist);
}

function createProfile(name) {
  const userId = crypto.randomUUID();
  const friendCode = encodeBase58(uuidToBytes(userId));
  return {
    user_id: userId,
    friend_code: friendCode,
    display_name: name || "User",
    token: null,
    avatar_b64: null,
    weight_unit: "lb",
    waist_unit: "in",
    track_waist: false,
    accent_color: DEFAULT_ACCENT,
    dark_mode: false,
    goal_weight_kg: null,
    goal_waist_cm: null,
  };
}

const DB_NAME = "bmt_pwa_db";
const DB_VERSION = 2;
const META_STORE = "meta";
const ENTRIES_STORE = "entries";
const REMINDERS_STORE = "reminders";
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
let remindersCache = [];
let friendsCache = [];
let inviteCache = [];
let reminderInboxCache = [];
let friendHistoryCache = new Map();
let inboxPoller = null;
let reminderTimers = [];
let bannerItems = [];
let friendHistoryFetchedAt = 0;
let editingEntryId = null;
let trendHoverX = null;
let trendState = null;

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
      if (!db.objectStoreNames.contains(REMINDERS_STORE)) {
        const store = db.createObjectStore(REMINDERS_STORE, { keyPath: "id" });
        store.createIndex("enabled", "enabled", { unique: false });
        store.createIndex("next_at", "next_at", { unique: false });
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
  if (weightInput && latestEntry && Number.isFinite(latestEntry.weight_kg)) {
    const unit = getWeightUnit();
    const value = unit === "kg" ? latestEntry.weight_kg : kgToLbs(latestEntry.weight_kg);
    if (Number.isFinite(value)) {
      weightInput.value = String(value.toFixed(1));
    }
  }
  if (weightInput && !latestEntry && !weightInput.value) {
    const unit = getWeightUnit();
    const fallbackKg = lbsToKg(150);
    const value = unit === "kg" ? fallbackKg : 150;
    weightInput.value = String(value.toFixed(1));
  }
  if (waistInput && isTrackingWaist() && latestEntry && Number.isFinite(latestEntry.waist_cm)) {
    const unit = getWaistUnit();
    const value = unit === "cm" ? latestEntry.waist_cm : cmToIn(latestEntry.waist_cm);
    if (Number.isFinite(value)) {
      waistInput.value = String(value.toFixed(1));
    }
  }
  if (waistInput && isTrackingWaist() && !latestEntry && !waistInput.value) {
    const unit = getWaistUnit();
    const fallbackCm = inToCm(35);
    const value = unit === "cm" ? fallbackCm : 35;
    waistInput.value = String(value.toFixed(1));
  }
}

function activateTab(name) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === name);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tab === name);
  });
  localStorage.setItem(ACTIVE_TAB_KEY, name);
  if (name === "trends") {
    refreshFriendHistory().then(renderTrends);
  }
  if (name === "friends") {
    refreshInbox();
  }
  if (name === "history") {
    renderHistory();
  }
}

function initTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
  let saved = localStorage.getItem(ACTIVE_TAB_KEY) || "dashboard";
  if (saved === "home") {
    saved = "dashboard";
  }
  activateTab(saved);
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
  if (historySearchInput) {
    historySearchInput.disabled = disabled;
  }
  if (historyFromInput) {
    historyFromInput.disabled = disabled;
  }
  if (historyToInput) {
    historyToInput.disabled = disabled;
  }
  if (historyClearBtn) {
    historyClearBtn.disabled = disabled;
  }
  if (historyExportBtn) {
    historyExportBtn.disabled = disabled;
  }
  if (addReminderBtn) {
    addReminderBtn.disabled = disabled;
  }
  if (reminderMessageInput) {
    reminderMessageInput.disabled = disabled;
  }
  if (reminderTimeInput) {
    reminderTimeInput.disabled = disabled;
  }
  if (reminderDaysEl) {
    reminderDaysEl.querySelectorAll("input").forEach((input) => {
      input.disabled = disabled;
    });
  }
  if (historyList) {
    historyList.innerHTML = locked ? "<div class=\"muted\">Unlock to view history.</div>" : "";
  }
  if (reminderListEl) {
    reminderListEl.innerHTML = locked ? "<div class=\"muted\">Unlock to view reminders.</div>" : "";
  }
  if (todayStatusEl && todaySummaryEl) {
    if (locked) {
      todayStatusEl.textContent = "Locked";
      todaySummaryEl.textContent = "Unlock to view today's status.";
    }
  }
  if (summaryLabelEl && lastEntryLabelEl && deltaLabelEl && locked) {
    summaryLabelEl.textContent = "This week: --";
    lastEntryLabelEl.textContent = "Last entry: --";
    deltaLabelEl.textContent = "Last completed week: --";
    deltaLabelEl.classList.remove("highlight-good");
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
      const weightKg = payload.weight_kg ?? (payload.weight != null ? lbsToKg(payload.weight) : null);
      const waistCm = payload.waist_cm ?? (payload.waist != null ? inToCm(payload.waist) : null);
      entries.push({
        id: record.id,
        measured_at: record.measured_at,
        date_local: record.date_local,
        updated_at: record.updated_at,
        weight_kg: weightKg,
        waist_cm: waistCm,
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
  updateWeeklySummary();
  applyEntryDefaults(entriesCache[0]);
  syncStatusToRelay().catch((err) => logDebug(`status sync failed: ${formatError(err)}`));
  syncHistoryToRelay().catch((err) => logDebug(`history sync failed: ${formatError(err)}`));
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
    todayStatusEl.classList.remove("good");
    todayStatusEl.classList.add("bad");
    return;
  }
  todayStatusEl.textContent = "Logged";
  todayStatusEl.classList.remove("bad");
  todayStatusEl.classList.add("good");
  if (isTrackingWaist()) {
    todaySummaryEl.textContent = `${formatWeightDisplay(entry.weight_kg)} · ${formatWaistDisplay(entry.waist_cm)}`;
  } else {
    todaySummaryEl.textContent = formatWeightDisplay(entry.weight_kg);
  }
}

function weekStartDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function computeWeeklySummaries(entries) {
  const buckets = new Map();
  entries.forEach((entry) => {
    const date = entry.date_local ? new Date(entry.date_local) : new Date(entry.measured_at);
    const weekStart = weekStartDate(date).toISOString().slice(0, 10);
    if (!buckets.has(weekStart)) {
      buckets.set(weekStart, { weight: [], waist: [] });
    }
    const bucket = buckets.get(weekStart);
    if (Number.isFinite(entry.weight_kg)) {
      bucket.weight.push(entry.weight_kg);
    }
    if (Number.isFinite(entry.waist_cm)) {
      bucket.waist.push(entry.waist_cm);
    }
  });
  const summaries = [];
  for (const [weekStart, bucket] of buckets.entries()) {
    const avgWeight =
      bucket.weight.length ? bucket.weight.reduce((a, b) => a + b, 0) / bucket.weight.length : null;
    const avgWaist =
      bucket.waist.length ? bucket.waist.reduce((a, b) => a + b, 0) / bucket.waist.length : null;
    summaries.push({ weekStart, avgWeight, avgWaist });
  }
  summaries.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  return summaries;
}

function updateWeeklySummary() {
  if (!summaryLabelEl || !lastEntryLabelEl || !deltaLabelEl) return;
  const entries = entriesCache.filter((entry) => !entry.is_deleted);
  if (!entries.length) {
    summaryLabelEl.textContent = "This week: no entries yet";
    lastEntryLabelEl.textContent = "Last entry: --";
    deltaLabelEl.textContent = "Last completed week: --";
    deltaLabelEl.classList.remove("highlight-good");
    return;
  }
  const last = entries[0];
  if (isTrackingWaist() && last.waist_cm != null) {
    lastEntryLabelEl.textContent = `Last entry: ${formatWeightDisplay(last.weight_kg)} / ${formatWaistDisplay(last.waist_cm)}`;
  } else {
    lastEntryLabelEl.textContent = `Last entry: ${formatWeightDisplay(last.weight_kg)}`;
  }

  const summaries = computeWeeklySummaries(entries);
  const today = new Date();
  const currentWeek = weekStartDate(today).toISOString().slice(0, 10);
  const summaryByWeek = new Map(summaries.map((s) => [s.weekStart, s]));
  const currentSummary = summaryByWeek.get(currentWeek);
  if (currentSummary) {
    if (isTrackingWaist() && currentSummary.avgWaist != null) {
      summaryLabelEl.textContent = `This week avg: ${formatWeightDisplay(currentSummary.avgWeight)} / ${formatWaistDisplay(currentSummary.avgWaist)}`;
    } else {
      summaryLabelEl.textContent = `This week avg: ${formatWeightDisplay(currentSummary.avgWeight)}`;
    }
  } else {
    summaryLabelEl.textContent = "This week: no entries yet";
  }

  const completedWeeks = summaries.filter((s) => s.weekStart < currentWeek);
  if (!completedWeeks.length) {
    deltaLabelEl.textContent = "Last completed week: --";
    deltaLabelEl.classList.remove("highlight-good");
    return;
  }
  const lastCompleted = completedWeeks[completedWeeks.length - 1];
  const prevCompleted = completedWeeks.length > 1 ? completedWeeks[completedWeeks.length - 2] : null;
  let deltaWeight = null;
  let deltaWaist = null;
  if (prevCompleted && lastCompleted.avgWeight != null && prevCompleted.avgWeight != null) {
    deltaWeight = lastCompleted.avgWeight - prevCompleted.avgWeight;
  }
  if (prevCompleted && lastCompleted.avgWaist != null && prevCompleted.avgWaist != null) {
    deltaWaist = lastCompleted.avgWaist - prevCompleted.avgWaist;
  }
  const avgWeightText = formatWeightDisplay(lastCompleted.avgWeight);
  if (isTrackingWaist() && lastCompleted.avgWaist != null) {
    const avgWaistText = formatWaistDisplay(lastCompleted.avgWaist);
    const deltaText = deltaWeight != null && deltaWaist != null
      ? ` (WoW: ${deltaWeight >= 0 ? "+" : ""}${formatWeightDisplay(deltaWeight)}; ${deltaWaist >= 0 ? "+" : ""}${formatWaistDisplay(deltaWaist)})`
      : "";
    deltaLabelEl.textContent = `Last completed week: ${avgWeightText} / ${avgWaistText}${deltaText}`;
  } else {
    const deltaText = deltaWeight != null ? ` (WoW: ${deltaWeight >= 0 ? "+" : ""}${formatWeightDisplay(deltaWeight)})` : "";
    deltaLabelEl.textContent = `Last completed week: ${avgWeightText}${deltaText}`;
  }
  applyGoalAccent(deltaWeight, lastCompleted.avgWeight);
}

function applyGoalAccent(deltaWeightKg, currentAvgKg) {
  if (!deltaLabelEl) return;
  deltaLabelEl.classList.remove("highlight-good");
  if (!profile?.goal_weight_kg || deltaWeightKg == null || currentAvgKg == null) {
    return;
  }
  const diff = profile.goal_weight_kg - currentAvgKg;
  if (Math.abs(diff) < 0.1) {
    return;
  }
  const desired = diff > 0 ? 1 : -1;
  if ((desired > 0 && deltaWeightKg > 0) || (desired < 0 && deltaWeightKg < 0)) {
    deltaLabelEl.classList.add("highlight-good");
  }
}

function formatDateLabel(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatWeightDisplay(weightKg) {
  if (!Number.isFinite(weightKg)) return "--";
  const unit = getWeightUnit();
  const value = unit === "kg" ? weightKg : kgToLbs(weightKg);
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(1)} ${unit}`;
}

function formatWaistDisplay(waistCm) {
  if (!Number.isFinite(waistCm)) return "--";
  const unit = getWaistUnit();
  const value = unit === "cm" ? waistCm : cmToIn(waistCm);
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(1)} ${unit}`;
}

function isDuplicateEntry(weightKg, waistCm, measuredAt) {
  const toleranceMinutes = 5;
  const weightTol = 0.1;
  const waistTol = 0.1;
  for (const entry of entriesCache) {
    const delta = Math.abs(new Date(entry.measured_at).getTime() - measuredAt.getTime());
    if (delta <= toleranceMinutes * 60 * 1000) {
      if (Math.abs(entry.weight_kg - weightKg) > weightTol) {
        continue;
      }
      if (waistCm == null || entry.waist_cm == null) {
        return true;
      }
      if (Math.abs(entry.waist_cm - waistCm) <= waistTol) {
        return true;
      }
    }
  }
  return false;
}

function formatTimeLabel(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function toBase64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function makeInitialAvatarDataUrl(name) {
  const initial = (name || "U").trim().slice(0, 1).toUpperCase() || "U";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' rx='32' fill='%23e6edf5'/><text x='50%' y='52%' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif' font-size='28' fill='%236b7785'>${initial}</text></svg>`;
  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

function avatarSrc(avatar, name = "U") {
  if (avatar) {
    if (avatar.startsWith("data:")) {
      return avatar;
    }
    return `data:image/jpeg;base64,${avatar}`;
  }
  return makeInitialAvatarDataUrl(name);
}

function applyTrackingVisibility() {
  const track = isTrackingWaist();
  if (waistField) {
    waistField.style.display = track ? "" : "none";
  }
  if (waistInput) {
    waistInput.disabled = !track;
    if (!track) {
      waistInput.value = "";
    }
  }
  if (goalWaistRow) {
    goalWaistRow.style.display = track ? "" : "none";
  }
  if (waistChart) {
    waistChart.style.display = track ? "" : "none";
  }
  if (waistChartSection) {
    waistChartSection.style.display = track ? "" : "none";
  }
  if (waistUnitSelect) {
    waistUnitSelect.disabled = !track;
  }
}

function updateUnitLabels() {
  const weightUnit = getWeightUnit();
  const waistUnit = getWaistUnit();
  if (weightLabel) {
    weightLabel.textContent = `Weight (${weightUnit})`;
  }
  if (waistLabel) {
    waistLabel.textContent = `Waist (${waistUnit})`;
  }
  if (goalWeightLabel) {
    goalWeightLabel.textContent = `Goal weight (${weightUnit})`;
  }
  if (goalWaistLabel) {
    goalWaistLabel.textContent = `Goal waist (${waistUnit})`;
  }
}

function applyGoalInputs() {
  if (!profile) return;
  if (goalWeightEnabled) {
    goalWeightEnabled.checked = profile.goal_weight_kg != null;
  }
  if (goalWeightValue) {
    const value = profile.goal_weight_kg;
    if (value != null) {
      const display = getWeightUnit() === "kg" ? value : kgToLbs(value);
      goalWeightValue.value = Number.isFinite(display) ? display.toFixed(1) : "";
    } else {
      goalWeightValue.value = "";
    }
    goalWeightValue.disabled = !goalWeightEnabled.checked;
  }
  if (goalWaistEnabled) {
    goalWaistEnabled.checked = profile.goal_waist_cm != null;
  }
  if (goalWaistValue) {
    const value = profile.goal_waist_cm;
    if (value != null) {
      const display = getWaistUnit() === "cm" ? value : cmToIn(value);
      goalWaistValue.value = Number.isFinite(display) ? display.toFixed(1) : "";
    } else {
      goalWaistValue.value = "";
    }
    goalWaistValue.disabled = !goalWaistEnabled.checked;
  }
}

function updateGoalValues() {
  if (!profile) return;
  if (goalWeightEnabled?.checked) {
    let value = parseFloat(goalWeightValue.value);
    if (!Number.isFinite(value) && entriesCache[0]?.weight_kg) {
      const fallback = getWeightUnit() === "kg" ? entriesCache[0].weight_kg : kgToLbs(entriesCache[0].weight_kg);
      if (Number.isFinite(fallback)) {
        value = fallback;
        goalWeightValue.value = fallback.toFixed(1);
      }
    }
    profile.goal_weight_kg = Number.isFinite(value)
      ? getWeightUnit() === "kg"
        ? value
        : lbsToKg(value)
      : null;
  } else {
    profile.goal_weight_kg = null;
  }
  if (goalWaistEnabled?.checked && isTrackingWaist()) {
    let value = parseFloat(goalWaistValue.value);
    if (!Number.isFinite(value) && entriesCache[0]?.waist_cm) {
      const fallback = getWaistUnit() === "cm" ? entriesCache[0].waist_cm : cmToIn(entriesCache[0].waist_cm);
      if (Number.isFinite(fallback)) {
        value = fallback;
        goalWaistValue.value = fallback.toFixed(1);
      }
    }
    profile.goal_waist_cm = Number.isFinite(value)
      ? getWaistUnit() === "cm"
        ? value
        : inToCm(value)
      : null;
  } else {
    profile.goal_waist_cm = null;
  }
  saveProfile(profile);
  applyGoalInputs();
  renderTrends();
  updateWeeklySummary();
}

function updateAvatarPreview(nameOverride) {
  if (!avatarPreview) return;
  const name = nameOverride || profile?.display_name || "User";
  avatarPreview.src = avatarSrc(profile?.avatar_b64, name);
  avatarPreview.style.visibility = "visible";
}

async function handleAvatarUpload() {
  const file = avatarUploadInput?.files?.[0];
  if (!file) return;
  const img = new Image();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  img.src = dataUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
  });
  let size = 160;
  let quality = 0.85;
  let avatarB64 = null;
  while (size >= 64) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const minSide = Math.min(img.width, img.height);
    const sx = (img.width - minSide) / 2;
    const sy = (img.height - minSide) / 2;
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
    const output = canvas.toDataURL("image/jpeg", quality);
    const base64 = output.split(",")[1] || "";
    if (base64.length <= 60000) {
      avatarB64 = base64;
      break;
    }
    size -= 16;
    quality -= 0.05;
  }
  if (!avatarB64) {
    setStatus("Avatar too large. Try a smaller image.");
    return;
  }
  profile.avatar_b64 = avatarB64;
  saveProfile(profile);
  updateAvatarPreview();
  setStatus("Photo updated. Save profile to sync.");
}

function applyProfileToUI() {
  if (!profile) return;
  displayNameInput.value = profile.display_name || "";
  friendCodeInput.value = formatFriendCode(profile.friend_code);
  if (trackWaistCheckbox) trackWaistCheckbox.checked = Boolean(profile.track_waist);
  if (weightUnitSelect) weightUnitSelect.value = profile.weight_unit || "lb";
  if (waistUnitSelect) waistUnitSelect.value = profile.waist_unit || "in";
  if (darkModeCheckbox) darkModeCheckbox.checked = Boolean(profile.dark_mode);
  if (accentColorInput) accentColorInput.value = profile.accent_color || DEFAULT_ACCENT;
  applyTheme(profile.dark_mode, profile.accent_color);
  updateUnitLabels();
  applyTrackingVisibility();
  applyGoalInputs();
  updateAvatarPreview();
}

function beginEditEntry(entry) {
  editingEntryId = entry.id;
  if (entryDateInput) entryDateInput.value = entry.date_local || entry.measured_at.split("T")[0];
  if (entryTimeInput) entryTimeInput.value = toLocalTimeString(new Date(entry.measured_at));
  if (weightInput) {
    const value = getWeightUnit() === "kg" ? entry.weight_kg : kgToLbs(entry.weight_kg);
    if (Number.isFinite(value)) weightInput.value = value.toFixed(1);
  }
  if (waistInput && entry.waist_cm != null) {
    const value = getWaistUnit() === "cm" ? entry.waist_cm : cmToIn(entry.waist_cm);
    if (Number.isFinite(value)) waistInput.value = value.toFixed(1);
  }
  if (noteInput) noteInput.value = entry.note || "";
  if (saveEntryBtn) saveEntryBtn.textContent = "Update entry";
  if (cancelEditBtn) cancelEditBtn.style.display = "";
  if (entryStatusEl) entryStatusEl.textContent = `Editing ${entry.date_local}`;
}

function cancelEdit() {
  editingEntryId = null;
  if (saveEntryBtn) saveEntryBtn.textContent = "Save entry";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";
  if (entryStatusEl) entryStatusEl.textContent = "";
  if (entryDateInput) entryDateInput.value = "";
  if (entryTimeInput) entryTimeInput.value = "";
  if (weightInput) weightInput.value = "";
  if (waistInput) waistInput.value = "";
  if (noteInput) noteInput.value = "";
  applyEntryDefaults(entriesCache[0] || null);
}

function renderBanner() {
  if (!reminderBannerEl) {
    return;
  }
  if (!bannerItems.length) {
    reminderBannerEl.classList.add("hidden");
    reminderBannerEl.innerHTML = "";
    return;
  }
  reminderBannerEl.classList.remove("hidden");
  reminderBannerEl.innerHTML = "";
  bannerItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "banner-item";
    const text = document.createElement("div");
    text.textContent = item.text;
    const dismiss = document.createElement("button");
    dismiss.className = "secondary";
    dismiss.textContent = "×";
    dismiss.setAttribute("aria-label", "Dismiss reminder");
    dismiss.addEventListener("click", () => {
      bannerItems = bannerItems.filter((entry) => entry.id !== item.id);
      renderBanner();
    });
    row.appendChild(text);
    row.appendChild(dismiss);
    reminderBannerEl.appendChild(row);
  });
}

function pushBanner(text) {
  if (!text) return;
  const id = crypto.randomUUID();
  bannerItems.unshift({ id, text });
  bannerItems = bannerItems.slice(0, 5);
  renderBanner();
}

function renderHistory() {
  if (!historyList) {
    return;
  }
  historyList.innerHTML = "";
  const items = getFilteredHistoryEntries();
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
    const timeText = formatTimeLabel(entry.measured_at);
    const weightText = formatWeightDisplay(entry.weight_kg);
    const waistText = isTrackingWaist() ? formatWaistDisplay(entry.waist_cm) : null;
    const whenText = timeText ? `${dateText} ${timeText}` : dateText;
    title.textContent = waistText ? `${whenText} · ${weightText} · ${waistText}` : `${whenText} · ${weightText}`;
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "secondary";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteEntry(entry.id));
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => beginEditEntry(entry));
    const actionRow = document.createElement("div");
    actionRow.className = "row";
    actionRow.appendChild(editBtn);
    actionRow.appendChild(deleteBtn);
    top.appendChild(title);
    top.appendChild(actionRow);
    wrapper.appendChild(top);
    if (entry.note) {
      const note = document.createElement("div");
      note.className = "muted";
      note.textContent = entry.note;
      wrapper.appendChild(note);
    }
    if (entry.updated_at) {
      const updated = document.createElement("div");
      updated.className = "muted";
      updated.textContent = `Updated ${new Date(entry.updated_at).toLocaleString()}`;
      wrapper.appendChild(updated);
    }
    historyList.appendChild(wrapper);
  }
}

function getFilteredHistoryEntries() {
  const search = historySearchInput?.value.trim().toLowerCase() || "";
  const fromDate = historyFromInput?.value || "";
  const toDate = historyToInput?.value || "";
  let items = [...entriesCache];
  if (search) {
    items = items.filter((entry) => {
      return (
        (entry.note || "").toLowerCase().includes(search) ||
        (entry.date_local || "").includes(search)
      );
    });
  }
  if (fromDate) {
    items = items.filter((entry) => entry.date_local >= fromDate);
  }
  if (toDate) {
    items = items.filter((entry) => entry.date_local <= toDate);
  }
  return items;
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

function parseReminderTime(timeValue) {
  if (!timeValue) {
    return null;
  }
  const [hour, minute] = timeValue.split(":").map((value) => parseInt(value, 10));
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  return { hour, minute };
}

function computeNextReminder(reminder, fromDate = new Date()) {
  if (!reminder.enabled) {
    return null;
  }
  const time = parseReminderTime(reminder.time);
  if (!time) {
    return null;
  }
  const days = reminder.days?.length ? reminder.days : [0, 1, 2, 3, 4, 5, 6];
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(fromDate);
    candidate.setDate(candidate.getDate() + offset);
    if (!days.includes(candidate.getDay())) {
      continue;
    }
    candidate.setHours(time.hour, time.minute, 0, 0);
    if (candidate.getTime() <= fromDate.getTime()) {
      continue;
    }
    return candidate;
  }
  return null;
}

async function loadReminders() {
  if (!currentKey || !isUnlocked) {
    remindersCache = [];
    renderReminders();
    return;
  }
  const records = await dbGetAll(REMINDERS_STORE);
  const reminders = [];
  for (const record of records) {
    if (record.is_deleted) {
      continue;
    }
    try {
      const payload = await decryptPayload(record, currentKey);
      reminders.push({
        id: record.id,
        message: payload.message,
        time: payload.time,
        days: payload.days || [],
        enabled: record.enabled !== false,
        next_at: record.next_at || null,
        created_at: record.created_at,
        updated_at: record.updated_at,
      });
    } catch (err) {
      logDebug(`reminder decrypt failed: ${formatError(err)}`);
    }
  }
  reminders.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  remindersCache = reminders;
  await refreshReminderSchedule();
  renderReminders();
}

async function refreshReminderSchedule() {
  reminderTimers.forEach((timer) => clearTimeout(timer));
  reminderTimers = [];
  if (!currentKey || !isUnlocked) {
    return;
  }
  const now = new Date();
  for (const reminder of remindersCache) {
    const next = computeNextReminder(reminder, now);
    if (!next) {
      continue;
    }
    const nextIso = next.toISOString();
    if (reminder.next_at !== nextIso) {
      reminder.next_at = nextIso;
      await persistReminderMeta(reminder);
    }
    const delay = next.getTime() - now.getTime();
    const timer = setTimeout(async () => {
      pushBanner(reminder.message || "Reminder");
      reminder.next_at = computeNextReminder(reminder, new Date())?.toISOString() || null;
      await persistReminderMeta(reminder);
      await refreshReminderSchedule();
      renderReminders();
    }, Math.min(delay, 2147483647));
    reminderTimers.push(timer);
  }
}

async function persistReminderMeta(reminder) {
  const record = await dbGet(REMINDERS_STORE, reminder.id);
  if (!record) {
    return;
  }
  record.enabled = reminder.enabled !== false;
  record.next_at = reminder.next_at;
  record.updated_at = new Date().toISOString();
  await dbPut(REMINDERS_STORE, record);
}

async function addReminder() {
  if (!currentKey || !isUnlocked) {
    setStatus("Unlock to add reminders.");
    return false;
  }
  const message = reminderMessageInput.value.trim();
  const timeValue = reminderTimeInput.value;
  if (!message || !timeValue) {
    setStatus("Reminder needs a message and time.");
    return false;
  }
  const days = Array.from(reminderDaysEl.querySelectorAll("input[type=\"checkbox\"]"))
    .filter((input) => input.checked)
    .map((input) => parseInt(input.value, 10))
    .filter((value) => !Number.isNaN(value));
  const reminder = {
    id: crypto.randomUUID(),
    message,
    time: timeValue,
    days,
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const encrypted = await encryptPayload(
    { message: reminder.message, time: reminder.time, days: reminder.days },
    currentKey,
  );
  const next = computeNextReminder(reminder, new Date());
  await dbPut(REMINDERS_STORE, {
    id: reminder.id,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    enabled: reminder.enabled,
    next_at: next ? next.toISOString() : null,
    created_at: reminder.created_at,
    updated_at: reminder.updated_at,
    is_deleted: false,
  });
  reminderMessageInput.value = "";
  await loadReminders();
  setStatus("Reminder added.");
  return true;
}

async function toggleReminder(reminderId) {
  const reminder = remindersCache.find((item) => item.id === reminderId);
  if (!reminder) return;
  reminder.enabled = !reminder.enabled;
  reminder.next_at = reminder.enabled ? computeNextReminder(reminder, new Date())?.toISOString() : null;
  await persistReminderMeta(reminder);
  await refreshReminderSchedule();
  renderReminders();
}

async function deleteReminder(reminderId) {
  const record = await dbGet(REMINDERS_STORE, reminderId);
  if (!record) return;
  record.is_deleted = true;
  record.updated_at = new Date().toISOString();
  await dbPut(REMINDERS_STORE, record);
  await loadReminders();
  setStatus("Reminder removed.");
}

function renderReminderDays() {
  if (!reminderDaysEl) return;
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  reminderDaysEl.innerHTML = "";
  labels.forEach((label, index) => {
    const wrapper = document.createElement("label");
    wrapper.className = "checkbox-pill";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = String(index);
    input.checked = true;
    const text = document.createElement("span");
    text.textContent = label;
    wrapper.appendChild(input);
    wrapper.appendChild(text);
    reminderDaysEl.appendChild(wrapper);
  });
}

function renderReminders() {
  if (reminderListEl) {
    reminderListEl.innerHTML = "";
    if (!remindersCache.length) {
      reminderListEl.innerHTML = "<div class=\"muted\">No reminders yet.</div>";
    } else {
      remindersCache.forEach((reminder) => {
        const item = document.createElement("div");
        item.className = "list-item";
        const top = document.createElement("div");
        top.className = "row";
        const title = document.createElement("strong");
        const daysLabel = reminder.days?.length
          ? reminder.days.map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(", ")
          : "Every day";
        title.textContent = `${reminder.message} · ${reminder.time} · ${daysLabel}`;
        const actions = document.createElement("div");
        actions.className = "row";
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "secondary";
        toggleBtn.textContent = reminder.enabled ? "Disable" : "Enable";
        toggleBtn.addEventListener("click", () => toggleReminder(reminder.id));
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "secondary";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => deleteReminder(reminder.id));
        actions.appendChild(toggleBtn);
        actions.appendChild(deleteBtn);
        top.appendChild(title);
        top.appendChild(actions);
        item.appendChild(top);
        if (reminder.next_at) {
          const next = document.createElement("div");
          next.className = "muted";
          next.textContent = `Next: ${formatDateLabel(reminder.next_at)} at ${formatTimeLabel(reminder.next_at)}`;
          item.appendChild(next);
        }
        reminderListEl.appendChild(item);
      });
    }
  }

  if (reminderInboxCache.length) {
    reminderInboxCache.forEach((reminder) => {
      const from = reminder.from_name || reminder.from_code || "Friend";
      logDebug(`Reminder from ${from}: ${reminder.message}`);
    });
  }
}

function exportHistoryCsv() {
  const entries = getFilteredHistoryEntries();
  if (!entries.length) {
    setStatus("No entries to export.");
    return;
  }
  const rows = [["Date", "Weight", "Waist", "Note", "Updated"]];
  entries.forEach((entry) => {
    const dateText = entry.date_local || entry.measured_at.split("T")[0];
    const weightText = formatWeightDisplay(entry.weight_kg);
    const waistText = isTrackingWaist() ? formatWaistDisplay(entry.waist_cm) : "";
    const noteText = entry.note || "";
    const updatedText = entry.updated_at ? new Date(entry.updated_at).toISOString() : "";
    rows.push([dateText, weightText, waistText, noteText, updatedText]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/\"/g, "\"\"")}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "body-metrics-history.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setStatus("History exported.");
}

function renderInvites() {
  if (!inviteListEl) return;
  inviteListEl.innerHTML = "";
  if (!inviteCache.length) {
    inviteListEl.innerHTML = "<div class=\"muted\">No invites right now.</div>";
    return;
  }
  inviteCache.forEach((invite) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const row = document.createElement("div");
    row.className = "row";
    const name = document.createElement("strong");
    name.textContent = invite.from_name || invite.from_code;
    const acceptBtn = document.createElement("button");
    acceptBtn.className = "secondary";
    acceptBtn.textContent = "Accept";
    acceptBtn.addEventListener("click", () => acceptInvite(invite.from_code));
    row.appendChild(name);
    row.appendChild(acceptBtn);
    item.appendChild(row);
    inviteListEl.appendChild(item);
  });
}

function renderFriends() {
  if (friendsListEl) {
    friendsListEl.innerHTML = "";
    if (!friendsCache.length) {
      friendsListEl.innerHTML = "<div class=\"muted\">No friends yet.</div>";
    } else {
      const remindersByFriend = new Map();
      reminderInboxCache.forEach((reminder) => {
        if (!reminder.from_code) return;
        remindersByFriend.set(reminder.from_code, reminder);
      });
      friendsCache.forEach((friend) => {
        const item = document.createElement("div");
        item.className = "list-item";
        const row = document.createElement("div");
        row.className = "friend-row";
        const avatar = document.createElement("img");
        avatar.className = "avatar";
        avatar.alt = getFriendDisplayName(friend);
        const src = avatarSrc(friend.avatar_b64, getFriendDisplayName(friend));
        if (src) {
          avatar.src = src;
        }
        const info = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = getFriendDisplayName(friend);
        const meta = document.createElement("div");
        meta.className = "muted";
        let logged = "Status unknown";
        if (friend.logged_today === true) {
          logged = "Logged today";
        } else if (friend.logged_today === false) {
          logged = "Not logged today";
        } else if (friend.last_entry_date) {
          logged = `Last logged ${friend.last_entry_date}`;
        }
        const shared = friend.share_from_friend?.share_weight || friend.share_from_friend?.share_waist ? "" : " · Not sharing";
        const details = [];
        if (friend.share_from_friend?.share_weight && friend.weight_kg != null) {
          details.push(formatWeightDisplay(friend.weight_kg));
        }
        if (friend.share_from_friend?.share_waist && friend.waist_cm != null) {
          details.push(formatWaistDisplay(friend.waist_cm));
        }
        const detailText = details.length ? ` · ${details.join(" / ")}` : "";
        meta.textContent = `${logged}${shared}${detailText}`;
        info.appendChild(name);
        info.appendChild(meta);
        const actions = document.createElement("div");
        actions.className = "friend-actions";

        const shareRow = document.createElement("div");
        shareRow.className = "row";
        const weightToggle = document.createElement("label");
        weightToggle.className = "checkbox-pill";
        const waistToggle = document.createElement("label");
        waistToggle.className = "checkbox-pill";
        const weightInput = document.createElement("input");
        const waistInput = document.createElement("input");
        weightInput.type = "checkbox";
        waistInput.type = "checkbox";
        weightInput.checked = Boolean(friend.share_settings?.share_weight);
        waistInput.checked = Boolean(friend.share_settings?.share_waist);
        if (!isTrackingWaist()) {
          waistInput.disabled = true;
        }
        weightInput.addEventListener("change", () =>
          updateShareSettings(friend.friend_code, weightInput.checked, waistInput.checked),
        );
        waistInput.addEventListener("change", () =>
          updateShareSettings(friend.friend_code, weightInput.checked, waistInput.checked),
        );
        weightToggle.appendChild(weightInput);
        weightToggle.appendChild(document.createTextNode("Share weight"));
        waistToggle.appendChild(waistInput);
        waistToggle.appendChild(document.createTextNode("Share waist"));
        shareRow.appendChild(weightToggle);
        shareRow.appendChild(waistToggle);

        const reminderBtn = document.createElement("button");
        reminderBtn.className = "secondary";
        reminderBtn.textContent = "Send reminder";
        reminderBtn.addEventListener("click", () => sendFriendReminder(friend.friend_code, getFriendDisplayName(friend)));

        const renameBtn = document.createElement("button");
        renameBtn.className = "secondary";
        renameBtn.textContent = "Rename";
        renameBtn.addEventListener("click", () => renameFriend(friend));

        const removeBtn = document.createElement("button");
        removeBtn.className = "secondary";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => removeFriend(friend.friend_code));

        actions.appendChild(shareRow);
        actions.appendChild(reminderBtn);
        actions.appendChild(renameBtn);
        actions.appendChild(removeBtn);

        row.appendChild(avatar);
        row.appendChild(info);
        row.appendChild(actions);
        item.appendChild(row);
        const reminder = remindersByFriend.get(friend.friend_code);
        if (reminder?.message) {
          const reminderNote = document.createElement("div");
          reminderNote.className = "muted";
          reminderNote.textContent = `Reminder: ${reminder.message}`;
          item.appendChild(reminderNote);
        }
        friendsListEl.appendChild(item);
      });
    }
  }

  if (friendsTodayList) {
    friendsTodayList.innerHTML = "";
    if (!friendsCache.length) {
      friendsTodayList.innerHTML = "<div class=\"muted\">No friends yet.</div>";
    } else {
      friendsCache.forEach((friend) => {
        const pill = document.createElement("div");
        const statusClass = friend.logged_today === null ? "unknown" : friend.logged_today ? "logged" : "missing";
        pill.className = `friend-pill ${statusClass}`;
        const dot = document.createElement("span");
        dot.className = "status-dot";
        const avatar = document.createElement("img");
        avatar.className = "avatar";
        const src = avatarSrc(friend.avatar_b64, getFriendDisplayName(friend));
        if (src) {
          avatar.src = src;
        }
        const label = document.createElement("span");
        label.textContent = getFriendDisplayName(friend);
        pill.appendChild(dot);
        pill.appendChild(avatar);
        pill.appendChild(label);
        friendsTodayList.appendChild(pill);
      });
    }
  }
}

function renderTrendFriendOptions() {
  if (!trendFriendsEl) return;
  trendFriendsEl.innerHTML = "";
  if (!friendsCache.length) {
    trendFriendsEl.innerHTML = "<span class=\"muted\">No friends yet.</span>";
    return;
  }
  friendsCache.forEach((friend) => {
    const wrapper = document.createElement("label");
    wrapper.className = "checkbox-pill";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = friend.friend_code;
    input.addEventListener("change", () => renderTrends());
    if (!friend.share_from_friend?.share_weight && !friend.share_from_friend?.share_waist) {
      input.disabled = true;
    }
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode(getFriendDisplayName(friend)));
    trendFriendsEl.appendChild(wrapper);
  });
}

async function refreshInbox() {
  if (!profile?.token) {
    return;
  }
  try {
    const data = await apiRequest("/v1/inbox", { token: profile.token });
    inviteCache = data.incoming_invites || [];
    reminderInboxCache = data.reminders || [];
    friendsCache = data.friends || [];
    renderInvites();
    renderFriends();
    renderTrendFriendOptions();
    renderReminders();
    reminderInboxCache.forEach((reminder) => {
      const from = getFriendDisplayName({ friend_code: reminder.from_code, display_name: reminder.from_name });
      pushBanner(`${from}: ${reminder.message}`);
    });
    const active = localStorage.getItem(ACTIVE_TAB_KEY);
    if (active === "trends") {
      refreshFriendHistory().then(renderTrends);
    }
  } catch (err) {
    logDebug(`inbox failed: ${formatError(err)}`);
  }
}

async function sendInvite() {
  if (!profile?.token) {
    setStatus("Connect to relay first.");
    return false;
  }
  const rawCode = inviteCodeInput.value.trim();
  const code = normalizeFriendCode(rawCode);
  if (!code) {
    inviteStatusEl.textContent = "Enter a friend code.";
    return false;
  }
  try {
    const result = await apiRequest("/v1/invites", {
      method: "POST",
      token: profile.token,
      payload: { to_code: code },
    });
    inviteStatusEl.textContent = result.status === "sent" ? "Invite sent." : "Already connected.";
    inviteCodeInput.value = "";
    return true;
  } catch (err) {
    inviteStatusEl.textContent = formatError(err);
    return false;
  }
}

async function acceptInvite(fromCode) {
  if (!profile?.token) return;
  try {
    await apiRequest("/v1/invites/accept", {
      method: "POST",
      token: profile.token,
      payload: { from_code: fromCode },
    });
    await refreshInbox();
    setStatus("Friend added.");
  } catch (err) {
    setStatus(`Accept failed: ${formatError(err)}`);
  }
}

async function updateShareSettings(friendCode, shareWeight, shareWaist) {
  if (!profile?.token) return;
  try {
    await apiRequest("/v1/share-settings", {
      method: "POST",
      token: profile.token,
      payload: { friend_code: friendCode, share_weight: shareWeight, share_waist: shareWaist },
    });
    const friend = friendsCache.find((item) => item.friend_code === friendCode);
    if (friend) {
      friend.share_settings = { share_weight: shareWeight, share_waist: shareWaist };
    }
    renderFriends();
    syncStatusToRelay().catch((err) => logDebug(`status sync failed: ${formatError(err)}`));
    setStatus("Share settings updated.");
  } catch (err) {
    setStatus(`Share update failed: ${formatError(err)}`);
  }
}

async function sendFriendReminder(friendCode, friendName) {
  if (!profile?.token) return;
  const message = prompt(`Send a reminder to ${friendName || friendCode}:`, "Time to log your weight.");
  if (!message) {
    return;
  }
  try {
    await apiRequest("/v1/reminders", {
      method: "POST",
      token: profile.token,
      payload: { to_code: friendCode, message },
    });
    setStatus("Reminder sent.");
  } catch (err) {
    setStatus(`Reminder failed: ${formatError(err)}`);
  }
}

function renameFriend(friend) {
  const currentName = getFriendDisplayName(friend);
  const name = prompt("Edit friend name:", currentName);
  if (name === null) {
    return;
  }
  saveFriendAlias(friend.friend_code, name.trim() || null);
  renderFriends();
  renderTrendFriendOptions();
  renderTrends();
}

async function removeFriend(friendCode) {
  if (!profile?.token) return;
  if (!confirm("Remove this friend?")) {
    return;
  }
  try {
    await apiRequest("/v1/friends/remove", {
      method: "POST",
      token: profile.token,
      payload: { friend_code: friendCode },
    });
    await refreshInbox();
    setStatus("Friend removed.");
  } catch (err) {
    setStatus(`Remove failed: ${formatError(err)}`);
  }
}

async function refreshFriendHistory() {
  if (!profile?.token) {
    return;
  }
  const now = Date.now();
  if (now - friendHistoryFetchedAt < 60_000) {
    return;
  }
  try {
    const data = await apiRequest("/v1/history", { token: profile.token });
    friendHistoryCache = new Map();
    (data.friends || []).forEach((friend) => {
      friendHistoryCache.set(friend.friend_code, friend.entries || []);
    });
    friendHistoryFetchedAt = now;
  } catch (err) {
    logDebug(`friend history failed: ${formatError(err)}`);
  }
}

function getSelectedFriendCodes() {
  if (!trendFriendsEl) return [];
  return Array.from(trendFriendsEl.querySelectorAll("input[type=\"checkbox\"]"))
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function getRangeFiltered(entries) {
  if (!entries || !entries.length) return [];
  const selection = trendRangeSelect ? trendRangeSelect.value : "all";
  const sorted = [...entries].sort((a, b) => (a.measured_at || "").localeCompare(b.measured_at || ""));
  if (selection === "all") {
    return sorted;
  }
  const today = new Date();
  let startDate = null;
  if (selection === "4w") {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 28);
  } else if (selection === "12w") {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 84);
  } else if (selection === "ytd") {
    startDate = new Date(today.getFullYear(), 0, 1);
  }
  if (!startDate) {
    return sorted;
  }
  return sorted.filter((entry) => new Date(entry.measured_at).getTime() >= startDate.getTime());
}

function buildSeriesFromLocal(entries, metric, color, label) {
  const points = getRangeFiltered(entries)
    .map((entry) => ({
      x: new Date(entry.measured_at).getTime(),
      y: metric === "weight" ? entry.weight_kg : entry.waist_cm,
    }))
    .filter((point) => Number.isFinite(point.y));
  return { label, color, points };
}

function buildSeriesFromFriend(entries, metric, color, label) {
  const points = getRangeFiltered(entries)
    .filter((entry) => !entry.is_deleted)
    .map((entry) => ({
      x: new Date(entry.measured_at).getTime(),
      y: metric === "weight" ? entry.weight_kg : entry.waist_cm,
    }))
    .filter((point) => Number.isFinite(point.y));
  return { label, color, points };
}

function convertSeriesToDisplay(series, metric) {
  const unit = metric === "weight" ? getWeightUnit() : getWaistUnit();
  const convert = metric === "weight"
    ? unit === "kg"
      ? (v) => v
      : kgToLbs
    : unit === "cm"
      ? (v) => v
      : cmToIn;
  return {
    ...series,
    points: series.points.map((point) => ({ ...point, y: convert(point.y) })).filter((p) => Number.isFinite(p.y)),
  };
}

function computeWeeklySeries(points) {
  if (!points.length) return [];
  const buckets = new Map();
  points.forEach((point) => {
    const date = new Date(point.x);
    const weekStart = weekStartDate(date).getTime();
    if (!buckets.has(weekStart)) {
      buckets.set(weekStart, []);
    }
    buckets.get(weekStart).push(point.y);
  });
  const weekly = [];
  for (const [weekStart, values] of buckets.entries()) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    weekly.push({ x: weekStart + 12 * 60 * 60 * 1000, y: avg });
  }
  weekly.sort((a, b) => a.x - b.x);
  return weekly;
}

function smoothSeries(points, windowSize) {
  if (points.length < windowSize) return [];
  const smoothed = [];
  for (let i = windowSize - 1; i < points.length; i += 1) {
    const slice = points.slice(i - windowSize + 1, i + 1);
    const avg = slice.reduce((sum, p) => sum + p.y, 0) / slice.length;
    smoothed.push({ x: points[i].x, y: avg });
  }
  return smoothed;
}

function drawChart(canvas, seriesList, { unitLabel, xRange, goalValue, hoverX } = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const styles = getComputedStyle(document.body);
  const gridColor = styles.getPropertyValue("--border") || "#e2e8f1";
  const textColor = styles.getPropertyValue("--muted-light") || "#73839a";
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth * dpr;
  const height = canvas.clientHeight * dpr;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  const padding = { left: 46, right: 16, top: 16, bottom: 30 };

  const allPoints = seriesList.flatMap((series) => series.points);
  if (!allPoints.length) {
    ctx.fillStyle = textColor.trim();
    ctx.font = `${12 * dpr}px sans-serif`;
    ctx.fillText("No data yet.", padding.left, height / 2);
    return;
  }
  const rawMinX = Math.min(...allPoints.map((p) => p.x));
  const rawMaxX = Math.max(...allPoints.map((p) => p.x));
  const minX = xRange ? xRange.min : rawMinX;
  const maxX = xRange ? xRange.max : rawMaxX;
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padY = rangeY * 0.1;
  const yMin = minY - padY;
  const yMax = maxY + padY;
  const yRange = yMax - yMin || 1;

  ctx.strokeStyle = gridColor.trim();
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  const yTicks = [yMax, (yMax + yMin) / 2, yMin];
  ctx.fillStyle = textColor.trim();
  ctx.font = `${11 * dpr}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  yTicks.forEach((tick) => {
    const y = padding.top + (1 - (tick - yMin) / yRange) * (height - padding.top - padding.bottom);
    const label = `${tick.toFixed(1)}${unitLabel ? ` ${unitLabel}` : ""}`;
    ctx.fillText(label, padding.left - 6, y);
  });

  if (goalValue != null && Number.isFinite(goalValue)) {
    const y = padding.top + (1 - (goalValue - yMin) / yRange) * (height - padding.top - padding.bottom);
    ctx.strokeStyle = "rgba(240, 155, 85, 0.8)";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  seriesList.forEach((series) => {
    if (!series.points.length) return;
    const lineWidth = (series.lineWidth || 2) * dpr;
    ctx.strokeStyle = series.color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    series.points.forEach((point, idx) => {
      const x = padding.left + ((point.x - minX) / rangeX) * (width - padding.left - padding.right);
      const y = padding.top + (1 - (point.y - yMin) / yRange) * (height - padding.top - padding.bottom);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    if (series.showPoints) {
      ctx.fillStyle = series.color;
      series.points.forEach((point) => {
        const x = padding.left + ((point.x - minX) / rangeX) * (width - padding.left - padding.right);
        const y = padding.top + (1 - (point.y - yMin) / yRange) * (height - padding.top - padding.bottom);
        ctx.beginPath();
        ctx.arc(x, y, 2.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });

  if (hoverX != null) {
    const x = padding.left + ((hoverX - minX) / rangeX) * (width - padding.left - padding.right);
    ctx.strokeStyle = "rgba(100, 110, 125, 0.6)";
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }

  const tickCount = 4;
  ctx.fillStyle = textColor.trim();
  ctx.font = `${11 * dpr}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (let i = 0; i < tickCount; i += 1) {
    const tick = minX + (rangeX / (tickCount - 1)) * i;
    const x = padding.left + ((tick - minX) / rangeX) * (width - padding.left - padding.right);
    const label = formatDateLabel(new Date(tick).toISOString());
    ctx.fillText(label, x, height - 6);
  }
}

function renderTrends() {
  if (!weightChart || !waistChart) {
    return;
  }
  const palette = ["#4f8cf7", "#f08b7f", "#6ac28a", "#9b7bff", "#f0b24b", "#44bcd8"];
  const baseSeries = [];
  baseSeries.push({
    label: profile?.display_name || "You",
    weight: buildSeriesFromLocal(entriesCache, "weight", palette[0], "You"),
    waist: buildSeriesFromLocal(entriesCache, "waist", palette[0], "You"),
    color: palette[0],
  });
  const selected = getSelectedFriendCodes();
  selected.forEach((code, index) => {
    const friend = friendsCache.find((item) => item.friend_code === code);
    const entries = friendHistoryCache.get(code) || [];
    const label = getFriendDisplayName(friend || { friend_code: code, display_name: code });
    const color = palette[(index + 1) % palette.length];
    baseSeries.push({
      label,
      weight: buildSeriesFromFriend(entries, "weight", color, label),
      waist: buildSeriesFromFriend(entries, "waist", color, label),
      color,
    });
  });

  if (trendLegendEl) {
    trendLegendEl.innerHTML = "";
    baseSeries.forEach((series) => {
      const item = document.createElement("div");
      item.className = "legend-item";
      const dot = document.createElement("span");
      dot.className = "legend-dot";
      dot.style.background = series.color;
      const text = document.createElement("span");
      text.textContent = series.label;
      item.appendChild(dot);
      item.appendChild(text);
      trendLegendEl.appendChild(item);
    });
  }

  const showRaw = trendRawCheckbox?.checked ?? true;
  const showWeekly = trendWeeklyCheckbox?.checked ?? true;
  const showSmooth = trendSmoothCheckbox?.checked ?? false;
  const showGoals = trendGoalsCheckbox?.checked ?? true;
  const smoothWindow = parseInt(trendSmoothWindow?.value || "7", 10);

  const weightSeries = [];
  const waistSeries = [];
  baseSeries.forEach((series) => {
    const weightDisplay = convertSeriesToDisplay(series.weight, "weight");
    const waistDisplay = convertSeriesToDisplay(series.waist, "waist");
    if (showRaw) {
      weightSeries.push({ ...weightDisplay, color: series.color, showPoints: true, lineWidth: 1.5 });
      waistSeries.push({ ...waistDisplay, color: series.color, showPoints: true, lineWidth: 1.5 });
    }
    if (showWeekly) {
      const weeklyWeight = computeWeeklySeries(weightDisplay.points);
      const weeklyWaist = computeWeeklySeries(waistDisplay.points);
      weightSeries.push({ label: series.label, color: series.color, points: weeklyWeight, showPoints: false, lineWidth: 2.5 });
      waistSeries.push({ label: series.label, color: series.color, points: weeklyWaist, showPoints: false, lineWidth: 2.5 });
    }
    if (showSmooth) {
      const smoothWeight = smoothSeries(weightDisplay.points, smoothWindow || 7);
      const smoothWaist = smoothSeries(waistDisplay.points, smoothWindow || 7);
      weightSeries.push({ label: series.label, color: series.color, points: smoothWeight, showPoints: false, lineWidth: 2 });
      waistSeries.push({ label: series.label, color: series.color, points: smoothWaist, showPoints: false, lineWidth: 2 });
    }
  });

  const today = new Date();
  const selection = trendRangeSelect?.value || "all";
  let xRange = null;
  if (selection === "4w") {
    const halfDays = 14;
    const min = new Date(today);
    min.setDate(min.getDate() - halfDays);
    const max = new Date(today);
    max.setDate(max.getDate() + halfDays);
    xRange = { min: min.getTime(), max: max.getTime() };
  } else if (selection === "12w") {
    const halfDays = 42;
    const min = new Date(today);
    min.setDate(min.getDate() - halfDays);
    const max = new Date(today);
    max.setDate(max.getDate() + halfDays);
    xRange = { min: min.getTime(), max: max.getTime() };
  } else if (selection === "ytd") {
    const min = new Date(today.getFullYear(), 0, 1);
    xRange = { min: min.getTime(), max: today.getTime() };
  }

  const weightGoal = showGoals && profile?.goal_weight_kg != null
    ? (getWeightUnit() === "kg" ? profile.goal_weight_kg : kgToLbs(profile.goal_weight_kg))
    : null;
  const waistGoal = showGoals && profile?.goal_waist_cm != null
    ? (getWaistUnit() === "cm" ? profile.goal_waist_cm : cmToIn(profile.goal_waist_cm))
    : null;

  trendState = {
    weightSeries,
    waistSeries,
    xRange,
    weightGoal,
    waistGoal,
  };
  drawTrendCharts();
}

function drawTrendCharts() {
  if (!trendState) return;
  drawChart(weightChart, trendState.weightSeries, {
    unitLabel: getWeightUnit(),
    xRange: trendState.xRange,
    goalValue: trendState.weightGoal,
    hoverX: trendHoverX,
  });
  if (isTrackingWaist()) {
    drawChart(waistChart, trendState.waistSeries, {
      unitLabel: getWaistUnit(),
      xRange: trendState.xRange,
      goalValue: trendState.waistGoal,
      hoverX: trendHoverX,
    });
  }
}

function findSeriesExtents(seriesList) {
  const points = seriesList.flatMap((series) => series.points || []);
  if (!points.length) {
    return null;
  }
  return {
    min: Math.min(...points.map((p) => p.x)),
    max: Math.max(...points.map((p) => p.x)),
  };
}

function handleTrendHover(event, metric) {
  if (!trendState) return;
  const canvas = metric === "weight" ? weightChart : waistChart;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const xPos = event.clientX - rect.left;
  const extents = trendState.xRange || findSeriesExtents(metric === "weight" ? trendState.weightSeries : trendState.waistSeries);
  if (!extents) return;
  const hoverX = extents.min + (xPos / rect.width) * (extents.max - extents.min);
  trendHoverX = hoverX;

  const seriesList = metric === "weight" ? trendState.weightSeries : trendState.waistSeries;
  let best = null;
  seriesList.forEach((series) => {
    series.points.forEach((point) => {
      const distance = Math.abs(point.x - hoverX);
      if (!best || distance < best.distance) {
        best = { distance, point, label: series.label };
      }
    });
  });
  if (best && trendHoverEl) {
    const dateLabel = formatDateLabel(new Date(best.point.x).toISOString());
    const valueLabel = metric === "weight"
      ? `${best.point.y.toFixed(1)} ${getWeightUnit()}`
      : `${best.point.y.toFixed(1)} ${getWaistUnit()}`;
    trendHoverEl.textContent = `${dateLabel} · ${best.label}: ${valueLabel}`;
  }
  drawTrendCharts();
}

function clearTrendHover() {
  trendHoverX = null;
  if (trendHoverEl) {
    trendHoverEl.textContent = "";
  }
  drawTrendCharts();
}

async function syncStatusToRelay() {
  if (!profile?.token) {
    return;
  }
  const latestEntry = entriesCache[0];
  const today = toLocalDateString(new Date());
  const loggedToday = entriesCache.some((entry) => entry.date_local === today);
  const shareWeight = friendsCache.some((friend) => friend.share_settings?.share_weight);
  const shareWaist = friendsCache.some((friend) => friend.share_settings?.share_waist);
  await apiRequest("/v1/status", {
    method: "POST",
    token: profile.token,
    payload: {
      logged_today: loggedToday,
      last_entry_date: latestEntry?.date_local || null,
      weight_kg: shareWeight ? latestEntry?.weight_kg ?? null : null,
      waist_cm: shareWaist && isTrackingWaist() ? latestEntry?.waist_cm ?? null : null,
    },
  });
}

async function collectEntriesForSync(sinceIso) {
  const records = await dbGetAll(ENTRIES_STORE);
  const entries = [];
  for (const record of records) {
    if (sinceIso && record.updated_at && record.updated_at < sinceIso) {
      continue;
    }
    let payload = null;
    if (!record.is_deleted) {
      try {
        payload = await decryptPayload(record, currentKey);
      } catch (err) {
        logDebug(`sync decrypt failed: ${formatError(err)}`);
      }
    }
    const weightKg = payload?.weight_kg ?? (payload?.weight != null ? lbsToKg(payload.weight) : null);
    const waistCm = payload?.waist_cm ?? (payload?.waist != null ? inToCm(payload.waist) : null);
    entries.push({
      entry_id: record.id,
      measured_at: record.measured_at,
      date_local: record.date_local,
      weight_kg: weightKg,
      waist_cm: waistCm,
      updated_at: record.updated_at,
      is_deleted: Boolean(record.is_deleted),
    });
  }
  return entries;
}

async function syncHistoryToRelay() {
  if (!profile?.token || !currentKey || !isUnlocked) {
    return;
  }
  const since = localStorage.getItem(HISTORY_SYNC_KEY) || null;
  const entries = await collectEntriesForSync(since);
  if (!entries.length) {
    return;
  }
  await apiRequest("/v1/history", {
    method: "POST",
    token: profile.token,
    payload: { entries },
  });
  const latest = entries.reduce((max, entry) => {
    if (!entry.updated_at) return max;
    return !max || entry.updated_at > max ? entry.updated_at : max;
  }, null);
  if (latest) {
    localStorage.setItem(HISTORY_SYNC_KEY, latest);
  }
}

async function saveEntry() {
  if (!isUnlocked || !currentKey) {
    setStatus("Unlock to save entries.");
    return;
  }
  const weightValue = parseFloat(weightInput.value);
  if (Number.isNaN(weightValue)) {
    entryStatusEl.textContent = "Enter a weight.";
    return;
  }
  let waistValue = null;
  if (isTrackingWaist()) {
    waistValue = parseFloat(waistInput.value);
    if (Number.isNaN(waistValue)) {
      entryStatusEl.textContent = "Enter a waist measurement.";
      return;
    }
  }
  const weightUnit = getWeightUnit();
  const waistUnit = getWaistUnit();
  const weightKg = weightUnit === "kg" ? weightValue : lbsToKg(weightValue);
  const waistCm = waistValue == null ? null : waistUnit === "cm" ? waistValue : inToCm(waistValue);
  const warnings = [];
  if (weightKg != null && (weightKg < 35 || weightKg > 220)) {
    warnings.push("Weight value looks unusual.");
  }
  if (waistCm != null && (waistCm < 50 || waistCm > 180)) {
    warnings.push("Waist value looks unusual.");
  }
  const dateValue = entryDateInput.value || toLocalDateString(new Date());
  const timeValue = entryTimeInput.value || toLocalTimeString(new Date());
  const measuredAt = new Date(`${dateValue}T${timeValue}`);
  const now = new Date();
  if (measuredAt.getTime() > now.getTime()) {
    warnings.push("Date is in the future.");
  }
  if (measuredAt.getTime() < now.getTime() - 365 * 24 * 60 * 60 * 1000) {
    warnings.push("Date is more than 1 year in the past.");
  }
  if (isDuplicateEntry(weightKg, waistCm, measuredAt)) {
    warnings.push("Possible duplicate entry (similar values within 5 minutes).");
  }
  if (warnings.length) {
    if (entryStatusEl) {
      entryStatusEl.textContent = warnings.join(" ");
    }
    if (!confirm(`${warnings.join(" ")} Save anyway?`)) {
      return;
    }
  }
  const entryId = editingEntryId || crypto.randomUUID();
  const entry = {
    id: entryId,
    date_local: dateValue,
    measured_at: measuredAt.toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
  };
  const payload = {
    weight_kg: weightKg,
    waist_cm: waistCm,
    note: noteInput.value.trim(),
  };
  const encrypted = await encryptPayload(payload, currentKey);
  const existing = editingEntryId ? await dbGet(ENTRIES_STORE, entryId) : null;
  await dbPut(ENTRIES_STORE, {
    ...entry,
    created_at: existing?.created_at || new Date().toISOString(),
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
  });
  noteInput.value = "";
  cancelEdit();
  entryStatusEl.textContent = "Saved.";
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
  applyProfileToUI();

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
    payload: { display_name: name, avatar_b64: profile.avatar_b64 || null },
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
        avatar_b64: profile.avatar_b64 || null,
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
      pulseButton(saveProfileBtn, "Saved");
    } catch (err) {
      setStatus(`Profile update failed: ${formatError(err)}`);
    }
  });

  if (displayNameInput) {
    displayNameInput.addEventListener("input", () => {
      if (!profile?.avatar_b64) {
        updateAvatarPreview(displayNameInput.value.trim() || "User");
      }
    });
  }

  copyCodeBtn.addEventListener("click", () => {
    const code = friendCodeInput.value.trim();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setStatus("Friend code copied.");
    pulseButton(copyCodeBtn, "Copied");
  });

  reconnectRelayBtn.addEventListener("click", async () => {
    try {
      await registerProfile();
      if (profile && profile.token) {
        setPushStatus("Relay connected. Enable notifications.");
      }
      pulseButton(reconnectRelayBtn);
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
      pulseButton(resetIdentityBtn);
    } catch (err) {
      setStatus(`Relay registration failed: ${formatError(err)}`);
    }
  });

  if (refreshAssetsBtn) {
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
  }

  if (copyDebugBtn) {
    copyDebugBtn.addEventListener("click", () => {
      if (!debugEntries.length) {
        setStatus("Debug log is empty.");
        return;
      }
      navigator.clipboard.writeText(debugEntries.join("\n"));
      setStatus("Debug log copied.");
      pulseButton(copyDebugBtn, "Copied");
    });
  }

  if (testRelayBtn) {
    testRelayBtn.addEventListener("click", async () => {
      try {
        logDebug("ping start");
        const result = await apiRequest("/v1/ping");
        logDebug(`ping ok ${JSON.stringify(result)}`);
        setStatus(`Relay ok: ${JSON.stringify(result)}`);
        pulseButton(testRelayBtn);
      } catch (err) {
        logDebug(`ping failed ${formatError(err)}`);
        setStatus(`Relay test failed: ${formatError(err)}`);
      }
    });
  }

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
      pulseButton(saveEntryBtn, editingEntryId ? "Updated" : "Saved");
    } catch (err) {
      entryStatusEl.textContent = formatError(err);
    }
  });

  if (historySearchInput) {
    historySearchInput.addEventListener("input", renderHistory);
  }
  if (historyFromInput) {
    historyFromInput.addEventListener("change", renderHistory);
  }
  if (historyToInput) {
    historyToInput.addEventListener("change", renderHistory);
  }
  if (historyClearBtn) {
    historyClearBtn.addEventListener("click", () => {
      if (historySearchInput) historySearchInput.value = "";
      if (historyFromInput) historyFromInput.value = "";
      if (historyToInput) historyToInput.value = "";
      renderHistory();
    });
  }
  if (historyExportBtn) {
    historyExportBtn.addEventListener("click", () => {
      exportHistoryCsv();
      pulseButton(historyExportBtn, "Exported");
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", cancelEdit);
  }

  if (trendRangeSelect) {
    trendRangeSelect.addEventListener("change", () => renderTrends());
  }
  if (trendRawCheckbox) {
    trendRawCheckbox.addEventListener("change", () => renderTrends());
  }
  if (trendWeeklyCheckbox) {
    trendWeeklyCheckbox.addEventListener("change", () => renderTrends());
  }
  if (trendSmoothCheckbox) {
    trendSmoothCheckbox.addEventListener("change", () => renderTrends());
  }
  if (trendGoalsCheckbox) {
    trendGoalsCheckbox.addEventListener("change", () => renderTrends());
  }
  if (trendSmoothWindow) {
    trendSmoothWindow.addEventListener("change", () => renderTrends());
  }

  if (weightChart) {
    weightChart.addEventListener("mousemove", (event) => handleTrendHover(event, "weight"));
    weightChart.addEventListener("mouseleave", clearTrendHover);
    weightChart.addEventListener("touchmove", (event) => {
      if (event.touches.length > 0) {
        handleTrendHover(event.touches[0], "weight");
      }
    }, { passive: true });
    weightChart.addEventListener("touchend", clearTrendHover);
  }
  if (waistChart) {
    waistChart.addEventListener("mousemove", (event) => handleTrendHover(event, "waist"));
    waistChart.addEventListener("mouseleave", clearTrendHover);
    waistChart.addEventListener("touchmove", (event) => {
      if (event.touches.length > 0) {
        handleTrendHover(event.touches[0], "waist");
      }
    }, { passive: true });
    waistChart.addEventListener("touchend", clearTrendHover);
  }

  if (sendInviteBtn) {
    sendInviteBtn.addEventListener("click", async () => {
      const ok = await sendInvite();
      if (ok) {
        pulseButton(sendInviteBtn, "Sent");
      }
    });
  }

  if (addReminderBtn) {
    addReminderBtn.addEventListener("click", async () => {
      const ok = await addReminder();
      if (ok) {
        pulseButton(addReminderBtn, "Added");
      }
    });
  }

  if (trackWaistCheckbox) {
    trackWaistCheckbox.addEventListener("change", () => {
      if (!profile) return;
      profile.track_waist = trackWaistCheckbox.checked;
      if (!profile.track_waist) {
        profile.goal_waist_cm = null;
      }
      saveProfile(profile);
      applyTrackingVisibility();
      applyGoalInputs();
      renderHistory();
      renderTrends();
      updateTodayStatus();
    });
  }

  if (weightUnitSelect) {
    weightUnitSelect.addEventListener("change", () => {
      if (!profile) return;
      profile.weight_unit = weightUnitSelect.value;
      saveProfile(profile);
      updateUnitLabels();
      applyGoalInputs();
      applyEntryDefaults(entriesCache[0] || null);
      renderHistory();
      renderTrends();
      updateTodayStatus();
      updateWeeklySummary();
    });
  }

  if (waistUnitSelect) {
    waistUnitSelect.addEventListener("change", () => {
      if (!profile) return;
      profile.waist_unit = waistUnitSelect.value;
      saveProfile(profile);
      updateUnitLabels();
      applyGoalInputs();
      applyEntryDefaults(entriesCache[0] || null);
      renderHistory();
      renderTrends();
      updateTodayStatus();
      updateWeeklySummary();
    });
  }

  if (goalWeightEnabled) {
    goalWeightEnabled.addEventListener("change", () => {
      updateGoalValues();
    });
  }
  if (goalWeightValue) {
    goalWeightValue.addEventListener("change", () => {
      updateGoalValues();
    });
  }
  if (goalWaistEnabled) {
    goalWaistEnabled.addEventListener("change", () => {
      updateGoalValues();
    });
  }
  if (goalWaistValue) {
    goalWaistValue.addEventListener("change", () => {
      updateGoalValues();
    });
  }

  if (darkModeCheckbox) {
    darkModeCheckbox.addEventListener("change", () => {
      if (!profile) return;
      profile.dark_mode = darkModeCheckbox.checked;
      saveProfile(profile);
      applyTheme(profile.dark_mode, profile.accent_color);
    });
  }

  if (accentColorInput) {
    accentColorInput.addEventListener("change", () => {
      if (!profile) return;
      profile.accent_color = accentColorInput.value;
      saveProfile(profile);
      applyTheme(profile.dark_mode, profile.accent_color);
    });
  }

  if (avatarUploadInput) {
    avatarUploadInput.addEventListener("change", async () => {
      await handleAvatarUpload();
    });
  }
  if (avatarRemoveBtn) {
    avatarRemoveBtn.addEventListener("click", () => {
      if (!profile) return;
      profile.avatar_b64 = null;
      saveProfile(profile);
      updateAvatarPreview();
    });
  }

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
      await loadReminders();
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
      await loadReminders();
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
      await loadReminders();
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
      await loadReminders();
      setStatus("Passphrase disabled.");
    } catch (err) {
      setStatus(`Disable failed: ${formatError(err)}`);
    }
  });
}

async function init() {
  bindEvents();
  initTabs();
  renderReminderDays();
  if (reminderTimeInput && !reminderTimeInput.value) {
    reminderTimeInput.value = "08:00";
  }
  if (cancelEditBtn) {
    cancelEditBtn.style.display = "none";
  }
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
      await loadReminders();
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

  if (profile?.token) {
    await refreshInbox();
    inboxPoller = setInterval(() => {
      refreshInbox();
    }, 60_000);
  }
}

init();
