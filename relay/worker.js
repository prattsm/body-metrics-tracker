export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return corsResponse(request, null, 204);
    }

    try {
      if (url.pathname === "/v1/register" && request.method === "POST") {
        return corsResponse(request, await handleRegister(request, env));
      }
      if (url.pathname === "/v1/profile" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleProfileUpdate(request, env, user));
      }
      if (url.pathname === "/v1/history" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleHistoryPush(request, env, user));
      }
      if (url.pathname === "/v1/history" && request.method === "GET") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleHistoryFetch(request, env, user));
      }
      if (url.pathname === "/v1/friends/remove" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleRemoveFriend(request, env, user));
      }
      if (url.pathname === "/v1/invites" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleSendInvite(request, env, user));
      }
      if (url.pathname === "/v1/invites/accept" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleAcceptInvite(request, env, user));
      }
      if (url.pathname === "/v1/inbox" && request.method === "GET") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleInbox(env, user));
      }
      if (url.pathname === "/v1/share-settings" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleShareSettings(request, env, user));
      }
      if (url.pathname === "/v1/status" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleStatus(request, env, user));
      }
      if (url.pathname === "/v1/reminders" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleReminder(request, env, user));
      }
      if (url.pathname === "/v1/reminders/schedules" && request.method === "GET") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleReminderScheduleList(env, user));
      }
      if (url.pathname === "/v1/reminders/schedules" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleReminderScheduleUpsert(request, env, user));
      }
      if (url.pathname === "/v1/reminders/schedules/delete" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleReminderScheduleDelete(request, env, user));
      }
      if (url.pathname === "/v1/ping" && request.method === "GET") {
        return corsResponse(request, { status: "ok" });
      }
      if (url.pathname === "/v1/push/vapid" && request.method === "GET") {
        return corsResponse(request, handleVapidPublic(env));
      }
      if (url.pathname === "/v1/push/subscribe" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handlePushSubscribe(request, env, user));
      }
      if (url.pathname === "/v1/push/unsubscribe" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handlePushUnsubscribe(request, env, user));
      }
      if (url.pathname === "/v1/push/test" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handlePushTest(env, user));
      }
      if (url.pathname === "/v1/push/pending" && request.method === "POST") {
        return corsResponse(request, await handlePushPending(request, env));
      }
    } catch (err) {
      return corsResponse(
        request,
        jsonResponse({ error: err.message || "Server error" }, err.status || 400),
      );
    }

    return corsResponse(request, jsonResponse({ error: "Not found" }, 404));
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(processScheduledReminders(env));
  },
};

const MAX_AVATAR_LENGTH = 60000;

function corsResponse(request, response, statusOverride) {
  if (!response) {
    return new Response(null, { status: statusOverride || 204, headers: corsHeaders(request) });
  }
  if (response instanceof Response) {
    const headers = new Headers(response.headers);
    for (const [key, value] of corsHeaders(request)) {
      headers.set(key, value);
    }
    return new Response(response.body, { status: response.status, headers });
  }
  return jsonResponse(response, statusOverride, corsHeaders(request));
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin || "*");
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

function jsonResponse(payload, status = 200, extraHeaders) {
  const headers = new Headers(extraHeaders || {});
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(payload), {
    status,
    headers,
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
  const title = user.display_name ? `Reminder from ${user.display_name}` : "Body Metrics Tracker";
  const result = await sendPushToUser(env, toUser.user_id, {
    title,
    body: message,
    url: "/",
    tag: `reminder-${user.user_id}`,
  });
  return { status: "sent", ...result };
}

async function handleReminderScheduleList(env, user) {
  const rows = await env.DB.prepare(
    "SELECT id, message, time_local, days_json, timezone, enabled, next_fire_at, created_at, updated_at FROM reminder_schedules WHERE user_id = ? ORDER BY created_at ASC",
  )
    .bind(user.user_id)
    .all();
  const reminders = rows.results.map((row) => ({
    id: row.id,
    message: row.message,
    time: row.time_local,
    days: parseDays(row.days_json),
    timezone: row.timezone,
    enabled: row.enabled === 1,
    next_fire_at: row.next_fire_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
  return { reminders };
}

async function handleReminderScheduleUpsert(request, env, user) {
  const body = await request.json();
  const id = toText(body.id) || crypto.randomUUID();
  const message = toText(body.message);
  const time = normalizeTime(toText(body.time));
  const timezone = normalizeTimezone(toText(body.timezone));
  const days = normalizeDays(body.days);
  const enabled = body.enabled !== false;
  if (!message || !time) {
    throw badRequest("message and time are required");
  }
  const schedule = {
    id,
    user_id: user.user_id,
    message,
    time_local: time,
    days,
    timezone,
    enabled,
  };
  const now = new Date();
  const nextFire = enabled ? computeNextFireAt(schedule, now) : null;
  const nowIso = now.toISOString();
  await env.DB.prepare(
    "INSERT INTO reminder_schedules (id, user_id, message, time_local, days_json, timezone, enabled, next_fire_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET message = excluded.message, time_local = excluded.time_local, days_json = excluded.days_json, timezone = excluded.timezone, enabled = excluded.enabled, next_fire_at = excluded.next_fire_at, updated_at = excluded.updated_at",
  )
    .bind(
      id,
      user.user_id,
      message,
      time,
      JSON.stringify(days),
      timezone,
      enabled ? 1 : 0,
      nextFire ? nextFire.toISOString() : null,
      nowIso,
      nowIso,
    )
    .run();
  return {
    status: "ok",
    reminder: {
      id,
      message,
      time,
      days,
      timezone,
      enabled,
      next_fire_at: nextFire ? nextFire.toISOString() : null,
      created_at: nowIso,
      updated_at: nowIso,
    },
  };
}

async function handleReminderScheduleDelete(request, env, user) {
  const body = await request.json();
  const id = toText(body.id);
  if (!id) {
    throw badRequest("id is required");
  }
  await env.DB.prepare(
    "DELETE FROM reminder_schedules WHERE id = ? AND user_id = ?",
  )
    .bind(id, user.user_id)
    .run();
  return { status: "deleted" };
}

async function processScheduledReminders(env) {
  const now = new Date();
  const nowIso = now.toISOString();
  const rows = await env.DB.prepare(
    "SELECT id, user_id, message, time_local, days_json, timezone, enabled FROM reminder_schedules WHERE enabled = 1 AND next_fire_at IS NOT NULL AND next_fire_at <= ?",
  )
    .bind(nowIso)
    .all();
  if (!rows.results.length) {
    return;
  }
  for (const row of rows.results) {
    const schedule = {
      id: row.id,
      user_id: row.user_id,
      message: row.message,
      time_local: row.time_local,
      days: parseDays(row.days_json),
      timezone: row.timezone,
      enabled: row.enabled === 1,
    };
    await sendPushToUser(env, row.user_id, {
      title: "Body Metrics Tracker",
      body: row.message,
      url: "/",
      tag: `schedule-${row.id}`,
    });
    const nextFire = computeNextFireAt(schedule, new Date(now.getTime() + 1000));
    await env.DB.prepare(
      "UPDATE reminder_schedules SET next_fire_at = ?, updated_at = ? WHERE id = ?",
    )
      .bind(nextFire ? nextFire.toISOString() : null, new Date().toISOString(), row.id)
      .run();
  }
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
  const result = await sendPushToUser(env, user.user_id, {
    title: "Body Metrics Tracker",
    body: "Push notifications are working.",
    url: "/",
    tag: `test-${user.user_id}`,
  });
  return { status: "ok", ...result };
}

async function handlePushPending(request, env) {
  const body = await request.json();
  const endpoint = toText(body.endpoint);
  if (!endpoint) {
    throw badRequest("endpoint is required");
  }
  const rows = await env.DB.prepare(
    "SELECT id, title, body, url, tag, created_at FROM push_messages WHERE endpoint = ? AND delivered_at IS NULL ORDER BY created_at ASC",
  )
    .bind(endpoint)
    .all();
  if (rows.results.length > 0) {
    const ids = rows.results.map((row) => row.id);
    const placeholders = ids.map(() => "?").join(", ");
    await env.DB.prepare(
      `UPDATE push_messages SET delivered_at = ? WHERE id IN (${placeholders})`,
    )
      .bind(new Date().toISOString(), ...ids)
      .run();
  }
  const messages = rows.results.map((row) => ({
    title: row.title,
    body: row.body,
    url: row.url,
    tag: row.tag || undefined,
    created_at: row.created_at,
  }));
  return { messages };
}

async function sendPushToUser(env, userId, payload) {
  const rows = await env.DB.prepare(
    "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?",
  )
    .bind(userId)
    .all();
  const now = new Date().toISOString();
  let sent = 0;
  let failed = 0;
  for (const row of rows.results) {
    const messageId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO push_messages (id, user_id, endpoint, title, body, url, tag, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        messageId,
        userId,
        row.endpoint,
        payload.title || "Body Metrics Tracker",
        payload.body || "",
        payload.url || "/",
        payload.tag || null,
        now,
      )
      .run();
    const result = await sendWebPush(row, env);
    if (result === "ok") {
      sent += 1;
      continue;
    }
    failed += 1;
    await env.DB.prepare("DELETE FROM push_messages WHERE id = ?")
      .bind(messageId)
      .run();
    if (result === "gone") {
      await env.DB.prepare(
        "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
      )
        .bind(userId, row.endpoint)
        .run();
    }
  }
  return { sent, failed, subscriptions: rows.results.length };
}

let cachedVapidKey = null;
const encoder = new TextEncoder();

const formatterCache = new Map();

function getZonedParts(date, timeZone) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    formatterCache.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  const hour = Number(map.hour) % 24;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
  };
}

function addDaysToYmd(year, month, day, offset) {
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + offset);
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let utc = desired;
  for (let i = 0; i < 2; i += 1) {
    const parts = getZonedParts(new Date(utc), timeZone);
    const actual = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
    const diff = desired - actual;
    if (diff === 0) break;
    utc += diff;
  }
  return new Date(utc);
}

function computeNextFireAt(schedule, fromDate) {
  const time = normalizeTime(schedule.time_local || schedule.time);
  if (!time) {
    return null;
  }
  const [hour, minute] = time.split(":").map((value) => parseInt(value, 10));
  const days = normalizeDays(schedule.days);
  const timeZone = normalizeTimezone(schedule.timezone);
  const anchor = fromDate || new Date();
  const current = getZonedParts(anchor, timeZone);
  for (let offset = 0; offset <= 7; offset += 1) {
    const nextDate = addDaysToYmd(current.year, current.month, current.day, offset);
    const dow = new Date(Date.UTC(nextDate.year, nextDate.month - 1, nextDate.day)).getUTCDay();
    if (!days.includes(dow)) {
      continue;
    }
    const candidate = zonedTimeToUtc(nextDate.year, nextDate.month, nextDate.day, hour, minute, timeZone);
    if (candidate.getTime() > anchor.getTime()) {
      return candidate;
    }
  }
  return null;
}

function parseDays(value) {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeDays(value);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return normalizeDays(parsed);
    }
  } catch (_err) {
    // ignore
  }
  return [];
}

function normalizeDays(value) {
  const days = Array.isArray(value) ? value : [];
  const unique = new Set();
  for (const day of days) {
    const num = Number(day);
    if (Number.isInteger(num) && num >= 0 && num <= 6) {
      unique.add(num);
    }
  }
  const result = Array.from(unique).sort();
  if (!result.length) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  return result;
}

function normalizeTime(value) {
  if (!value) return "";
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return "";
  return `${match[1]}:${match[2]}`;
}

function normalizeTimezone(value) {
  const tz = value || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return tz;
  } catch (_err) {
    return "UTC";
  }
}

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
  headers.set("TTL", "300");
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
