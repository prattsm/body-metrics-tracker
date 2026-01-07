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
    throw badRequest("friend_code already registered");
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

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function unauthorized(message) {
  return Object.assign(new Error(message), { status: 401 });
}

function notFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}
