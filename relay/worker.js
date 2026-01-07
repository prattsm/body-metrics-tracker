export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    try {
      if (url.pathname === "/v1/register" && request.method === "POST") {
        return corsResponse(await handleRegister(request, env));
      }
      if (url.pathname === "/v1/profile" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(await handleProfileUpdate(request, env, user));
      }
      if (url.pathname === "/v1/history" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(await handleHistoryPush(request, env, user));
      }
      if (url.pathname === "/v1/history" && request.method === "GET") {
        const user = await requireAuth(request, env);
        return corsResponse(await handleHistoryFetch(request, env, user));
      }
      if (url.pathname === "/v1/friends/remove" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(await handleRemoveFriend(request, env, user));
      }
      if (url.pathname === "/v1/invites" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(await handleSendInvite(request, env, user));
      }
      if (url.pathname === "/v1/invites/accept" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(await handleAcceptInvite(request, env, user));
      }
      if (url.pathname === "/v1/inbox" && request.method === "GET") {
        const user = await requireAuth(request, env);
        return corsResponse(await handleInbox(env, user));
      }
      if (url.pathname === "/v1/share-settings" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(await handleShareSettings(request, env, user));
      }
      if (url.pathname === "/v1/status" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(await handleStatus(request, env, user));
      }
      if (url.pathname === "/v1/reminders" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(await handleReminder(request, env, user));
      }
      if (url.pathname === "/v1/ping" && request.method === "GET") {
        return corsResponse({ status: "ok" });
      }
      if (url.pathname === "/v1/push/vapid" && request.method === "GET") {
        return corsResponse(handleVapidPublic(env));
      }
      if (url.pathname === "/v1/push/subscribe" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(await handlePushSubscribe(request, env, user));
      }
      if (url.pathname === "/v1/push/unsubscribe" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(await handlePushUnsubscribe(request, env, user));
      }
      if (url.pathname === "/v1/push/test" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(await handlePushTest(env, user));
      }
    } catch (err) {
      return corsResponse(
        jsonResponse({ error: err.message || "Server error" }, err.status || 400),
      );
    }

    return corsResponse(jsonResponse({ error: "Not found" }, 404));
  },
};

const MAX_AVATAR_LENGTH = 60000;

function corsResponse(response, statusOverride) {
  if (!response) {
    return new Response(null, { status: statusOverride || 204, headers: corsHeaders() });
  }
  if (response instanceof Response) {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders())) {
      headers.set(key, value);
    }
    return new Response(response.body, { status: response.status, headers });
  }
  return jsonResponse(response, statusOverride);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function handleRegister(request, env) {
  const body = await request.json();
  const userId = toText(body.user_id);
  const friendCode = toText(body.friend_code);
  const displayName = toText(body.display_name) || "User";
  const avatar = normalizeAvatar(body.avatar_b64);
  if (!userId || !friendCode) {
    throw badRequest("user_id and friend_code are required");
  }
  const existing = await env.DB.prepare(
    "SELECT user_id FROM users WHERE friend_code = ?",
  )
    .bind(friendCode)
    .first();
  if (existing) {
    if (existing.user_id !== userId) {
      throw badRequest("friend_code already registered");
    }
    const token = randomToken();
    const tokenHash = await sha256(token);
    await env.DB.prepare(
      "UPDATE users SET display_name = ?, avatar_b64 = ?, token_hash = ? WHERE user_id = ?",
    )
      .bind(displayName, avatar, tokenHash, userId)
      .run();
    return { token, friend_code: friendCode, user_id: userId, reissued: true };
  }
  const existingUser = await env.DB.prepare(
    "SELECT friend_code FROM users WHERE user_id = ?",
  )
    .bind(userId)
    .first();
  if (existingUser) {
    throw badRequest("user_id already registered");
  }
  const token = randomToken();
  const tokenHash = await sha256(token);
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO users (user_id, friend_code, display_name, avatar_b64, token_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(userId, friendCode, displayName, avatar, tokenHash, createdAt)
    .run();
  return { token, friend_code: friendCode, user_id: userId };
}

async function handleProfileUpdate(request, env, user) {
  const body = await request.json();
  const displayName = toText(body.display_name) || "User";
  const avatar = normalizeAvatar(body.avatar_b64);
  await env.DB.prepare(
    "UPDATE users SET display_name = ?, avatar_b64 = ? WHERE user_id = ?",
  )
    .bind(displayName, avatar, user.user_id)
    .run();
  return { status: "ok" };
}

async function handleSendInvite(request, env, user) {
  const body = await request.json();
  const toCode = toText(body.to_code);
  if (!toCode) {
    throw badRequest("to_code is required");
  }
  const toUser = await env.DB.prepare(
    "SELECT user_id FROM users WHERE friend_code = ?",
  )
    .bind(toCode)
    .first();
  if (!toUser) {
    throw notFound("friend code not found");
  }
  if (toUser.user_id === user.user_id) {
    throw badRequest("cannot invite yourself");
  }
  const already = await env.DB.prepare(
    "SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?",
  )
    .bind(user.user_id, toUser.user_id)
    .first();
  if (already) {
    return { status: "already_connected" };
  }
  const inviteId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO invites (id, from_user_id, to_user_id, created_at, status) VALUES (?, ?, ?, ?, 'pending')",
  )
    .bind(inviteId, user.user_id, toUser.user_id, createdAt)
    .run();
  return { status: "sent" };
}

async function handleAcceptInvite(request, env, user) {
  const body = await request.json();
  const fromCode = toText(body.from_code);
  if (!fromCode) {
    throw badRequest("from_code is required");
  }
  const fromUser = await env.DB.prepare(
    "SELECT user_id FROM users WHERE friend_code = ?",
  )
    .bind(fromCode)
    .first();
  if (!fromUser) {
    throw notFound("friend code not found");
  }
  const invite = await env.DB.prepare(
    "SELECT id FROM invites WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'",
  )
    .bind(fromUser.user_id, user.user_id)
    .first();
  if (!invite) {
    throw notFound("invite not found");
  }
  const acceptedAt = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE invites SET status = 'accepted', accepted_at = ? WHERE id = ?",
  )
    .bind(acceptedAt, invite.id)
    .run();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO friendships (user_id, friend_id, connected_at) VALUES (?, ?, ?)",
  )
    .bind(user.user_id, fromUser.user_id, acceptedAt)
    .run();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO friendships (user_id, friend_id, connected_at) VALUES (?, ?, ?)",
  )
    .bind(fromUser.user_id, user.user_id, acceptedAt)
    .run();
  return { status: "connected" };
}

async function handleInbox(env, user) {
  await env.DB.prepare("UPDATE users SET last_seen_at = ? WHERE user_id = ?")
    .bind(new Date().toISOString(), user.user_id)
    .run();

  const invites = await env.DB.prepare(
    "SELECT users.friend_code as from_code, users.display_name as from_name, users.avatar_b64 as from_avatar, invites.created_at as created_at FROM invites JOIN users ON invites.from_user_id = users.user_id WHERE invites.to_user_id = ? AND invites.status = 'pending'",
  )
    .bind(user.user_id)
    .all();

  const reminders = await env.DB.prepare(
    "SELECT reminders.id as id, users.friend_code as from_code, users.display_name as from_name, users.avatar_b64 as from_avatar, reminders.message as message, reminders.created_at as created_at FROM reminders JOIN users ON reminders.from_user_id = users.user_id WHERE reminders.to_user_id = ? AND reminders.delivered_at IS NULL ORDER BY reminders.created_at ASC",
  )
    .bind(user.user_id)
    .all();

  if (reminders.results.length > 0) {
    const ids = reminders.results.map((row) => row.id);
    const placeholders = ids.map(() => "?").join(", ");
    await env.DB.prepare(
      `UPDATE reminders SET delivered_at = ? WHERE id IN (${placeholders})`,
    )
      .bind(new Date().toISOString(), ...ids)
      .run();
  }

  const friendRows = await env.DB.prepare(
    "SELECT users.user_id as friend_id, users.friend_code as friend_code, users.display_name as display_name, users.avatar_b64 as avatar_b64 FROM friendships JOIN users ON friendships.friend_id = users.user_id WHERE friendships.user_id = ?",
  )
    .bind(user.user_id)
    .all();

  const friends = [];
  for (const row of friendRows.results) {
    const status = await env.DB.prepare(
      "SELECT logged_today, last_entry_date, weight_kg, waist_cm, updated_at FROM status_updates WHERE user_id = ?",
    )
      .bind(row.friend_id)
      .first();
    const shareFromFriend = await env.DB.prepare(
      "SELECT share_weight, share_waist FROM share_settings WHERE user_id = ? AND friend_id = ?",
    )
      .bind(row.friend_id, user.user_id)
      .first();
    const myShare = await env.DB.prepare(
      "SELECT share_weight, share_waist FROM share_settings WHERE user_id = ? AND friend_id = ?",
    )
      .bind(user.user_id, row.friend_id)
      .first();

    const shareWeight = shareFromFriend?.share_weight === 1;
    const shareWaist = shareFromFriend?.share_waist === 1;

    friends.push({
      friend_code: row.friend_code,
      display_name: row.display_name,
      avatar_b64: row.avatar_b64 || null,
      logged_today: status ? Boolean(status.logged_today) : null,
      last_entry_date: status?.last_entry_date || null,
      weight_kg: shareWeight ? status?.weight_kg ?? null : null,
      waist_cm: shareWaist ? status?.waist_cm ?? null : null,
      shared_at: status?.updated_at || null,
      share_from_friend: {
        share_weight: shareWeight,
        share_waist: shareWaist,
      },
      share_settings: {
        share_weight: myShare?.share_weight === 1,
        share_waist: myShare?.share_waist === 1,
      },
    });
  }

  return {
    incoming_invites: invites.results,
    reminders: reminders.results,
    friends,
  };
}

async function handleShareSettings(request, env, user) {
  const body = await request.json();
  const friendCode = toText(body.friend_code);
  if (!friendCode) {
    throw badRequest("friend_code is required");
  }
  const friend = await env.DB.prepare(
    "SELECT user_id FROM users WHERE friend_code = ?",
  )
    .bind(friendCode)
    .first();
  if (!friend) {
    throw notFound("friend code not found");
  }
  const shareWeight = body.share_weight ? 1 : 0;
  const shareWaist = body.share_waist ? 1 : 0;
  const updatedAt = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO share_settings (user_id, friend_id, share_weight, share_waist, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, friend_id) DO UPDATE SET share_weight = excluded.share_weight, share_waist = excluded.share_waist, updated_at = excluded.updated_at",
  )
    .bind(user.user_id, friend.user_id, shareWeight, shareWaist, updatedAt)
    .run();
  return { status: "ok" };
}

async function handleHistoryPush(request, env, user) {
  const body = await request.json();
  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (!entries.length) {
    return { status: "ok", count: 0 };
  }
  const statement = env.DB.prepare(
    "INSERT INTO shared_entries (user_id, entry_id, measured_at, date_local, weight_kg, waist_cm, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, entry_id) DO UPDATE SET measured_at = excluded.measured_at, date_local = excluded.date_local, weight_kg = excluded.weight_kg, waist_cm = excluded.waist_cm, updated_at = excluded.updated_at, is_deleted = excluded.is_deleted WHERE excluded.updated_at >= shared_entries.updated_at",
  );
  for (const entry of entries) {
    const entryId = toText(entry.entry_id);
    const measuredAt = normalizeTimestamp(entry.measured_at, true);
    const updatedAt = normalizeTimestamp(entry.updated_at, true);
    const dateLocal = toText(entry.date_local);
    if (!entryId || !measuredAt || !updatedAt) {
      continue;
    }
    const weightKg = entry.weight_kg ?? null;
    const waistCm = entry.waist_cm ?? null;
    const isDeleted = entry.is_deleted ? 1 : 0;
    await statement
      .bind(user.user_id, entryId, measuredAt, dateLocal, weightKg, waistCm, updatedAt, isDeleted)
      .run();
  }
  return { status: "ok", count: entries.length };
}

async function handleHistoryFetch(request, env, user) {
  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? normalizeTimestamp(sinceParam, false) : null;

  const friendRows = await env.DB.prepare(
    "SELECT users.user_id as friend_id, users.friend_code as friend_code, users.display_name as display_name, users.avatar_b64 as avatar_b64 FROM friendships JOIN users ON friendships.friend_id = users.user_id WHERE friendships.user_id = ?",
  )
    .bind(user.user_id)
    .all();

  const friends = [];
  for (const row of friendRows.results) {
    const shareFromFriend = await env.DB.prepare(
      "SELECT share_weight, share_waist FROM share_settings WHERE user_id = ? AND friend_id = ?",
    )
      .bind(row.friend_id, user.user_id)
      .first();
    const shareWeight = shareFromFriend?.share_weight === 1;
    const shareWaist = shareFromFriend?.share_waist === 1;
    let entries = [];
    if (shareWeight || shareWaist) {
      let query = "SELECT entry_id, measured_at, date_local, weight_kg, waist_cm, updated_at, is_deleted FROM shared_entries WHERE user_id = ?";
      const bindings = [row.friend_id];
      if (since) {
        query += " AND updated_at >= ?";
        bindings.push(since);
      }
      query += " ORDER BY measured_at ASC";
      const rows = await env.DB.prepare(query).bind(...bindings).all();
      entries = rows.results.map((entry) => ({
        entry_id: entry.entry_id,
        measured_at: entry.measured_at,
        date_local: entry.date_local,
        weight_kg: shareWeight ? entry.weight_kg : null,
        waist_cm: shareWaist ? entry.waist_cm : null,
        updated_at: entry.updated_at,
        is_deleted: entry.is_deleted === 1,
      }));
    }
    friends.push({
      friend_code: row.friend_code,
      display_name: row.display_name,
      avatar_b64: row.avatar_b64 || null,
      share_from_friend: {
        share_weight: shareWeight,
        share_waist: shareWaist,
      },
      entries,
    });
  }
  return { friends };
}

async function handleRemoveFriend(request, env, user) {
  const body = await request.json();
  const friendCode = toText(body.friend_code);
  if (!friendCode) {
    throw badRequest("friend_code is required");
  }
  const friend = await env.DB.prepare(
    "SELECT user_id FROM users WHERE friend_code = ?",
  )
    .bind(friendCode)
    .first();
  if (!friend) {
    throw notFound("friend code not found");
  }
  await env.DB.prepare(
    "DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
  )
    .bind(user.user_id, friend.user_id, friend.user_id, user.user_id)
    .run();
  await env.DB.prepare(
    "DELETE FROM share_settings WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
  )
    .bind(user.user_id, friend.user_id, friend.user_id, user.user_id)
    .run();
  await env.DB.prepare(
    "DELETE FROM invites WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)",
  )
    .bind(user.user_id, friend.user_id, friend.user_id, user.user_id)
    .run();
  return { status: "removed" };
}

async function handleStatus(request, env, user) {
  const body = await request.json();
  const loggedToday = body.logged_today ? 1 : 0;
  const lastEntryDate = toText(body.last_entry_date);
  const weightKg = body.weight_kg ?? null;
  const waistCm = body.waist_cm ?? null;
  const updatedAt = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO status_updates (user_id, logged_today, last_entry_date, weight_kg, waist_cm, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET logged_today = excluded.logged_today, last_entry_date = excluded.last_entry_date, weight_kg = excluded.weight_kg, waist_cm = excluded.waist_cm, updated_at = excluded.updated_at",
  )
    .bind(user.user_id, loggedToday, lastEntryDate, weightKg, waistCm, updatedAt)
    .run();
  return { status: "ok" };
}

async function handleReminder(request, env, user) {
  const body = await request.json();
  const toCode = toText(body.to_code);
  const message = toText(body.message);
  if (!toCode || !message) {
    throw badRequest("to_code and message are required");
  }
  const toUser = await env.DB.prepare(
    "SELECT user_id FROM users WHERE friend_code = ?",
  )
    .bind(toCode)
    .first();
  if (!toUser) {
    throw notFound("friend code not found");
  }
  const connected = await env.DB.prepare(
    "SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?",
  )
    .bind(user.user_id, toUser.user_id)
    .first();
  if (!connected) {
    throw badRequest("not connected");
  }
  const reminderId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO reminders (id, from_user_id, to_user_id, message, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(reminderId, user.user_id, toUser.user_id, message, new Date().toISOString())
    .run();
  return { status: "sent" };
}

function handleVapidPublic(env) {
  if (!env.VAPID_PUBLIC_KEY) {
    throw serverError("VAPID public key is not configured.");
  }
  return { public_key: env.VAPID_PUBLIC_KEY };
}

async function handlePushSubscribe(request, env, user) {
  const body = await request.json();
  const endpoint = toText(body.endpoint);
  const p256dh = toText(body.p256dh);
  const auth = toText(body.auth);
  if (!endpoint || !p256dh || !auth) {
    throw badRequest("endpoint, p256dh, and auth are required");
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent, updated_at = excluded.updated_at",
  )
    .bind(
      id,
      user.user_id,
      endpoint,
      p256dh,
      auth,
      request.headers.get("User-Agent") || "",
      now,
      now,
    )
    .run();
  return { status: "ok" };
}

async function handlePushUnsubscribe(request, env, user) {
  const body = await request.json();
  const endpoint = toText(body.endpoint);
  if (!endpoint) {
    throw badRequest("endpoint is required");
  }
  await env.DB.prepare(
    "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
  )
    .bind(user.user_id, endpoint)
    .run();
  return { status: "ok" };
}

async function handlePushTest(env, user) {
  const rows = await env.DB.prepare(
    "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?",
  )
    .bind(user.user_id)
    .all();
  let sent = 0;
  let failed = 0;
  for (const row of rows.results) {
    const result = await sendWebPush(row, env);
    if (result === "gone") {
      await env.DB.prepare(
        "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
      )
        .bind(user.user_id, row.endpoint)
        .run();
      continue;
    }
    if (result === "ok") {
      sent += 1;
    } else {
      failed += 1;
    }
  }
  return { status: "ok", sent, failed };
}

let cachedVapidKey = null;
const encoder = new TextEncoder();

async function sendWebPush(subscription, env) {
  const endpoint = subscription.endpoint;
  if (!endpoint) {
    return "error";
  }
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    throw serverError("VAPID keys are not configured.");
  }
  const jwt = await createVapidJwt(endpoint, env);
  const headers = new Headers();
  headers.set("TTL", "60");
  headers.set("Authorization", `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
  });
  if (response.status === 404 || response.status === 410) {
    return "gone";
  }
  if (!response.ok) {
    return "error";
  }
  return "ok";
}

async function createVapidJwt(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const sub = env.VAPID_SUBJECT || "mailto:admin@example.com";
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp, sub };
  const encodedHeader = b64url(encoder.encode(JSON.stringify(header)));
  const encodedPayload = b64url(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const key = await getVapidSigningKey(env);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsignedToken),
  );
  const encodedSig = b64url(new Uint8Array(signature));
  return `${unsignedToken}.${encodedSig}`;
}

async function getVapidSigningKey(env) {
  if (cachedVapidKey) {
    return cachedVapidKey;
  }
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw serverError("VAPID keys are not configured.");
  }
  const publicBytes = base64urlToBytes(publicKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
    throw serverError("Invalid VAPID public key.");
  }
  const privateBytes = base64urlToBytes(privateKey);
  if (privateBytes.length !== 32) {
    throw serverError("Invalid VAPID private key.");
  }
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: b64url(publicBytes.slice(1, 33)),
    y: b64url(publicBytes.slice(33, 65)),
    d: b64url(privateBytes),
    ext: true,
    key_ops: ["sign"],
  };
  cachedVapidKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  return cachedVapidKey;
}

async function requireAuth(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    throw unauthorized("missing token");
  }
  const tokenHash = await sha256(token);
  const user = await env.DB.prepare(
    "SELECT user_id, display_name, friend_code FROM users WHERE token_hash = ?",
  )
    .bind(tokenHash)
    .first();
  if (!user) {
    throw unauthorized("invalid token");
  }
  return user;
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

function b64url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(base64url) {
  if (!base64url) {
    return new Uint8Array();
  }
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAvatar(value) {
  const text = toText(value);
  if (!text) {
    return null;
  }
  if (text.length > MAX_AVATAR_LENGTH) {
    throw badRequest("avatar too large");
  }
  return text;
}

function normalizeTimestamp(value, required) {
  if (typeof value !== "string") {
    if (required) {
      throw badRequest("timestamp required");
    }
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    if (required) {
      throw badRequest("invalid timestamp");
    }
    return null;
  }
  return new Date(parsed).toISOString();
}

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function serverError(message) {
  return Object.assign(new Error(message), { status: 500 });
}

function unauthorized(message) {
  return Object.assign(new Error(message), { status: 401 });
}

function notFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}
