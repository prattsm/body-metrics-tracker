const APP_VERSION = "pwa-0.2.1";
const RELAY_URL_DEFAULT = "/relay";
const PROFILE_KEY = "bmt_pwa_profile_v1";
const HISTORY_SYNC_KEY = "bmt_pwa_history_sync_v1";
const FRIEND_HISTORY_SYNC_KEY = "bmt_pwa_friend_history_sync_v1";
const ACTIVE_TAB_KEY = "bmt_pwa_active_tab_v1";
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
const reminderBannerEl = document.getElementById("reminderBanner");
const friendsTodayList = document.getElementById("friendsTodayList");
const trendRangeSelect = document.getElementById("trendRange");
const trendFriendsEl = document.getElementById("trendFriends");
const trendLegendEl = document.getElementById("trendLegend");
const weightChart = document.getElementById("weightChart");
const waistChart = document.getElementById("waistChart");
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
const reminderInboxEl = document.getElementById("reminderInbox");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

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
  if (weightInput && latestEntry && Number.isFinite(latestEntry.weight)) {
    weightInput.value = String(latestEntry.weight);
  }
  if (waistInput && latestEntry && Number.isFinite(latestEntry.waist)) {
    waistInput.value = String(latestEntry.waist);
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
  if (name === "reminders") {
    renderReminders();
  }
}

function initTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
  const saved = localStorage.getItem(ACTIVE_TAB_KEY) || "home";
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
  if (historyRangeSelect) {
    historyRangeSelect.disabled = disabled;
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
    return;
  }
  todayStatusEl.textContent = "Logged";
  todaySummaryEl.textContent = `${entry.weight ?? "--"} lbs · ${entry.waist ?? "--"} in`;
}

function formatDateLabel(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTimeLabel(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function avatarSrc(avatar) {
  if (!avatar) return "";
  if (avatar.startsWith("data:")) {
    return avatar;
  }
  return `data:image/png;base64,${avatar}`;
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
    dismiss.textContent = "Dismiss";
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
    return;
  }
  const message = reminderMessageInput.value.trim();
  const timeValue = reminderTimeInput.value;
  if (!message || !timeValue) {
    setStatus("Reminder needs a message and time.");
    return;
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

  if (reminderInboxEl) {
    reminderInboxEl.innerHTML = "";
    if (!reminderInboxCache.length) {
      reminderInboxEl.innerHTML = "<div class=\"muted\">No reminders yet.</div>";
    } else {
      reminderInboxCache.forEach((reminder) => {
        const item = document.createElement("div");
        item.className = "list-item";
        const title = document.createElement("strong");
        title.textContent = reminder.message;
        const meta = document.createElement("div");
        meta.className = "muted";
        const from = reminder.from_name || reminder.from_code || "Friend";
        meta.textContent = `${from} · ${formatDateLabel(reminder.created_at)} ${formatTimeLabel(reminder.created_at)}`;
        item.appendChild(title);
        item.appendChild(meta);
        reminderInboxEl.appendChild(item);
      });
    }
  }
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
      friendsCache.forEach((friend) => {
        const item = document.createElement("div");
        item.className = "list-item";
        const row = document.createElement("div");
        row.className = "friend-row";
        const avatar = document.createElement("img");
        avatar.className = "avatar";
        avatar.alt = friend.display_name || friend.friend_code;
        const src = avatarSrc(friend.avatar_b64 || "");
        if (src) {
          avatar.src = src;
        }
        const info = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = friend.display_name || friend.friend_code;
        const meta = document.createElement("div");
        meta.className = "muted";
        const logged = friend.logged_today === null ? "Status unknown" : friend.logged_today ? "Logged today" : "Not logged yet";
        const shared = friend.share_from_friend?.share_weight || friend.share_from_friend?.share_waist ? "" : " · Not sharing";
        meta.textContent = `${logged}${shared}`;
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
        reminderBtn.addEventListener("click", () => sendFriendReminder(friend.friend_code, friend.display_name));

        const removeBtn = document.createElement("button");
        removeBtn.className = "secondary";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => removeFriend(friend.friend_code));

        actions.appendChild(shareRow);
        actions.appendChild(reminderBtn);
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
    } else {
      friendsCache.forEach((friend) => {
        const pill = document.createElement("div");
        const statusClass = friend.logged_today === null ? "unknown" : friend.logged_today ? "logged" : "missing";
        pill.className = `friend-pill ${statusClass}`;
        const dot = document.createElement("span");
        dot.className = "status-dot";
        const avatar = document.createElement("img");
        avatar.className = "avatar";
        const src = avatarSrc(friend.avatar_b64 || "");
        if (src) {
          avatar.src = src;
        }
        const label = document.createElement("span");
        label.textContent = friend.display_name || friend.friend_code;
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
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode(friend.display_name || friend.friend_code));
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
      const from = reminder.from_name || reminder.from_code || "Friend";
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
    return;
  }
  const code = inviteCodeInput.value.trim();
  if (!code) {
    inviteStatusEl.textContent = "Enter a friend code.";
    return;
  }
  try {
    const result = await apiRequest("/v1/invites", {
      method: "POST",
      token: profile.token,
      payload: { to_code: code },
    });
    inviteStatusEl.textContent = result.status === "sent" ? "Invite sent." : "Already connected.";
    inviteCodeInput.value = "";
  } catch (err) {
    inviteStatusEl.textContent = formatError(err);
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
  const rangeValue = trendRangeSelect ? trendRangeSelect.value : "30";
  const sorted = [...entries].sort((a, b) => (b.measured_at || "").localeCompare(a.measured_at || ""));
  if (rangeValue === "all") {
    return sorted.slice().reverse();
  }
  const limit = parseInt(rangeValue, 10);
  if (Number.isNaN(limit)) {
    return sorted.slice().reverse();
  }
  return sorted.slice(0, limit).reverse();
}

function buildSeriesFromLocal(entries, metric, color, label) {
  const points = getRangeFiltered(entries)
    .map((entry) => ({
      x: new Date(entry.measured_at).getTime(),
      y: metric === "weight" ? entry.weight : entry.waist,
    }))
    .filter((point) => Number.isFinite(point.y));
  return { label, color, points };
}

function buildSeriesFromFriend(entries, metric, color, label) {
  const points = getRangeFiltered(entries)
    .filter((entry) => !entry.is_deleted)
    .map((entry) => ({
      x: new Date(entry.measured_at).getTime(),
      y: metric === "weight" ? kgToLbs(entry.weight_kg) : cmToIn(entry.waist_cm),
    }))
    .filter((point) => Number.isFinite(point.y));
  return { label, color, points };
}

function drawChart(canvas, seriesList, unitLabel) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth * dpr;
  const height = canvas.clientHeight * dpr;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  const padding = { left: 46, right: 16, top: 16, bottom: 30 };

  const allPoints = seriesList.flatMap((series) => series.points);
  if (!allPoints.length) {
    ctx.fillStyle = "#73839a";
    ctx.font = `${12 * dpr}px sans-serif`;
    ctx.fillText("No data yet.", padding.left, height / 2);
    return;
  }
  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padY = rangeY * 0.1;
  const yMin = minY - padY;
  const yMax = maxY + padY;
  const yRange = yMax - yMin || 1;

  ctx.strokeStyle = "#e2e8f1";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  const yTicks = [yMax, (yMax + yMin) / 2, yMin];
  ctx.fillStyle = "#73839a";
  ctx.font = `${11 * dpr}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  yTicks.forEach((tick) => {
    const y = padding.top + (1 - (tick - yMin) / yRange) * (height - padding.top - padding.bottom);
    const label = `${tick.toFixed(1)}${unitLabel ? ` ${unitLabel}` : ""}`;
    ctx.fillText(label, padding.left - 6, y);
  });

  seriesList.forEach((series) => {
    if (!series.points.length) return;
    ctx.strokeStyle = series.color;
    ctx.lineWidth = 2 * dpr;
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

    ctx.fillStyle = series.color;
    series.points.forEach((point) => {
      const x = padding.left + ((point.x - minX) / rangeX) * (width - padding.left - padding.right);
      const y = padding.top + (1 - (point.y - yMin) / yRange) * (height - padding.top - padding.bottom);
      ctx.beginPath();
      ctx.arc(x, y, 2.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  const tickCount = 4;
  ctx.fillStyle = "#73839a";
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
  const palette = ["#3f8cff", "#f08b7f", "#6ac28a", "#9b7bff", "#f0b24b", "#44bcd8"];
  const seriesWeight = [];
  const seriesWaist = [];
  seriesWeight.push(buildSeriesFromLocal(entriesCache, "weight", palette[0], "You"));
  seriesWaist.push(buildSeriesFromLocal(entriesCache, "waist", palette[0], "You"));

  const selected = getSelectedFriendCodes();
  selected.forEach((code, index) => {
    const friend = friendsCache.find((item) => item.friend_code === code);
    const entries = friendHistoryCache.get(code) || [];
    const label = friend?.display_name || code;
    const color = palette[(index + 1) % palette.length];
    seriesWeight.push(buildSeriesFromFriend(entries, "weight", color, label));
    seriesWaist.push(buildSeriesFromFriend(entries, "waist", color, label));
  });

  if (trendLegendEl) {
    trendLegendEl.innerHTML = "";
    seriesWeight.forEach((series) => {
      if (!series.label) return;
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

  drawChart(weightChart, seriesWeight, "lb");
  drawChart(waistChart, seriesWaist, "in");
}

async function syncStatusToRelay() {
  if (!profile?.token) {
    return;
  }
  const latestEntry = entriesCache[0];
  const today = toLocalDateString(new Date());
  const loggedToday = entriesCache.some((entry) => entry.date_local === today);
  await apiRequest("/v1/status", {
    method: "POST",
    token: profile.token,
    payload: {
      logged_today: loggedToday,
      last_entry_date: latestEntry?.date_local || null,
      weight_kg: latestEntry?.weight != null ? lbsToKg(latestEntry.weight) : null,
      waist_cm: latestEntry?.waist != null ? inToCm(latestEntry.waist) : null,
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
    entries.push({
      entry_id: record.id,
      measured_at: record.measured_at,
      date_local: record.date_local,
      weight_kg: payload?.weight != null ? lbsToKg(payload.weight) : null,
      waist_cm: payload?.waist != null ? inToCm(payload.waist) : null,
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

  if (trendRangeSelect) {
    trendRangeSelect.addEventListener("change", () => renderTrends());
  }

  if (sendInviteBtn) {
    sendInviteBtn.addEventListener("click", async () => {
      await sendInvite();
    });
  }

  if (addReminderBtn) {
    addReminderBtn.addEventListener("click", async () => {
      await addReminder();
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
