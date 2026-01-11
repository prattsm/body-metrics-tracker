const APP_VERSION = "pwa-0.4.0";
const RELAY_URL_DEFAULT = "/relay";
const PROFILE_KEY = "bmt_pwa_profile_v1";
const HISTORY_SYNC_KEY = "bmt_pwa_history_sync_v1";
const ACTIVE_TAB_KEY = "bmt_pwa_active_tab_v1";
const FRIEND_ALIAS_KEY = "bmt_pwa_friend_aliases_v1";
const FRIEND_KNOWN_KEY = "bmt_pwa_known_friends_v1";
const statusEl = document.getElementById("status");
const pushStatusEl = document.getElementById("pushStatus");
const displayNameInput = document.getElementById("displayName");
const friendCodeInput = document.getElementById("friendCode");
const saveProfileBtn = document.getElementById("saveProfile");
const copyCodeBtn = document.getElementById("copyCode");
const reconnectRelayBtn = document.getElementById("reconnectRelay");
const resetIdentityBtn = document.getElementById("resetIdentity");
const relayUrlInput = document.getElementById("relayUrl");
const relayLastSyncEl = document.getElementById("relayLastSync");
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
const logEntryModal = document.getElementById("logEntryModal");
const logEntryOpenBtn = document.getElementById("openLogEntry");
const logEntryCloseBtn = document.getElementById("closeLogEntry");
const logEntryTitle = document.getElementById("logEntryTitle");
const todayTile = document.getElementById("todayTile");
const todayTileValue = document.getElementById("todayTileValue");
const todayTileSub = document.getElementById("todayTileSub");
const trendTile = document.getElementById("trendTile");
const trendTileValue = document.getElementById("trendTileValue");
const trendTileSub = document.getElementById("trendTileSub");
const bestTile = document.getElementById("bestTile");
const bestTileValue = document.getElementById("bestTileValue");
const bestTileSub = document.getElementById("bestTileSub");
const avgWeeklyChangeValue = document.getElementById("avgWeeklyChangeValue");
const avgWeeklyChangeSub = document.getElementById("avgWeeklyChangeSub");
const friendsTodaySummary = document.getElementById("friendsTodaySummary");
const historySearchInput = document.getElementById("historySearch");
const historyFromInput = document.getElementById("historyFrom");
const historyToInput = document.getElementById("historyTo");
const historyClearBtn = document.getElementById("historyClear");
const historyExportBtn = document.getElementById("historyExport");
const historyList = document.getElementById("historyList");
const logbookAddBtn = document.getElementById("logbookAdd");
const logbookFilterSelect = document.getElementById("logbookFilter");
const summaryLabelEl = document.getElementById("summaryLabel");
const lastEntryLabelEl = document.getElementById("lastEntryLabel");
const deltaLabelEl = document.getElementById("deltaLabel");
const passphraseStatusEl = document.getElementById("passphraseStatus");
const unlockVaultBtn = document.getElementById("unlockVault");
const setPassphraseBtn = document.getElementById("setPassphrase");
const changePassphraseBtn = document.getElementById("changePassphrase");
const disablePassphraseBtn = document.getElementById("disablePassphrase");
const settingsExportBtn = document.getElementById("settingsExport");
const friendsTodayList = document.getElementById("friendsTodayList");
const trendRangeSelect = document.getElementById("trendRange");
const trendRawCheckbox = document.getElementById("trendRaw");
const trendGoalsCheckbox = document.getElementById("trendGoals");
const trendResetViewBtn = document.getElementById("trendResetView");
const trendCompareToggleBtn = document.getElementById("trendCompareToggle");
const trendComparePanel = document.getElementById("trendComparePanel");
const trendCompareClearBtn = document.getElementById("trendCompareClear");
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
const friendReminderModal = document.getElementById("friendReminderModal");
const friendReminderTitle = document.getElementById("friendReminderTitle");
const friendReminderMessage = document.getElementById("friendReminderMessage");
const friendReminderCancel = document.getElementById("friendReminderCancel");
const friendReminderSend = document.getElementById("friendReminderSend");
const friendSettingsModal = document.getElementById("friendSettingsModal");
const friendSettingsTitle = document.getElementById("friendSettingsTitle");
const friendSettingsClose = document.getElementById("friendSettingsClose");
const friendSettingsName = document.getElementById("friendSettingsName");
const friendShareWeight = document.getElementById("friendShareWeight");
const friendShareWaist = document.getElementById("friendShareWaist");
const friendSettingsSave = document.getElementById("friendSettingsSave");
const friendsButton = document.getElementById("openFriends");
const friendsCloseBtn = document.getElementById("closeFriends");
const offlineBanner = document.getElementById("offlineBanner");
const offlineDismissBtn = document.getElementById("offlineDismiss");
const headerTitle = document.querySelector(".app-header h1");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
const trackWaistCheckbox = document.getElementById("trackWaist");
const weightUnitSelect = document.getElementById("weightUnit");
const waistUnitSelect = document.getElementById("waistUnit");
const displayEmphasisSelect = document.getElementById("displayEmphasis");
const startDateInput = document.getElementById("startDate");
const freshStartCheckbox = document.getElementById("freshStart");
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
let friendReminderTarget = null;
let friendSettingsTarget = null;
let lastMainTab = "summary";
let statusTimer = null;

const DEFAULT_FRIEND_REMINDER = "Time to log your weight.";

function setStatus(message, { persist = true } = {}) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.add("show");
  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }
  if (!persist) {
    statusTimer = setTimeout(() => {
      statusEl.classList.remove("show");
    }, 4000);
  }
}

function showToast(message) {
  setStatus(message, { persist: false });
}

function updateOfflineBanner() {
  if (!offlineBanner) return;
  if (navigator.onLine) {
    offlineBanner.classList.add("hidden");
  } else {
    offlineBanner.classList.remove("hidden");
  }
}

function setPushStatus(message) {
  if (!pushStatusEl) return;
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
  if (typeof next.fresh_start !== "boolean") next.fresh_start = false;
  if (typeof next.start_date !== "string") next.start_date = "";
  if (!["trend", "best"].includes(next.display_emphasis)) next.display_emphasis = "trend";
  if (typeof next.last_sync_at !== "string") next.last_sync_at = "";
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

function loadKnownFriendCodes() {
  try {
    const raw = localStorage.getItem(FRIEND_KNOWN_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list : []);
  } catch (_err) {
    return new Set();
  }
}

function hasKnownFriendCodes() {
  return localStorage.getItem(FRIEND_KNOWN_KEY) !== null;
}

function saveKnownFriendCodes(codes) {
  localStorage.setItem(FRIEND_KNOWN_KEY, JSON.stringify(Array.from(codes)));
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
    fresh_start: false,
    start_date: "",
    display_emphasis: "trend",
    last_sync_at: "",
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
let friendHistoryCache = new Map();
let inboxPoller = null;
let friendHistoryFetchedAt = 0;
let editingEntryId = null;
let trendHoverX = null;
let trendState = null;
let comparePanelVisible = false;
let trendRangeSelection = null;
let trendViewRange = null;
let trendLockedEntry = null;
let trendDragging = null;
let trendPinch = null;

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

function parseLocalDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return dateInput;
  }
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split("-").map((value) => parseInt(value, 10));
    if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
      return new Date(year, month - 1, day);
    }
  }
  return new Date(dateInput);
}

function startOfLocalDay(dateInput) {
  const date = dateInput instanceof Date ? new Date(dateInput) : parseLocalDate(dateInput);
  if (!date || Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfLocalDay(dateInput) {
  const date = dateInput instanceof Date ? new Date(dateInput) : parseLocalDate(dateInput);
  if (!date || Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

function getEntryChartTime(entry) {
  const date = entry?.date_local ? startOfLocalDay(entry.date_local) : startOfLocalDay(entry?.measured_at);
  if (date) return date.getTime();
  return new Date(entry?.measured_at || Date.now()).getTime();
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

function getVisibleEntries() {
  let items = [...entriesCache];
  if (profile?.fresh_start && profile.start_date) {
    items = items.filter((entry) => (entry.date_local || entry.measured_at.slice(0, 10)) >= profile.start_date);
  }
  return items;
}

function applySummaryEmphasis() {
  if (!trendTile || !bestTile) return;
  trendTile.classList.remove("primary");
  bestTile.classList.remove("primary");
  if (profile?.display_emphasis === "best") {
    bestTile.classList.add("primary");
  } else {
    trendTile.classList.add("primary");
  }
}

function getChartExtents(seriesList) {
  const points = seriesList.flatMap((series) => series.points || []);
  if (!points.length) return null;
  return {
    min: Math.min(...points.map((p) => p.x)),
    max: Math.max(...points.map((p) => p.x)),
  };
}

function setTrendViewRange(range) {
  if (!range || range.max <= range.min) {
    trendViewRange = null;
    return;
  }
  const extents = trendState?.extents;
  let min = range.min;
  let max = range.max;
  const minSpan = 24 * 60 * 60 * 1000;
  if (max - min < minSpan) {
    const mid = (min + max) / 2;
    min = mid - minSpan / 2;
    max = mid + minSpan / 2;
  }
  if (extents) {
    const span = max - min;
    if (min < extents.min) {
      min = extents.min;
      max = min + span;
    }
    if (max > extents.max) {
      max = extents.max;
      min = max - span;
    }
    if (min < extents.min) min = extents.min;
    if (max > extents.max) max = extents.max;
  }
  trendViewRange = { min, max };
  if (trendState) {
    trendState.xRange = trendViewRange;
  }
  drawTrendCharts();
}

function resetTrendView() {
  if (!trendState?.baseRange) {
    trendViewRange = null;
    drawTrendCharts();
    return;
  }
  setTrendViewRange({ ...trendState.baseRange });
}

function zoomTrendAt(canvas, delta, factorOverride = null) {
  if (!trendState || !canvas) return;
  const range = trendState.xRange || trendState.baseRange || trendState.extents;
  if (!range) return;
  const rect = canvas.getBoundingClientRect();
  const centerRatio = rect.width ? (delta.x / rect.width) : 0.5;
  const center = range.min + centerRatio * (range.max - range.min);
  const factor = factorOverride ?? (delta.zoomIn ? 0.85 : 1.15);
  const span = (range.max - range.min) * factor;
  const min = center - centerRatio * span;
  const max = center + (1 - centerRatio) * span;
  setTrendViewRange({ min, max });
}

function panTrend(canvas, deltaX, startRange) {
  if (!canvas || !startRange) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  const span = startRange.max - startRange.min;
  const shift = (deltaX / rect.width) * span;
  setTrendViewRange({ min: startRange.min - shift, max: startRange.max - shift });
}

function getChartMeta(metric) {
  if (!trendState?.chartMeta) return null;
  return metric === "weight" ? trendState.chartMeta.weight : trendState.chartMeta.waist;
}

function getEntryKey(entry, label = "") {
  const id = entry?.id || entry?.entry_id || entry?.entryId || entry?.measured_at || entry?.date_local || "unknown";
  return `${label}:${id}`;
}

function findNearestSeriesPoint(seriesList, meta, clickX, clickY) {
  if (!meta) return null;
  const dpr = window.devicePixelRatio || 1;
  const targetX = clickX * dpr;
  const targetY = clickY * dpr;
  const maxDistance = 18 * dpr;
  let best = null;
  const minX = meta.minX;
  const maxX = meta.maxX;
  seriesList.forEach((series) => {
    (series.points || []).forEach((point) => {
      if (point.x < minX || point.x > maxX) return;
      const x = meta.padding.left + ((point.x - minX) / meta.rangeX) * (meta.width - meta.padding.left - meta.padding.right);
      const y = meta.padding.top + (1 - (point.y - meta.yMin) / meta.yRange) * (meta.height - meta.padding.top - meta.padding.bottom);
      const distance = Math.hypot(x - targetX, y - targetY);
      if (!best || distance < best.distance) {
        best = { distance, point, series };
      }
    });
  });
  if (best && best.distance <= maxDistance) {
    return best;
  }
  return null;
}

function lockTrendEntry(lock) {
  if (!lock) {
    trendLockedEntry = null;
    trendHoverX = null;
    if (trendHoverEl) trendHoverEl.textContent = "";
    drawTrendCharts();
    return;
  }
  const entry = lock.entry || lock;
  const label = lock.label || profile?.display_name || "You";
  const share = lock.share || { weight: true, waist: isTrackingWaist() };
  trendLockedEntry = {
    entry,
    label,
    share,
    metric: lock.metric,
    key: lock.key || getEntryKey(entry, label),
  };
  trendHoverX = getEntryChartTime(entry);
  const dateLabel = formatDateLabel(entry.date_local || entry.measured_at);
  const details = [];
  if (share.weight !== false && Number.isFinite(entry.weight_kg)) {
    details.push(`Weight ${formatWeightDisplay(entry.weight_kg)}`);
  }
  if (share.waist !== false && isTrackingWaist() && Number.isFinite(entry.waist_cm)) {
    details.push(`Waist ${formatWaistDisplay(entry.waist_cm)}`);
  }
  const detail = details.length ? details.join(" · ") : "No shared measurements";
  if (trendHoverEl) {
    trendHoverEl.textContent = `${dateLabel} · ${label}: ${detail}`;
  }
  drawTrendCharts();
}

function clearTrendLock() {
  trendLockedEntry = null;
  clearTrendHover();
}

function formatDateTimeLabel(dateString) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function updateRelayLastSync() {
  if (!relayLastSyncEl) return;
  relayLastSyncEl.textContent = profile?.last_sync_at ? formatDateTimeLabel(profile.last_sync_at) : "--";
}

function getCurrentTrendWeight(entries) {
  if (!entries.length) return null;
  const summaries = computeWeeklySummaries(entries);
  const currentWeek = toLocalDateString(weekStartDate(new Date()));
  const summaryByWeek = new Map(summaries.map((summary) => [summary.weekStart, summary]));
  const currentSummary = summaryByWeek.get(currentWeek);
  if (currentSummary && currentSummary.avgWeight != null) {
    return currentSummary.avgWeight;
  }
  const completed = summaries.filter((summary) => summary.weekStart < currentWeek && summary.avgWeight != null);
  if (completed.length) {
    return completed[completed.length - 1].avgWeight;
  }
  return entries[0]?.weight_kg ?? null;
}

function getWeightGoalDirection(entries) {
  if (!profile?.goal_weight_kg) return "lose";
  const current = getCurrentTrendWeight(entries);
  if (!Number.isFinite(current)) return "lose";
  if (profile.goal_weight_kg > current) return "gain";
  if (profile.goal_weight_kg < current) return "lose";
  return "lose";
}

function computeTenDayBest(entries, direction = "lose") {
  if (!entries.length) return null;
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 9);
  const recent = entries.filter((entry) => {
    const date = entry.date_local ? parseLocalDate(entry.date_local) : new Date(entry.measured_at);
    return date >= cutoff && date <= today;
  });
  if (!recent.length) return null;
  return recent.reduce((best, entry) => {
    if (!Number.isFinite(entry.weight_kg)) return best;
    if (!best) return entry;
    if (direction === "gain" && entry.weight_kg > best.weight_kg) return entry;
    if (direction !== "gain" && entry.weight_kg < best.weight_kg) return entry;
    return best;
  }, null);
}

function getTenDayBestEntryIds(entries, direction = "lose") {
  const sorted = [...entries].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const result = new Set();
  for (let i = 0; i < sorted.length; i += 1) {
    const entry = sorted[i];
    if (!Number.isFinite(entry.weight_kg)) {
      continue;
    }
    const entryDate = entry.date_local ? parseLocalDate(entry.date_local) : new Date(entry.measured_at);
    const windowStart = new Date(entryDate);
    windowStart.setDate(windowStart.getDate() - 9);
    let best = entry.weight_kg;
    for (let j = i; j >= 0; j -= 1) {
      const candidate = sorted[j];
      const candidateDate = candidate.date_local ? parseLocalDate(candidate.date_local) : new Date(candidate.measured_at);
      if (candidateDate < windowStart) {
        break;
      }
      if (Number.isFinite(candidate.weight_kg)) {
        if (direction === "gain") {
          best = Math.max(best, candidate.weight_kg);
        } else {
          best = Math.min(best, candidate.weight_kg);
        }
      }
    }
    if (Math.abs(entry.weight_kg - best) < 0.0001) {
      result.add(entry.id);
    }
  }
  return result;
}

function activateTab(name) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === name);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tab === name);
  });
  if (name !== "friends") {
    localStorage.setItem(ACTIVE_TAB_KEY, name);
  }
  if (name !== "friends") {
    lastMainTab = name;
  }
  if (headerTitle) {
    const titleMap = {
      summary: "Summary",
      chart: "Chart",
      logbook: "Logbook",
      settings: "Settings",
      friends: "Friends",
    };
    headerTitle.textContent = titleMap[name] || "Summary";
  }
  if (friendsButton) {
    friendsButton.style.visibility = name === "friends" ? "hidden" : "visible";
  }
  if (name === "chart") {
    refreshFriendHistory().then(renderTrends);
  }
  if (name === "friends") {
    refreshInbox();
  }
  if (name === "logbook") {
    renderHistory();
  }
}

function initTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
  let saved = localStorage.getItem(ACTIVE_TAB_KEY) || "summary";
  const alias = {
    dashboard: "summary",
    home: "summary",
    trends: "chart",
    history: "logbook",
  };
  if (alias[saved]) {
    saved = alias[saved];
  }
  if (saved === "friends") {
    saved = "summary";
  }
  if (!["summary", "chart", "logbook", "settings", "friends"].includes(saved)) {
    saved = "summary";
  }
  activateTab(saved);
}

function openFriends() {
  activateTab("friends");
}

function closeFriends() {
  activateTab(lastMainTab || "summary");
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
  if (disabled) {
    closeLogEntryModal();
    closeFriendReminder();
  }
  if (saveEntryBtn) {
    saveEntryBtn.disabled = disabled;
  }
  if (logEntryOpenBtn) {
    logEntryOpenBtn.disabled = disabled;
  }
  if (logbookAddBtn) {
    logbookAddBtn.disabled = disabled;
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
  if (logbookFilterSelect) {
    logbookFilterSelect.disabled = disabled;
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
  if (todayTileValue && todayTileSub && locked) {
    todayTileValue.textContent = "Locked";
    todayTileSub.textContent = "Unlock to view today's status.";
  }
  if (trendTileValue && trendTileSub && locked) {
    trendTileValue.textContent = "--";
    trendTileSub.textContent = "Unlock to view trend.";
  }
  if (bestTileValue && bestTileSub && locked) {
    bestTileValue.textContent = "--";
    bestTileSub.textContent = "Unlock to view best.";
  }
  if (avgWeeklyChangeValue && avgWeeklyChangeSub && locked) {
    avgWeeklyChangeValue.textContent = "--";
    avgWeeklyChangeSub.textContent = "Unlock to view change.";
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
  updateSummaryTiles();
  applyEntryDefaults(getVisibleEntries()[0]);
  syncStatusToRelay().catch((err) => logDebug(`status sync failed: ${formatError(err)}`));
  syncHistoryToRelay().catch((err) => {
    logDebug(`history sync failed: ${formatError(err)}`);
    setStatus("Saved locally. Sync failed - Retry.");
  });
}

function updateSummaryTiles() {
  const entries = getVisibleEntries();
  const direction = getWeightGoalDirection(entries);
  const today = toLocalDateString(new Date());
  const entry = entries.find((item) => item.date_local === today);
  if (todayTileValue && todayTileSub) {
    if (!entry) {
      todayTileValue.textContent = "Not logged";
      todayTileSub.textContent = "Tap to log today";
    } else if (isTrackingWaist()) {
      todayTileValue.textContent = formatWeightDisplay(entry.weight_kg);
      todayTileSub.textContent = formatWaistDisplay(entry.waist_cm);
    } else {
      todayTileValue.textContent = formatWeightDisplay(entry.weight_kg);
      todayTileSub.textContent = "Logged today";
    }
  }

  const summaries = computeWeeklySummaries(entries);
  const currentWeek = toLocalDateString(weekStartDate(new Date()));
  const summaryByWeek = new Map(summaries.map((s) => [s.weekStart, s]));
  const currentSummary = summaryByWeek.get(currentWeek);
  if (trendTileValue && trendTileSub) {
    if (currentSummary && currentSummary.avgWeight != null) {
      trendTileValue.textContent = formatWeightDisplay(currentSummary.avgWeight);
      trendTileSub.textContent = "This week avg";
    } else {
      trendTileValue.textContent = "--";
      trendTileSub.textContent = "No entries yet";
    }
  }

  const bestEntry = computeTenDayBest(entries, direction);
  if (bestTileValue && bestTileSub) {
    if (bestEntry && Number.isFinite(bestEntry.weight_kg)) {
      bestTileValue.textContent = formatWeightDisplay(bestEntry.weight_kg);
      const label = bestEntry.date_local || bestEntry.measured_at;
      const descriptor = direction === "gain" ? "Highest" : "Lowest";
      bestTileSub.textContent = `${descriptor} on ${formatDateLabel(label)}`;
    } else {
      bestTileValue.textContent = "--";
      bestTileSub.textContent = "Last 10 days";
    }
  }

  if (avgWeeklyChangeValue && avgWeeklyChangeSub) {
    const result = computeAverageWeeklyChange(entries, 4);
    if (!result) {
      avgWeeklyChangeValue.textContent = "--";
      avgWeeklyChangeSub.textContent = "Last 4 weeks";
    } else {
      const unit = getWeightUnit();
      const value = unit === "kg" ? result.avg : kgToLbs(result.avg);
      const sign = value >= 0 ? "+" : "";
      avgWeeklyChangeValue.textContent = `${sign}${value.toFixed(1)} ${unit}/week`;
      avgWeeklyChangeSub.textContent = `Avg over last ${result.count} week${result.count === 1 ? "" : "s"}`;
    }
  }

  updateWeeklySummary(entries);
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
    const date = entry.date_local ? parseLocalDate(entry.date_local) : new Date(entry.measured_at);
    const weekStart = toLocalDateString(weekStartDate(date));
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

function computeAverageWeeklyChange(entries, windowWeeks = 4) {
  const summaries = computeWeeklySummaries(entries);
  const currentWeek = toLocalDateString(weekStartDate(new Date()));
  const completed = summaries.filter((summary) => summary.weekStart < currentWeek && summary.avgWeight != null);
  if (completed.length < 2) return null;
  const deltas = [];
  const startIndex = Math.max(1, completed.length - (windowWeeks + 1));
  for (let i = startIndex; i < completed.length; i += 1) {
    const prev = completed[i - 1];
    const current = completed[i];
    if (prev?.avgWeight == null || current?.avgWeight == null) {
      continue;
    }
    deltas.push(current.avgWeight - prev.avgWeight);
  }
  if (!deltas.length) return null;
  const sum = deltas.reduce((acc, value) => acc + value, 0);
  return { avg: sum / deltas.length, count: deltas.length };
}

function updateWeeklySummary(entriesInput = null) {
  if (!summaryLabelEl || !lastEntryLabelEl || !deltaLabelEl) return;
  const entries = entriesInput || getVisibleEntries();
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
  const currentWeek = toLocalDateString(weekStartDate(today));
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

function formatDateLabel(dateInput) {
  if (!dateInput) return "";
  const date = dateInput instanceof Date ? dateInput : parseLocalDate(dateInput);
  if (!date || Number.isNaN(date.getTime())) {
    return String(dateInput);
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
    const latest = getVisibleEntries()[0];
    if (!Number.isFinite(value) && latest?.weight_kg) {
      const fallback = getWeightUnit() === "kg" ? latest.weight_kg : kgToLbs(latest.weight_kg);
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
    const latest = getVisibleEntries()[0];
    if (!Number.isFinite(value) && latest?.waist_cm) {
      const fallback = getWaistUnit() === "cm" ? latest.waist_cm : cmToIn(latest.waist_cm);
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
  if (displayEmphasisSelect) displayEmphasisSelect.value = profile.display_emphasis || "trend";
  if (startDateInput) startDateInput.value = profile.start_date || "";
  if (freshStartCheckbox) freshStartCheckbox.checked = Boolean(profile.fresh_start);
  if (darkModeCheckbox) darkModeCheckbox.checked = Boolean(profile.dark_mode);
  if (accentColorInput) accentColorInput.value = profile.accent_color || DEFAULT_ACCENT;
  applyTheme(profile.dark_mode, profile.accent_color);
  updateUnitLabels();
  applyTrackingVisibility();
  applyGoalInputs();
  applySummaryEmphasis();
  updateRelayLastSync();
  updateAvatarPreview();
}

function openLogEntryModal() {
  if (logEntryModal) {
    logEntryModal.classList.remove("hidden");
  }
}

function closeLogEntryModal() {
  if (logEntryModal) {
    logEntryModal.classList.add("hidden");
  }
}

function startNewEntry() {
  editingEntryId = null;
  if (saveEntryBtn) saveEntryBtn.textContent = "Save entry";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";
  if (entryStatusEl) entryStatusEl.textContent = "";
  if (logEntryTitle) logEntryTitle.textContent = "Log entry";
  if (entryDateInput) entryDateInput.value = "";
  if (entryTimeInput) entryTimeInput.value = "";
  if (weightInput) weightInput.value = "";
  if (waistInput) waistInput.value = "";
  if (noteInput) noteInput.value = "";
  applyEntryDefaults(getVisibleEntries()[0] || null);
  openLogEntryModal();
}

function beginEditEntry(entry) {
  editingEntryId = entry.id;
  if (logEntryTitle) logEntryTitle.textContent = "Edit entry";
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
  openLogEntryModal();
}

function cancelEdit() {
  editingEntryId = null;
  if (saveEntryBtn) saveEntryBtn.textContent = "Save entry";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";
  if (entryStatusEl) entryStatusEl.textContent = "";
  if (logEntryTitle) logEntryTitle.textContent = "Log entry";
  if (entryDateInput) entryDateInput.value = "";
  if (entryTimeInput) entryTimeInput.value = "";
  if (weightInput) weightInput.value = "";
  if (waistInput) waistInput.value = "";
  if (noteInput) noteInput.value = "";
  applyEntryDefaults(getVisibleEntries()[0] || null);
  closeLogEntryModal();
}

function renderHistory() {
  if (!historyList) {
    return;
  }
  historyList.innerHTML = "";
  if (!isUnlocked) {
    historyList.innerHTML = "<div class=\"muted\">Unlock to view history.</div>";
    return;
  }
  const items = getFilteredHistoryEntries();
  if (items.length === 0) {
    historyList.innerHTML = "<div class=\"muted\">No entries yet.</div>";
    return;
  }
  const summaries = computeWeeklySummaries(getVisibleEntries());
  const summaryByWeek = new Map(summaries.map((summary) => [summary.weekStart, summary]));
  for (const entry of items) {
    const wrapper = document.createElement("div");
    wrapper.className = "list-item";
    const row = document.createElement("div");
    row.className = "entry-row";
    row.addEventListener("click", () => beginEditEntry(entry));
    const meta = document.createElement("div");
    meta.className = "entry-meta";
    const title = document.createElement("div");
    title.className = "entry-title";
    const dateLabel = formatDateLabel(entry.date_local || entry.measured_at);
    const weekday = (entry.date_local ? parseLocalDate(entry.date_local) : new Date(entry.measured_at))
      .toLocaleDateString(undefined, { weekday: "short" });
    const weightText = formatWeightDisplay(entry.weight_kg);
    const waistText = isTrackingWaist() ? formatWaistDisplay(entry.waist_cm) : null;
    title.textContent = waistText ? `${weekday} · ${dateLabel} · ${weightText} · ${waistText}` : `${weekday} · ${dateLabel} · ${weightText}`;
    const sub = document.createElement("div");
    sub.className = "entry-sub";
    const weekKey = toLocalDateString(
      weekStartDate(entry.date_local ? parseLocalDate(entry.date_local) : new Date(entry.measured_at)),
    );
    const summary = summaryByWeek.get(weekKey);
    const trendText = summary && summary.avgWeight != null ? `Trend ${formatWeightDisplay(summary.avgWeight)}` : "Trend --";
    sub.textContent = trendText;
    meta.appendChild(title);
    meta.appendChild(sub);
    row.appendChild(meta);
    if (entry.note) {
      const noteDot = document.createElement("span");
      noteDot.className = "note-indicator";
      row.appendChild(noteDot);
    }
    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      beginEditEntry(entry);
    });
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "secondary";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteEntry(entry.id);
    });
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    row.appendChild(actions);
    wrapper.appendChild(row);
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
  let items = getVisibleEntries();
  const filter = logbookFilterSelect?.value || "all";
  if (filter === "30d") {
    const min = new Date();
    min.setDate(min.getDate() - 29);
    items = items.filter((entry) => parseLocalDate(entry.date_local || entry.measured_at) >= min);
  } else if (filter === "month") {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    items = items.filter((entry) => {
      const date = parseLocalDate(entry.date_local || entry.measured_at);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  } else if (filter === "best10") {
    const direction = getWeightGoalDirection(items);
    const bestIds = getTenDayBestEntryIds(items, direction);
    items = items.filter((entry) => bestIds.has(entry.id));
  }
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
        timezone: record.timezone || null,
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
  if (profile?.token) {
    const synced = await syncRemindersFromRelay();
    if (synced) {
      return;
    }
  }
}

async function refreshReminderSchedule() {
  if (!currentKey || !isUnlocked) {
    return;
  }
  const now = new Date();
  for (const reminder of remindersCache) {
    if (reminder.next_at) {
      continue;
    }
    const next = computeNextReminder(reminder, now);
    if (!next) {
      continue;
    }
    const nextIso = next.toISOString();
    if (reminder.next_at !== nextIso) {
      reminder.next_at = nextIso;
      await persistReminderMeta(reminder);
    }
  }
}

async function syncRemindersFromRelay() {
  if (!profile?.token || !currentKey || !isUnlocked) {
    return false;
  }
  try {
    const data = await apiRequest("/v1/reminders/schedules", { token: profile.token });
    const remote = Array.isArray(data.reminders) ? data.reminders : [];
    const existing = await dbGetAll(REMINDERS_STORE);
    const existingIds = new Set(existing.map((record) => record.id));
    const remoteIds = new Set(remote.map((item) => item.id));
    for (const reminder of remote) {
      const encrypted = await encryptPayload(
        { message: reminder.message, time: reminder.time, days: reminder.days || [] },
        currentKey,
      );
      await dbPut(REMINDERS_STORE, {
        id: reminder.id,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
        enabled: reminder.enabled !== false,
        next_at: reminder.next_fire_at || reminder.next_at || null,
        timezone: reminder.timezone || "UTC",
        created_at: reminder.created_at || new Date().toISOString(),
        updated_at: reminder.updated_at || new Date().toISOString(),
        is_deleted: false,
      });
      existingIds.delete(reminder.id);
    }
    for (const staleId of existingIds) {
      const record = await dbGet(REMINDERS_STORE, staleId);
      if (!record) continue;
      if (!remoteIds.has(staleId)) {
        record.is_deleted = true;
        record.updated_at = new Date().toISOString();
        await dbPut(REMINDERS_STORE, record);
      }
    }
    remindersCache = remote.map((reminder) => ({
      id: reminder.id,
      message: reminder.message,
      time: reminder.time,
      days: reminder.days || [],
      enabled: reminder.enabled !== false,
      timezone: reminder.timezone || "UTC",
      next_at: reminder.next_fire_at || reminder.next_at || null,
      created_at: reminder.created_at || null,
      updated_at: reminder.updated_at || null,
    }));
    await refreshReminderSchedule();
    renderReminders();
    return true;
  } catch (err) {
    setStatus(`Reminder sync failed: ${formatError(err)}`);
    return false;
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
  if (!profile?.token) {
    setStatus("Connect to relay to enable reminders.");
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
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
  try {
    await apiRequest("/v1/reminders/schedules", {
      method: "POST",
      token: profile.token,
      payload: reminder,
    });
    reminderMessageInput.value = "";
    const synced = await syncRemindersFromRelay();
    if (synced) {
      setStatus("Reminder added.");
      return true;
    }
    return false;
  } catch (err) {
    setStatus(`Reminder failed: ${formatError(err)}`);
    return false;
  }
}

async function toggleReminder(reminderId) {
  const reminder = remindersCache.find((item) => item.id === reminderId);
  if (!reminder) return;
  if (!profile?.token) {
    setStatus("Connect to relay to update reminders.");
    return;
  }
  const updated = {
    ...reminder,
    enabled: !reminder.enabled,
    timezone: reminder.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
  try {
    await apiRequest("/v1/reminders/schedules", {
      method: "POST",
      token: profile.token,
      payload: updated,
    });
    await syncRemindersFromRelay();
  } catch (err) {
    setStatus(`Reminder update failed: ${formatError(err)}`);
  }
}

async function deleteReminder(reminderId) {
  if (!profile?.token) {
    setStatus("Connect to relay to update reminders.");
    return;
  }
  try {
    await apiRequest("/v1/reminders/schedules/delete", {
      method: "POST",
      token: profile.token,
      payload: { id: reminderId },
    });
    await syncRemindersFromRelay();
    setStatus("Reminder removed.");
  } catch (err) {
    setStatus(`Reminder remove failed: ${formatError(err)}`);
  }
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

function getLatestEntryWithMetric(entries, metric) {
  const key = metric === "weight" ? "weight_kg" : "waist_cm";
  let latest = null;
  entries.forEach((entry) => {
    if (entry.is_deleted) return;
    const value = entry[key];
    if (!Number.isFinite(value)) return;
    const time = new Date(entry.measured_at).getTime();
    if (Number.isNaN(time)) return;
    if (!latest || time > latest.time) {
      latest = { entry, time };
    }
  });
  return latest ? latest.entry : null;
}

function renderFriends() {
  if (friendsListEl) {
    friendsListEl.innerHTML = "";
    if (!friendsCache.length) {
      friendsListEl.innerHTML = "<div class=\"muted\">No friends yet.</div>";
    } else {
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
        const sharedMetrics = friend.share_from_friend || {};
        const shared = sharedMetrics.share_weight || sharedMetrics.share_waist ? "" : " · Not sharing";
        const historyEntries = friendHistoryCache.get(friend.friend_code) || [];
        const details = [];
        if (sharedMetrics.share_weight) {
          let weightValue = Number.isFinite(friend.weight_kg) ? friend.weight_kg : null;
          if (!Number.isFinite(weightValue)) {
            const weightEntry = getLatestEntryWithMetric(historyEntries, "weight");
            weightValue = Number.isFinite(weightEntry?.weight_kg) ? weightEntry.weight_kg : null;
          }
          if (Number.isFinite(weightValue)) {
            details.push(formatWeightDisplay(weightValue));
          }
        }
        if (sharedMetrics.share_waist) {
          let waistValue = Number.isFinite(friend.waist_cm) ? friend.waist_cm : null;
          if (!Number.isFinite(waistValue)) {
            const waistEntry = getLatestEntryWithMetric(historyEntries, "waist");
            waistValue = Number.isFinite(waistEntry?.waist_cm) ? waistEntry.waist_cm : null;
          }
          if (Number.isFinite(waistValue)) {
            details.push(formatWaistDisplay(waistValue));
          }
        }
        const detailText = details.length ? ` · ${details.join(" / ")}` : "";
        meta.textContent = `${logged}${shared}${detailText}`;
        info.appendChild(name);
        info.appendChild(meta);
        const actions = document.createElement("div");
        actions.className = "friend-actions";
        const reminderBtn = document.createElement("button");
        reminderBtn.className = "secondary";
        reminderBtn.textContent = "Send reminder";
        reminderBtn.addEventListener("click", () => openFriendReminder(friend.friend_code, getFriendDisplayName(friend)));

        const settingsBtn = document.createElement("button");
        settingsBtn.className = "secondary";
        settingsBtn.textContent = "Settings";
        settingsBtn.addEventListener("click", () => openFriendSettings(friend));

        const removeBtn = document.createElement("button");
        removeBtn.className = "secondary";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => removeFriend(friend.friend_code));

        actions.appendChild(reminderBtn);
        actions.appendChild(settingsBtn);
        actions.appendChild(removeBtn);

        row.appendChild(avatar);
        row.appendChild(info);
        row.appendChild(actions);
        item.appendChild(row);
        friendsListEl.appendChild(item);
      });
    }
  }

  if (friendsTodayList) {
    friendsTodayList.innerHTML = "";
    if (!friendsCache.length) {
      friendsTodayList.innerHTML = "<div class=\"muted\">No friends yet.</div>";
      if (friendsTodaySummary) {
        friendsTodaySummary.textContent = "";
      }
    } else {
      if (friendsTodaySummary) {
        const loggedCount = friendsCache.filter((friend) => friend.logged_today === true).length;
        friendsTodaySummary.textContent = `${loggedCount}/${friendsCache.length} logged today`;
      }
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
  if (!trendComparePanel) return;
  const selected = new Set(getSelectedFriendCodes());
  trendComparePanel.innerHTML = "";
  if (!friendsCache.length) {
    trendComparePanel.innerHTML = "<span class=\"muted\">No friends yet.</span>";
    if (trendCompareToggleBtn) {
      trendCompareToggleBtn.disabled = true;
    }
    setComparePanelVisible(false);
    return;
  }
  if (trendCompareToggleBtn) {
    trendCompareToggleBtn.disabled = false;
  }
  friendsCache.forEach((friend) => {
    const wrapper = document.createElement("label");
    wrapper.className = "chip";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = friend.friend_code;
    input.checked = selected.has(friend.friend_code);
    input.addEventListener("change", () => renderTrends());
    if (!friend.share_from_friend?.share_weight && !friend.share_from_friend?.share_waist) {
      input.disabled = true;
    }
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode(getFriendDisplayName(friend)));
    trendComparePanel.appendChild(wrapper);
  });
  setComparePanelVisible(comparePanelVisible);
}

function setComparePanelVisible(visible) {
  comparePanelVisible = visible;
  if (trendComparePanel) {
    trendComparePanel.style.display = visible ? "flex" : "none";
  }
  if (trendCompareToggleBtn) {
    trendCompareToggleBtn.textContent = visible ? "Hide" : "Show";
  }
}

function toggleComparePanel() {
  setComparePanelVisible(!comparePanelVisible);
}

async function ensureDefaultShareSettings() {
  if (!profile?.token) {
    return;
  }
  const known = loadKnownFriendCodes();
  const initialized = hasKnownFriendCodes();
  const currentCodes = new Set(friendsCache.map((friend) => friend.friend_code));
  if (!initialized) {
    saveKnownFriendCodes(currentCodes);
    return;
  }
  const pending = friendsCache.filter((friend) => !known.has(friend.friend_code));
  if (!pending.length) {
    saveKnownFriendCodes(currentCodes);
    return;
  }
  await Promise.all(
    pending.map((friend) => updateShareSettings(friend.friend_code, true, true, { silent: true })),
  );
  saveKnownFriendCodes(currentCodes);
}

async function refreshInbox() {
  if (!profile?.token) {
    return;
  }
  try {
    const data = await apiRequest("/v1/inbox", { token: profile.token });
    inviteCache = data.incoming_invites || [];
    friendsCache = data.friends || [];
    await ensureDefaultShareSettings();
    await refreshFriendHistory();
    renderInvites();
    renderFriends();
    renderTrendFriendOptions();
    renderReminders();
    const active = localStorage.getItem(ACTIVE_TAB_KEY);
    if (active === "chart") {
      renderTrends();
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

async function updateShareSettings(friendCode, shareWeight, shareWaist, { silent = false } = {}) {
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
    if (!silent) {
      setStatus("Share settings updated.");
    }
  } catch (err) {
    if (!silent) {
      setStatus(`Share update failed: ${formatError(err)}`);
    } else {
      logDebug(`share update failed: ${formatError(err)}`);
    }
  }
}

function openFriendReminder(friendCode, friendName) {
  if (!friendReminderModal || !friendReminderMessage) {
    const fallback = prompt(
      `Send a reminder to ${friendName || friendCode}:`,
      DEFAULT_FRIEND_REMINDER,
    );
    if (!fallback) {
      return;
    }
    void sendFriendReminderNow(friendCode, friendName, fallback);
    return;
  }
  friendReminderTarget = { code: friendCode, name: friendName || friendCode };
  if (friendReminderTitle) {
    friendReminderTitle.textContent = `Send reminder to ${friendReminderTarget.name}`;
  }
  if (!friendReminderMessage.value.trim()) {
    friendReminderMessage.value = DEFAULT_FRIEND_REMINDER;
  }
  friendReminderModal.classList.remove("hidden");
  friendReminderMessage.focus();
}

function closeFriendReminder() {
  if (!friendReminderModal) return;
  friendReminderModal.classList.add("hidden");
  friendReminderTarget = null;
}

function openFriendSettings(friend) {
  if (!friendSettingsModal) {
    renameFriend(friend);
    return;
  }
  friendSettingsTarget = { code: friend.friend_code };
  const displayName = getFriendDisplayName(friend);
  if (friendSettingsTitle) {
    friendSettingsTitle.textContent = `Settings · ${displayName}`;
  }
  if (friendSettingsName) {
    friendSettingsName.value = displayName;
  }
  const shareSettings = friend.share_settings || {};
  if (friendShareWeight) {
    friendShareWeight.checked = shareSettings.share_weight ?? true;
  }
  if (friendShareWaist) {
    friendShareWaist.checked = shareSettings.share_waist ?? true;
    friendShareWaist.disabled = !isTrackingWaist();
  }
  friendSettingsModal.classList.remove("hidden");
  friendSettingsName?.focus();
}

function closeFriendSettings() {
  if (!friendSettingsModal) return;
  friendSettingsModal.classList.add("hidden");
  friendSettingsTarget = null;
}

async function saveFriendSettings() {
  if (!friendSettingsTarget) return;
  const friend = friendsCache.find((item) => item.friend_code === friendSettingsTarget.code);
  const previousName = friend ? getFriendDisplayName(friend) : "";
  const nextName = friendSettingsName ? friendSettingsName.value.trim() : "";
  saveFriendAlias(friendSettingsTarget.code, nextName || null);
  const shareWeight = friendShareWeight?.checked ?? true;
  const shareWaist = friendShareWaist?.checked ?? true;
  const currentShare = friend?.share_settings || {};
  const shareChanged =
    Boolean(currentShare.share_weight) !== shareWeight || Boolean(currentShare.share_waist) !== shareWaist;
  if (shareChanged) {
    await updateShareSettings(friendSettingsTarget.code, shareWeight, shareWaist);
  } else {
    renderFriends();
  }
  if (nextName !== previousName) {
    setStatus("Friend updated.");
  }
  renderTrendFriendOptions();
  renderTrends();
  closeFriendSettings();
}

async function sendFriendReminderNow(friendCode, friendName, message) {
  if (!profile?.token) return;
  const text = (message || "").trim();
  if (!text) {
    return;
  }
  try {
    const result = await apiRequest("/v1/reminders", {
      method: "POST",
      token: profile.token,
      payload: { to_code: friendCode, message: text },
    });
    if (result.subscriptions === 0) {
      setStatus("Friend has not enabled push notifications.");
    } else if (result.sent > 0) {
      setStatus("Reminder sent.");
    } else {
      setStatus("Reminder queued.");
    }
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
  if (!trendComparePanel) return [];
  return Array.from(trendComparePanel.querySelectorAll("input[type=\"checkbox\"]"))
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
  if (selection === "1w") {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);
  } else if (selection === "1m") {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 29);
  } else if (selection === "3m") {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 89);
  } else if (selection === "1y") {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
  }
  if (!startDate) {
    return sorted;
  }
  const startMs = startOfLocalDay(startDate)?.getTime() ?? startDate.getTime();
  return sorted.filter((entry) => getEntryChartTime(entry) >= startMs);
}

function buildSeriesFromLocal(entries, metric, color, label, share) {
  if (share && share[metric] === false) {
    return { label, color, points: [], share };
  }
  const points = getRangeFiltered(entries)
    .map((entry) => ({
      x: getEntryChartTime(entry),
      y: metric === "weight" ? entry.weight_kg : entry.waist_cm,
      entry,
    }))
    .filter((point) => Number.isFinite(point.y));
  return { label, color, points, share };
}

function buildSeriesFromFriend(entries, metric, color, label, share) {
  if (share && share[metric] === false) {
    return { label, color, points: [], share };
  }
  const points = getRangeFiltered(entries)
    .filter((entry) => !entry.is_deleted)
    .map((entry) => ({
      x: getEntryChartTime(entry),
      y: metric === "weight" ? entry.weight_kg : entry.waist_cm,
      entry,
    }))
    .filter((point) => Number.isFinite(point.y));
  return { label, color, points, share };
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

function drawChart(canvas, seriesList, { unitLabel, xRange, goalValue, hoverX, highlightPoint } = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const styles = getComputedStyle(document.body);
  const gridColor = styles.getPropertyValue("--border") || "#e2e8f1";
  const textColor = styles.getPropertyValue("--muted-light") || "#73839a";
  const axisColor = styles.getPropertyValue("--border-strong") || "#c1cad7";
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth * dpr;
  const height = canvas.clientHeight * dpr;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  const padding = { left: 56 * dpr, right: 18 * dpr, top: 16 * dpr, bottom: 30 * dpr };

  const allPoints = seriesList.flatMap((series) => series.points || []);
  const hasPoints = allPoints.length > 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const fallbackNow = Date.now();
  const rawMinX = hasPoints ? Math.min(...allPoints.map((p) => p.x)) : fallbackNow - 6 * dayMs;
  const rawMaxX = hasPoints ? Math.max(...allPoints.map((p) => p.x)) : fallbackNow;
  const minX = xRange ? xRange.min : rawMinX;
  const maxX = xRange ? xRange.max : rawMaxX;
  const visibleSeries = seriesList.map((series) => {
    const points = (series.points || []).filter((p) => p.x >= minX && p.x <= maxX);
    return { ...series, points };
  });
  const visiblePoints = visibleSeries.flatMap((series) => series.points || []);
  let sourcePoints = visiblePoints.length ? visiblePoints : allPoints;
  if (!sourcePoints.length && goalValue != null && Number.isFinite(goalValue)) {
    sourcePoints = [{ x: minX, y: goalValue }, { x: maxX, y: goalValue }];
  }
  if (!sourcePoints.length) {
    ctx.fillStyle = textColor.trim();
    ctx.font = `${12 * dpr}px sans-serif`;
    ctx.fillText("No data yet.", padding.left, height / 2);
    return null;
  }
  const yValues = sourcePoints.map((p) => p.y);
  if (goalValue != null && Number.isFinite(goalValue)) {
    yValues.push(goalValue);
  }
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padY = Math.max(rangeY * 0.1, 1);
  const yMin = minY - padY;
  const yMax = maxY + padY;
  const yRange = yMax - yMin || 1;

  const yTicks = [yMax, (yMax + yMin) / 2, yMin];
  ctx.fillStyle = textColor.trim();
  ctx.font = `${11 * dpr}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const maxLabelWidth = Math.max(
    ...yTicks.map((tick) => {
      const label = `${tick.toFixed(1)}${unitLabel ? ` ${unitLabel}` : ""}`;
      return ctx.measureText(label).width;
    }),
  );
  padding.left = Math.max(padding.left, maxLabelWidth + 12 * dpr);

  ctx.strokeStyle = gridColor.trim();
  ctx.lineWidth = 1 * dpr;
  ctx.setLineDash([]);
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) * i) / gridCount;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 3; i += 1) {
    const x = padding.left + ((width - padding.left - padding.right) * i) / 3;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }

  ctx.strokeStyle = axisColor.trim();
  ctx.lineWidth = 1.2 * dpr;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = textColor.trim();
  ctx.font = `${11 * dpr}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  yTicks.forEach((tick) => {
    const y = padding.top + (1 - (tick - yMin) / yRange) * (height - padding.top - padding.bottom);
    const label = `${tick.toFixed(1)}${unitLabel ? ` ${unitLabel}` : ""}`;
    ctx.fillText(label, padding.left - 8 * dpr, y);
  });

  if (goalValue != null && Number.isFinite(goalValue)) {
    const y = padding.top + (1 - (goalValue - yMin) / yRange) * (height - padding.top - padding.bottom);
    ctx.strokeStyle = "rgba(240, 155, 85, 0.85)";
    ctx.lineWidth = 2.2 * dpr;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  visibleSeries.forEach((series) => {
    if (!series.points.length) return;
    const lineWidth = (series.lineWidth || 2) * dpr;
    ctx.strokeStyle = series.color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
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
        ctx.arc(x, y, 3 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      });
    }
  });

  if (
    highlightPoint &&
    Number.isFinite(highlightPoint.x) &&
    Number.isFinite(highlightPoint.y) &&
    highlightPoint.x >= minX &&
    highlightPoint.x <= maxX
  ) {
    const x = padding.left + ((highlightPoint.x - minX) / rangeX) * (width - padding.left - padding.right);
    const y = padding.top + (1 - (highlightPoint.y - yMin) / yRange) * (height - padding.top - padding.bottom);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.arc(x, y, 6 * dpr, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (hoverX != null && hoverX >= minX && hoverX <= maxX) {
    const x = padding.left + ((hoverX - minX) / rangeX) * (width - padding.left - padding.right);
    ctx.strokeStyle = "rgba(100, 110, 125, 0.6)";
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }

  const tickCount = 5;
  const tickSpacingOptions = [
    { maxDays: 7, step: 1 },
    { maxDays: 14, step: 2 },
    { maxDays: 31, step: 5 },
  ];
  const startDay = startOfLocalDay(new Date(minX))?.getTime() ?? minX;
  const endDay = startOfLocalDay(new Date(maxX))?.getTime() ?? maxX;
  const rangeDays = Math.max(1, Math.round((endDay - startDay) / dayMs) + 1);
  let stepDays = Math.ceil(rangeDays / (tickCount - 1));
  tickSpacingOptions.forEach((option) => {
    if (rangeDays <= option.maxDays) {
      stepDays = option.step;
    }
  });
  const ticks = [];
  for (let dayOffset = 0; dayOffset < rangeDays; dayOffset += stepDays) {
    if (ticks.length >= tickCount - 1) break;
    ticks.push(startDay + dayOffset * dayMs);
  }
  if (!ticks.length || ticks[ticks.length - 1] !== endDay) {
    ticks.push(endDay);
  }
  ctx.fillStyle = textColor.trim();
  ctx.font = `${11 * dpr}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ticks.forEach((tick) => {
    const x = padding.left + ((tick - minX) / rangeX) * (width - padding.left - padding.right);
    const label = formatDateLabel(new Date(tick));
    ctx.fillText(label, x, height - 6 * dpr);
  });

  return { minX, maxX, yMin, yMax, padding, width, height, rangeX, yRange };
}

function renderTrends() {
  if (!weightChart || !waistChart) {
    return;
  }
  const palette = ["#4f8cf7", "#f08b7f", "#6ac28a", "#9b7bff", "#f0b24b", "#44bcd8"];
  const baseSeries = [];
  const visibleEntries = getVisibleEntries();
  const ownShare = { weight: true, waist: isTrackingWaist() };
  baseSeries.push({
    label: profile?.display_name || "You",
    weight: buildSeriesFromLocal(visibleEntries, "weight", palette[0], "You", ownShare),
    waist: buildSeriesFromLocal(visibleEntries, "waist", palette[0], "You", ownShare),
    color: palette[0],
    share: ownShare,
  });
  const selected = getSelectedFriendCodes();
  selected.forEach((code, index) => {
    const friend = friendsCache.find((item) => item.friend_code === code);
    const entries = friendHistoryCache.get(code) || [];
    const label = getFriendDisplayName(friend || { friend_code: code, display_name: code });
    const color = palette[(index + 1) % palette.length];
    const share = {
      weight: Boolean(friend?.share_from_friend?.share_weight),
      waist: Boolean(friend?.share_from_friend?.share_waist),
    };
    baseSeries.push({
      label,
      weight: buildSeriesFromFriend(entries, "weight", color, label, share),
      waist: buildSeriesFromFriend(entries, "waist", color, label, share),
      color,
      share,
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
  const showGoals = trendGoalsCheckbox?.checked ?? true;

  const weightSeries = [];
  const waistSeries = [];
  baseSeries.forEach((series) => {
    const weightDisplay = convertSeriesToDisplay(series.weight, "weight");
    const waistDisplay = convertSeriesToDisplay(series.waist, "waist");
    if (showRaw) {
      weightSeries.push({ ...weightDisplay, color: series.color, showPoints: true, lineWidth: 1.5, share: series.share });
      waistSeries.push({ ...waistDisplay, color: series.color, showPoints: true, lineWidth: 1.5, share: series.share });
    }
  });

  const today = new Date();
  const selection = trendRangeSelect?.value || "all";
  if (selection !== trendRangeSelection) {
    trendRangeSelection = selection;
    trendViewRange = null;
  }
  let xRange = null;
  if (selection === "1w") {
    const min = new Date(today);
    min.setDate(min.getDate() - 6);
    xRange = {
      min: startOfLocalDay(min)?.getTime() ?? min.getTime(),
      max: endOfLocalDay(today)?.getTime() ?? today.getTime(),
    };
  } else if (selection === "1m") {
    const min = new Date(today);
    min.setDate(min.getDate() - 29);
    xRange = {
      min: startOfLocalDay(min)?.getTime() ?? min.getTime(),
      max: endOfLocalDay(today)?.getTime() ?? today.getTime(),
    };
  } else if (selection === "3m") {
    const min = new Date(today);
    min.setDate(min.getDate() - 89);
    xRange = {
      min: startOfLocalDay(min)?.getTime() ?? min.getTime(),
      max: endOfLocalDay(today)?.getTime() ?? today.getTime(),
    };
  } else if (selection === "1y") {
    const min = new Date(today);
    min.setDate(min.getDate() - 364);
    xRange = {
      min: startOfLocalDay(min)?.getTime() ?? min.getTime(),
      max: endOfLocalDay(today)?.getTime() ?? today.getTime(),
    };
  }

  const weightGoal = showGoals && profile?.goal_weight_kg != null
    ? (getWeightUnit() === "kg" ? profile.goal_weight_kg : kgToLbs(profile.goal_weight_kg))
    : null;
  const waistGoal = showGoals && profile?.goal_waist_cm != null
    ? (getWaistUnit() === "cm" ? profile.goal_waist_cm : cmToIn(profile.goal_waist_cm))
    : null;

  const extents = getChartExtents(weightSeries.concat(waistSeries));
  const baseRange = xRange || extents;
  if (!trendViewRange && baseRange) {
    trendViewRange = { ...baseRange };
  }
  trendState = {
    weightSeries,
    waistSeries,
    xRange: trendViewRange || xRange,
    baseRange,
    extents,
    weightGoal,
    waistGoal,
  };
  drawTrendCharts();
  if (trendLockedEntry) {
    lockTrendEntry(trendLockedEntry);
  }
}

function drawTrendCharts() {
  if (!trendState) return;
  const locked = trendLockedEntry?.entry || trendLockedEntry;
  const share = trendLockedEntry?.share || { weight: true, waist: isTrackingWaist() };
  const showWeight = locked && share.weight !== false && Number.isFinite(locked.weight_kg);
  const showWaist = locked && share.waist !== false && isTrackingWaist() && Number.isFinite(locked.waist_cm);
  const lockedX = locked ? getEntryChartTime(locked) : null;
  const weightHighlight = showWeight
    ? {
        x: lockedX,
        y: getWeightUnit() === "kg" ? locked.weight_kg : kgToLbs(locked.weight_kg),
      }
    : null;
  const waistHighlight = showWaist
    ? {
        x: lockedX,
        y: getWaistUnit() === "cm" ? locked.waist_cm : cmToIn(locked.waist_cm),
      }
    : null;
  const weightMeta = drawChart(weightChart, trendState.weightSeries, {
    unitLabel: getWeightUnit(),
    xRange: trendState.xRange,
    goalValue: trendState.weightGoal,
    hoverX: trendHoverX,
    highlightPoint: weightHighlight,
  });
  if (isTrackingWaist()) {
    const waistMeta = drawChart(waistChart, trendState.waistSeries, {
      unitLabel: getWaistUnit(),
      xRange: trendState.xRange,
      goalValue: trendState.waistGoal,
      hoverX: trendHoverX,
      highlightPoint: waistHighlight,
    });
    trendState.chartMeta = { weight: weightMeta, waist: waistMeta };
  } else {
    trendState.chartMeta = { weight: weightMeta, waist: null };
  }
}

function handleTrendHover(event, metric) {
  if (!trendState) return;
  if (trendLockedEntry) return;
  const canvas = metric === "weight" ? weightChart : waistChart;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const xPos = event.clientX - rect.left;
  const extents = trendState.xRange || trendState.extents;
  if (!extents) return;
  const hoverX = extents.min + (xPos / rect.width) * (extents.max - extents.min);
  trendHoverX = hoverX;

  const seriesList = metric === "weight" ? trendState.weightSeries : trendState.waistSeries;
  let best = null;
  seriesList.forEach((series) => {
    series.points.forEach((point) => {
      if (point.x < extents.min || point.x > extents.max) {
        return;
      }
      const distance = Math.abs(point.x - hoverX);
      if (!best || distance < best.distance) {
        best = { distance, point, label: series.label };
      }
    });
  });
  if (best && trendHoverEl) {
    const dateLabel = formatDateLabel(new Date(best.point.x));
    const valueLabel = metric === "weight"
      ? `${best.point.y.toFixed(1)} ${getWeightUnit()}`
      : `${best.point.y.toFixed(1)} ${getWaistUnit()}`;
    trendHoverEl.textContent = `${dateLabel} · ${best.label}: ${valueLabel}`;
  } else if (trendHoverEl) {
    trendHoverEl.textContent = "";
  }
  drawTrendCharts();
}

function clearTrendHover() {
  if (trendLockedEntry) return;
  trendHoverX = null;
  if (trendHoverEl) {
    trendHoverEl.textContent = "";
  }
  drawTrendCharts();
}

function handleTrendClick(event, metric) {
  if (!trendState) return;
  const canvas = metric === "weight" ? weightChart : waistChart;
  if (!canvas) return;
  const meta = getChartMeta(metric);
  if (!meta) return;
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  const seriesList = metric === "weight" ? trendState.weightSeries : trendState.waistSeries;
  const nearest = findNearestSeriesPoint(seriesList, meta, clickX, clickY);
  if (!nearest) {
    if (trendLockedEntry) {
      clearTrendLock();
    }
    return;
  }
  const entry = nearest.point.entry;
  if (!entry) return;
  const label = nearest.series.label;
  const share = nearest.series.share || { weight: true, waist: isTrackingWaist() };
  const key = getEntryKey(entry, label);
  if (trendLockedEntry?.key === key) {
    clearTrendLock();
    return;
  }
  lockTrendEntry({ entry, label, share, metric, key });
}

function startTrendDrag(event, metric) {
  if (!trendState) return;
  const canvas = metric === "weight" ? weightChart : waistChart;
  if (!canvas) return;
  const range = trendState.xRange || trendState.baseRange || trendState.extents;
  if (!range) return;
  trendDragging = {
    canvas,
    startX: event.clientX,
    range: { ...range },
  };
}

function moveTrendDrag(event) {
  if (!trendDragging) return;
  panTrend(trendDragging.canvas, event.clientX - trendDragging.startX, trendDragging.range);
}

function endTrendDrag() {
  trendDragging = null;
}

function handleTrendWheel(event, metric) {
  const canvas = metric === "weight" ? weightChart : waistChart;
  if (!canvas) return;
  event.preventDefault();
  zoomTrendAt(canvas, {
    zoomIn: event.deltaY < 0,
    x: event.clientX - canvas.getBoundingClientRect().left,
  });
}

function handleTrendTouchStart(event, metric) {
  if (!trendState) return;
  const canvas = metric === "weight" ? weightChart : waistChart;
  if (!canvas) return;
  if (event.touches.length === 2) {
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    const range = trendState.xRange || trendState.baseRange || trendState.extents;
    trendPinch = { dist, range, canvas };
  } else if (event.touches.length === 1) {
    startTrendDrag(event.touches[0], metric);
  }
}

function handleTrendTouchMove(event, metric) {
  if (trendPinch && event.touches.length === 2) {
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    if (trendPinch.dist && trendPinch.range) {
      const factor = trendPinch.dist / dist;
      zoomTrendAt(trendPinch.canvas, { zoomIn: factor < 1, x: trendPinch.canvas.getBoundingClientRect().width / 2 }, factor);
    }
    event.preventDefault();
  } else if (trendDragging && event.touches.length === 1) {
    moveTrendDrag(event.touches[0]);
  } else if (event.touches.length === 1) {
    handleTrendHover(event.touches[0], metric);
  }
}

function handleTrendTouchEnd() {
  trendPinch = null;
  endTrendDrag();
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
  profile.last_sync_at = new Date().toISOString();
  saveProfile(profile);
  updateRelayLastSync();
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
  await loadEntries();
  showToast("Saved.");
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
      setStatus("Relay token missing. Please re-register this device.");
    } else if (message.includes("user_id already registered")) {
      setStatus("Relay token missing. Please re-register this device.");
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

  if (friendsButton) {
    friendsButton.addEventListener("click", openFriends);
  }
  if (friendsCloseBtn) {
    friendsCloseBtn.addEventListener("click", closeFriends);
  }
  if (offlineDismissBtn) {
    offlineDismissBtn.addEventListener("click", () => {
      if (offlineBanner) {
        offlineBanner.classList.add("hidden");
      }
    });
  }

  if (logEntryOpenBtn) {
    logEntryOpenBtn.addEventListener("click", () => startNewEntry());
  }
  if (logbookAddBtn) {
    logbookAddBtn.addEventListener("click", () => startNewEntry());
  }
  if (logEntryCloseBtn) {
    logEntryCloseBtn.addEventListener("click", cancelEdit);
  }
  if (logEntryModal) {
    logEntryModal.addEventListener("click", (event) => {
      if (event.target === logEntryModal) {
        cancelEdit();
      }
    });
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

  if (reconnectRelayBtn) {
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
  }

  if (resetIdentityBtn) {
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
  }

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
      if (logbookFilterSelect) logbookFilterSelect.value = "all";
      renderHistory();
    });
  }
  if (historyExportBtn) {
    historyExportBtn.addEventListener("click", () => {
      exportHistoryCsv();
      pulseButton(historyExportBtn, "Exported");
    });
  }

  if (settingsExportBtn) {
    settingsExportBtn.addEventListener("click", () => {
      exportHistoryCsv();
      pulseButton(settingsExportBtn, "Exported");
    });
  }

  if (logbookFilterSelect) {
    logbookFilterSelect.addEventListener("change", renderHistory);
  }

  if (todayTile) {
    todayTile.addEventListener("click", () => {
      const today = toLocalDateString(new Date());
      if (historyFromInput) historyFromInput.value = today;
      if (historyToInput) historyToInput.value = today;
      if (logbookFilterSelect) logbookFilterSelect.value = "all";
      renderHistory();
      activateTab("logbook");
    });
  }
  if (trendTile) {
    trendTile.addEventListener("click", () => activateTab("chart"));
  }
  if (bestTile) {
    bestTile.addEventListener("click", () => {
      if (logbookFilterSelect) logbookFilterSelect.value = "best10";
      renderHistory();
      activateTab("logbook");
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
  if (trendGoalsCheckbox) {
    trendGoalsCheckbox.addEventListener("change", () => renderTrends());
  }
  if (trendCompareToggleBtn) {
    trendCompareToggleBtn.addEventListener("click", () => {
      toggleComparePanel();
    });
  }
  if (trendCompareClearBtn) {
    trendCompareClearBtn.addEventListener("click", () => {
      if (!trendComparePanel) return;
      trendComparePanel.querySelectorAll("input[type=\"checkbox\"]").forEach((input) => {
        input.checked = false;
      });
      renderTrends();
    });
  }

  if (weightChart) {
    weightChart.addEventListener("mousemove", (event) => handleTrendHover(event, "weight"));
    weightChart.addEventListener("mouseleave", clearTrendHover);
    weightChart.addEventListener("click", (event) => handleTrendClick(event, "weight"));
    weightChart.addEventListener("wheel", (event) => handleTrendWheel(event, "weight"), { passive: false });
    weightChart.addEventListener("mousedown", (event) => startTrendDrag(event, "weight"));
    weightChart.addEventListener("touchstart", (event) => handleTrendTouchStart(event, "weight"), { passive: false });
    weightChart.addEventListener("touchmove", (event) => handleTrendTouchMove(event, "weight"), { passive: false });
    weightChart.addEventListener("touchend", handleTrendTouchEnd);
    weightChart.addEventListener("touchend", clearTrendHover);
  }
  if (waistChart) {
    waistChart.addEventListener("mousemove", (event) => handleTrendHover(event, "waist"));
    waistChart.addEventListener("mouseleave", clearTrendHover);
    waistChart.addEventListener("click", (event) => handleTrendClick(event, "waist"));
    waistChart.addEventListener("wheel", (event) => handleTrendWheel(event, "waist"), { passive: false });
    waistChart.addEventListener("mousedown", (event) => startTrendDrag(event, "waist"));
    waistChart.addEventListener("touchstart", (event) => handleTrendTouchStart(event, "waist"), { passive: false });
    waistChart.addEventListener("touchmove", (event) => handleTrendTouchMove(event, "waist"), { passive: false });
    waistChart.addEventListener("touchend", handleTrendTouchEnd);
    waistChart.addEventListener("touchend", clearTrendHover);
  }
  document.addEventListener("mousemove", moveTrendDrag);
  document.addEventListener("mouseup", endTrendDrag);
  if (trendResetViewBtn) {
    trendResetViewBtn.addEventListener("click", resetTrendView);
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

  if (friendReminderCancel) {
    friendReminderCancel.addEventListener("click", closeFriendReminder);
  }
  if (friendReminderModal) {
    friendReminderModal.addEventListener("click", (event) => {
      if (event.target === friendReminderModal) {
        closeFriendReminder();
      }
    });
  }
  if (friendReminderSend) {
    friendReminderSend.addEventListener("click", async () => {
      if (!friendReminderTarget) return;
      const message = friendReminderMessage?.value || DEFAULT_FRIEND_REMINDER;
      await sendFriendReminderNow(friendReminderTarget.code, friendReminderTarget.name, message);
      closeFriendReminder();
      pulseButton(friendReminderSend, "Sent");
    });
  }

  if (friendSettingsClose) {
    friendSettingsClose.addEventListener("click", closeFriendSettings);
  }
  if (friendSettingsModal) {
    friendSettingsModal.addEventListener("click", (event) => {
      if (event.target === friendSettingsModal) {
        closeFriendSettings();
      }
    });
  }
  if (friendSettingsSave) {
    friendSettingsSave.addEventListener("click", async () => {
      await saveFriendSettings();
      pulseButton(friendSettingsSave, "Saved");
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
      updateSummaryTiles();
    });
  }

  if (displayEmphasisSelect) {
    displayEmphasisSelect.addEventListener("change", () => {
      if (!profile) return;
      profile.display_emphasis = displayEmphasisSelect.value;
      saveProfile(profile);
      applySummaryEmphasis();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      if (!profile) return;
      profile.start_date = startDateInput.value;
      saveProfile(profile);
      renderHistory();
      renderTrends();
      updateSummaryTiles();
      applyEntryDefaults(getVisibleEntries()[0] || null);
    });
  }

  if (freshStartCheckbox) {
    freshStartCheckbox.addEventListener("change", () => {
      if (!profile) return;
      profile.fresh_start = freshStartCheckbox.checked;
      saveProfile(profile);
      renderHistory();
      renderTrends();
      updateSummaryTiles();
      applyEntryDefaults(getVisibleEntries()[0] || null);
    });
  }

  if (weightUnitSelect) {
    weightUnitSelect.addEventListener("change", () => {
      if (!profile) return;
      profile.weight_unit = weightUnitSelect.value;
      saveProfile(profile);
      updateUnitLabels();
      applyGoalInputs();
      applyEntryDefaults(getVisibleEntries()[0] || null);
      renderHistory();
      renderTrends();
      updateSummaryTiles();
    });
  }

  if (waistUnitSelect) {
    waistUnitSelect.addEventListener("change", () => {
      if (!profile) return;
      profile.waist_unit = waistUnitSelect.value;
      saveProfile(profile);
      updateUnitLabels();
      applyGoalInputs();
      applyEntryDefaults(getVisibleEntries()[0] || null);
      renderHistory();
      renderTrends();
      updateSummaryTiles();
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
  setComparePanelVisible(false);
  updateOfflineBanner();
  window.addEventListener("online", updateOfflineBanner);
  window.addEventListener("offline", updateOfflineBanner);
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
    setStatus("Ready.", { persist: false });
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
  applyEntryDefaults(getVisibleEntries()[0] || null);

  if (!profile || !profile.token) {
    setPushStatus("Relay not connected.");
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
