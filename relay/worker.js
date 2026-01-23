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
      if (url.pathname === "/v1/profile/settings" && request.method === "GET") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleProfileSettingsGet(env, user));
      }
      if (url.pathname === "/v1/profile/settings" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleProfileSettingsSet(request, env, user));
      }
      if (url.pathname === "/v1/history" && request.method === "POST") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleHistoryPush(request, env, user));
      }
      if (url.pathname === "/v1/history" && request.method === "GET") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleHistoryFetch(request, env, user));
      }
      if (url.pathname === "/v1/history/self" && request.method === "GET") {
        const user = await requireAuth(request, env);
        return corsResponse(request, await handleSelfHistoryFetch(request, env, user));
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
      if (url.pathname === "/v1/admin/users" && request.method === "GET") {
        requireAdmin(request, env);
        return corsResponse(request, await handleAdminUsers(env));
      }
      const adminUserMatch = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)$/);
      if (adminUserMatch && request.method === "GET") {
        requireAdmin(request, env);
        return corsResponse(request, await handleAdminUser(env, adminUserMatch[1]));
      }
      const adminEntriesMatch = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)\/entries$/);
      if (adminEntriesMatch && request.method === "GET") {
        requireAdmin(request, env);
        return corsResponse(request, await handleAdminEntries(request, env, adminEntriesMatch[1]));
      }
      const adminRecoveryMatch = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)\/recovery$/);
      if (adminRecoveryMatch && request.method === "POST") {
        requireAdmin(request, env);
        return corsResponse(request, await handleAdminRecovery(env, adminRecoveryMatch[1]));
      }
      const adminRestoreMatch = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)\/restore$/);
      if (adminRestoreMatch && request.method === "POST") {
        requireAdmin(request, env);
        return corsResponse(request, await handleAdminRestore(env, adminRestoreMatch[1]));
      }
      const adminDeleteMatch = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)\/delete$/);
      if (adminDeleteMatch && request.method === "POST") {
        requireAdmin(request, env);
        return corsResponse(request, await handleAdminDelete(env, adminDeleteMatch[1]));
      }
      const adminMergeMatch = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)\/merge$/);
      if (adminMergeMatch && request.method === "POST") {
        requireAdmin(request, env);
        return corsResponse(request, await handleAdminMerge(request, env, adminMergeMatch[1]));
      }
      if (url.pathname === "/v1/recovery/claim" && request.method === "POST") {
        return corsResponse(request, await handleRecoveryClaim(request, env));
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
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Admin-Token, X-Admin-Device");
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
  const preserveProfile = body.preserve_profile === true;
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
    const createdAt = new Date().toISOString();
    if (preserveProfile) {
      try {
        await env.DB.prepare(
          "INSERT INTO user_tokens (token_hash, user_id, created_at) VALUES (?, ?, ?)",
        )
          .bind(tokenHash, userId, createdAt)
          .run();
      } catch (_err) {
        await env.DB.prepare(
          "UPDATE users SET token_hash = ? WHERE user_id = ?",
        )
          .bind(tokenHash, userId)
          .run();
      }
    } else {
      await env.DB.prepare(
        "UPDATE users SET display_name = ?, avatar_b64 = ? WHERE user_id = ?",
      )
        .bind(displayName, avatar, userId)
        .run();
      try {
        await env.DB.prepare(
          "INSERT INTO user_tokens (token_hash, user_id, created_at) VALUES (?, ?, ?)",
        )
          .bind(tokenHash, userId, createdAt)
          .run();
      } catch (_err) {
        await env.DB.prepare(
          "UPDATE users SET token_hash = ? WHERE user_id = ?",
        )
          .bind(tokenHash, userId)
          .run();
      }
    }
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

async function handleProfileSettingsGet(env, user) {
  const row = await env.DB.prepare(
    "SELECT settings_json, updated_at FROM profile_settings WHERE user_id = ?",
  )
    .bind(user.user_id)
    .first();
  if (!row) {
    return { settings: null, updated_at: null };
  }
  let settings = null;
  try {
    settings = row.settings_json ? JSON.parse(row.settings_json) : null;
  } catch (_err) {
    settings = null;
  }
  return { settings, updated_at: row.updated_at };
}

async function handleProfileSettingsSet(request, env, user) {
  const body = await request.json();
  const settings = body?.settings;
  if (!settings || typeof settings !== "object") {
    throw badRequest("settings is required");
  }
  let settingsJson = null;
  try {
    settingsJson = JSON.stringify(settings);
  } catch (_err) {
    throw badRequest("settings must be JSON-serializable");
  }
  const updatedAt = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO profile_settings (user_id, settings_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = excluded.updated_at",
  )
    .bind(user.user_id, settingsJson, updatedAt)
    .run();
  return { status: "ok", updated_at: updatedAt };
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
    const timeZone = await getUserTimezone(env, row.friend_id);
    const status = await env.DB.prepare(
      "SELECT logged_today, last_entry_date, weight_kg, waist_cm, updated_at FROM status_updates WHERE user_id = ?",
    )
      .bind(row.friend_id)
      .first();
    const latestEntry = await fetchLatestEntry(env, row.friend_id);
    let lastEntryDate = null;
    let weightKg = null;
    let waistCm = null;
    let sharedAt = null;
    if (latestEntry) {
      lastEntryDate = deriveEntryDate(latestEntry, timeZone);
      weightKg = latestEntry.weight_kg ?? null;
      waistCm = latestEntry.waist_cm ?? null;
      sharedAt = maxIsoTimestamp(status?.updated_at || null, latestEntry.updated_at || null);
    } else if (status) {
      lastEntryDate = status.last_entry_date || null;
      weightKg = status.weight_kg ?? null;
      waistCm = status.waist_cm ?? null;
      sharedAt = status.updated_at || null;
    }
    const todayLocal = timeZone ? formatDateInTimeZone(new Date(), timeZone) : null;
    let loggedToday = null;
    if (lastEntryDate) {
      if (todayLocal) {
        loggedToday = lastEntryDate === todayLocal;
      } else if (status && typeof status.logged_today !== "undefined") {
        loggedToday = Boolean(status.logged_today);
      }
    } else if (status) {
      loggedToday = Boolean(status.logged_today);
    }
    if (latestEntry && lastEntryDate) {
      const loggedFlag = loggedToday != null ? loggedToday : Boolean(status?.logged_today);
      await upsertStatusIfNeeded(
        env,
        row.friend_id,
        status,
        lastEntryDate,
        weightKg,
        waistCm,
        loggedFlag,
      );
    }
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
      logged_today: loggedToday,
      last_entry_date: lastEntryDate,
      weight_kg: shareWeight ? weightKg : null,
      waist_cm: shareWaist ? waistCm : null,
      shared_at: sharedAt,
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
    "INSERT INTO shared_entries (user_id, entry_id, measured_at, date_local, weight_kg, waist_cm, note, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, entry_id) DO UPDATE SET measured_at = excluded.measured_at, date_local = excluded.date_local, weight_kg = excluded.weight_kg, waist_cm = excluded.waist_cm, note = excluded.note, updated_at = excluded.updated_at, is_deleted = excluded.is_deleted WHERE excluded.updated_at >= shared_entries.updated_at",
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
    const note = toText(entry.note);
    const isDeleted = entry.is_deleted ? 1 : 0;
    await statement
      .bind(user.user_id, entryId, measuredAt, dateLocal, weightKg, waistCm, note, updatedAt, isDeleted)
      .run();
  }
  const timeZone = await getUserTimezone(env, user.user_id);
  await refreshStatusFromEntries(env, user.user_id, timeZone);
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

async function handleSelfHistoryFetch(request, env, user) {
  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? normalizeTimestamp(sinceParam, false) : null;
  let query = "SELECT entry_id, measured_at, date_local, weight_kg, waist_cm, note, updated_at, is_deleted FROM shared_entries WHERE user_id = ?";
  const bindings = [user.user_id];
  if (since) {
    query += " AND updated_at >= ?";
    bindings.push(since);
  }
  query += " ORDER BY measured_at ASC";
  const rows = await env.DB.prepare(query).bind(...bindings).all();
  const entries = rows.results.map((entry) => ({
    entry_id: entry.entry_id,
    measured_at: entry.measured_at,
    date_local: entry.date_local,
    weight_kg: entry.weight_kg,
    waist_cm: entry.waist_cm,
    note: entry.note ?? null,
    updated_at: entry.updated_at,
    is_deleted: entry.is_deleted === 1,
  }));
  return { entries };
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

async function handleAdminUsers(env) {
  const rows = await env.DB.prepare(
    "SELECT users.user_id as user_id, users.friend_code as friend_code, users.display_name as display_name, users.avatar_b64 as avatar_b64, users.created_at as created_at, users.last_seen_at as last_seen_at, COUNT(shared_entries.entry_id) as entry_count, SUM(CASE WHEN shared_entries.is_deleted = 1 THEN 1 ELSE 0 END) as deleted_count, MAX(shared_entries.updated_at) as last_entry_at FROM users LEFT JOIN shared_entries ON users.user_id = shared_entries.user_id GROUP BY users.user_id ORDER BY users.created_at DESC",
  ).all();
  const users = rows.results.map((row) => ({
    user_id: row.user_id,
    friend_code: row.friend_code,
    display_name: row.display_name,
    avatar_b64: row.avatar_b64 || null,
    created_at: row.created_at,
    last_seen_at: row.last_seen_at || null,
    entry_count: Number(row.entry_count || 0),
    deleted_count: Number(row.deleted_count || 0),
    last_entry_at: row.last_entry_at || null,
  }));
  return { users };
}

async function handleAdminUser(env, userId) {
  const user = await env.DB.prepare(
    "SELECT user_id, friend_code, display_name, avatar_b64, created_at, last_seen_at FROM users WHERE user_id = ?",
  )
    .bind(userId)
    .first();
  if (!user) {
    throw notFound("user not found");
  }
  const stats = await env.DB.prepare(
    "SELECT COUNT(entry_id) as entry_count, SUM(CASE WHEN is_deleted = 1 THEN 1 ELSE 0 END) as deleted_count, MAX(updated_at) as last_entry_at FROM shared_entries WHERE user_id = ?",
  )
    .bind(userId)
    .first();
  const latest = await env.DB.prepare(
    "SELECT entry_id, measured_at, date_local, weight_kg, waist_cm, note, updated_at, is_deleted FROM shared_entries WHERE user_id = ? ORDER BY measured_at DESC LIMIT 1",
  )
    .bind(userId)
    .first();
  return {
    user: {
      user_id: user.user_id,
      friend_code: user.friend_code,
      display_name: user.display_name,
      avatar_b64: user.avatar_b64 || null,
      created_at: user.created_at,
      last_seen_at: user.last_seen_at || null,
    },
    stats: {
      entry_count: Number(stats?.entry_count || 0),
      deleted_count: Number(stats?.deleted_count || 0),
      last_entry_at: stats?.last_entry_at || null,
    },
    latest_entry: latest
      ? {
          entry_id: latest.entry_id,
          measured_at: latest.measured_at,
          date_local: latest.date_local,
          weight_kg: latest.weight_kg,
          waist_cm: latest.waist_cm,
          note: latest.note ?? null,
          updated_at: latest.updated_at,
          is_deleted: latest.is_deleted === 1,
        }
      : null,
  };
}

async function handleAdminEntries(request, env, userId) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  let limit = Number(limitParam || 0);
  let offset = Number(offsetParam || 0);
  if (!Number.isFinite(limit) || limit <= 0 || limit > 5000) {
    limit = 5000;
  }
  if (!Number.isFinite(offset) || offset < 0) {
    offset = 0;
  }
  const user = await env.DB.prepare("SELECT user_id FROM users WHERE user_id = ?")
    .bind(userId)
    .first();
  if (!user) {
    throw notFound("user not found");
  }
  const rows = await env.DB.prepare(
    "SELECT entry_id, measured_at, date_local, weight_kg, waist_cm, note, updated_at, is_deleted FROM shared_entries WHERE user_id = ? ORDER BY measured_at DESC LIMIT ? OFFSET ?",
  )
    .bind(userId, limit, offset)
    .all();
  const entries = rows.results.map((entry) => ({
    entry_id: entry.entry_id,
    measured_at: entry.measured_at,
    date_local: entry.date_local,
    weight_kg: entry.weight_kg,
    waist_cm: entry.waist_cm,
    note: entry.note ?? null,
    updated_at: entry.updated_at,
    is_deleted: entry.is_deleted === 1,
  }));
  return { entries, limit, offset, count: entries.length };
}

async function handleAdminRestore(env, userId) {
  const user = await env.DB.prepare("SELECT user_id FROM users WHERE user_id = ?")
    .bind(userId)
    .first();
  if (!user) {
    throw notFound("user not found");
  }
  const countRow = await env.DB.prepare(
    "SELECT COUNT(entry_id) as deleted_count FROM shared_entries WHERE user_id = ? AND is_deleted = 1",
  )
    .bind(userId)
    .first();
  const deletedCount = Number(countRow?.deleted_count || 0);
  if (deletedCount > 0) {
    const now = new Date().toISOString();
    await env.DB.prepare(
      "UPDATE shared_entries SET is_deleted = 0, updated_at = ? WHERE user_id = ? AND is_deleted = 1",
    )
      .bind(now, userId)
      .run();
  }
  return { status: "ok", restored: deletedCount };
}

async function handleAdminRecovery(env, userId) {
  const user = await env.DB.prepare("SELECT user_id FROM users WHERE user_id = ?")
    .bind(userId)
    .first();
  if (!user) {
    throw notFound("user not found");
  }
  await env.DB.prepare("DELETE FROM recovery_tokens WHERE user_id = ?")
    .bind(userId)
    .run();
  const { code, normalized } = generateRecoveryCode();
  const tokenHash = await sha256(normalized);
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    "INSERT INTO recovery_tokens (token_hash, user_id, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(tokenHash, userId, createdAt, expiresAt, null)
    .run();
  return { code, expires_at: expiresAt };
}

async function handleAdminDelete(env, userId) {
  const user = await env.DB.prepare("SELECT user_id FROM users WHERE user_id = ?")
    .bind(userId)
    .first();
  if (!user) {
    throw notFound("user not found");
  }
  const deleted = {};
  deleted.invites = await runDelete(env, "DELETE FROM invites WHERE from_user_id = ? OR to_user_id = ?", userId, userId);
  deleted.friendships = await runDelete(
    env,
    "DELETE FROM friendships WHERE user_id = ? OR friend_id = ?",
    userId,
    userId,
  );
  deleted.share_settings = await runDelete(
    env,
    "DELETE FROM share_settings WHERE user_id = ? OR friend_id = ?",
    userId,
    userId,
  );
  deleted.status_updates = await runDelete(env, "DELETE FROM status_updates WHERE user_id = ?", userId);
  deleted.shared_entries = await runDelete(env, "DELETE FROM shared_entries WHERE user_id = ?", userId);
  deleted.profile_settings = await runDelete(env, "DELETE FROM profile_settings WHERE user_id = ?", userId);
  deleted.reminders = await runDelete(
    env,
    "DELETE FROM reminders WHERE from_user_id = ? OR to_user_id = ?",
    userId,
    userId,
  );
  deleted.reminder_schedules = await runDelete(
    env,
    "DELETE FROM reminder_schedules WHERE user_id = ?",
    userId,
  );
  deleted.push_messages = await runDelete(env, "DELETE FROM push_messages WHERE user_id = ?", userId);
  deleted.push_subscriptions = await runDelete(
    env,
    "DELETE FROM push_subscriptions WHERE user_id = ?",
    userId,
  );
  deleted.user_tokens = await runDelete(env, "DELETE FROM user_tokens WHERE user_id = ?", userId);
  deleted.recovery_tokens = await runDelete(env, "DELETE FROM recovery_tokens WHERE user_id = ?", userId);
  deleted.users = await runDelete(env, "DELETE FROM users WHERE user_id = ?", userId);
  return { status: "ok", deleted };
}

async function handleAdminMerge(request, env, targetId) {
  const body = await request.json();
  const sourceId = toText(body.source_user_id);
  if (!sourceId) {
    throw badRequest("source_user_id is required");
  }
  if (sourceId === targetId) {
    throw badRequest("source_user_id must be different");
  }

  const target = await env.DB.prepare(
    "SELECT user_id, friend_code, display_name FROM users WHERE user_id = ?",
  )
    .bind(targetId)
    .first();
  if (!target) {
    throw notFound("target user not found");
  }
  const source = await env.DB.prepare(
    "SELECT user_id, friend_code, display_name FROM users WHERE user_id = ?",
  )
    .bind(sourceId)
    .first();
  if (!source) {
    throw notFound("source user not found");
  }

  const moved = {};

  moved.invites_from = (
    await env.DB.prepare("UPDATE OR IGNORE invites SET from_user_id = ? WHERE from_user_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;
  moved.invites_to = (
    await env.DB.prepare("UPDATE OR IGNORE invites SET to_user_id = ? WHERE to_user_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;
  moved.invites_deleted = await runDelete(env, "DELETE FROM invites WHERE from_user_id = ? OR to_user_id = ?", sourceId, sourceId);

  moved.friendships_user = (
    await env.DB.prepare("UPDATE OR IGNORE friendships SET user_id = ? WHERE user_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;
  moved.friendships_friend = (
    await env.DB.prepare("UPDATE OR IGNORE friendships SET friend_id = ? WHERE friend_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;
  moved.friendships_deleted = await runDelete(
    env,
    "DELETE FROM friendships WHERE user_id = ? OR friend_id = ? OR user_id = friend_id",
    sourceId,
    sourceId,
  );

  moved.share_settings_updated = await mergeShareSettings(env, targetId, sourceId);
  moved.share_settings_user = (
    await env.DB.prepare("UPDATE OR IGNORE share_settings SET user_id = ? WHERE user_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;
  moved.share_settings_friend = (
    await env.DB.prepare("UPDATE OR IGNORE share_settings SET friend_id = ? WHERE friend_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;
  moved.share_settings_deleted = await runDelete(
    env,
    "DELETE FROM share_settings WHERE user_id = ? OR friend_id = ? OR user_id = friend_id",
    sourceId,
    sourceId,
  );

  moved.reminders_from = (
    await env.DB.prepare("UPDATE reminders SET from_user_id = ? WHERE from_user_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;
  moved.reminders_to = (
    await env.DB.prepare("UPDATE reminders SET to_user_id = ? WHERE to_user_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;

  moved.reminder_schedules = (
    await env.DB.prepare("UPDATE reminder_schedules SET user_id = ? WHERE user_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;

  moved.push_subscriptions_updated = await mergePushSubscriptions(env, targetId, sourceId);
  moved.push_subscriptions = (
    await env.DB.prepare("UPDATE push_subscriptions SET user_id = ? WHERE user_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;
  moved.push_subscriptions_deleted = await runDelete(
    env,
    "DELETE FROM push_subscriptions WHERE user_id = ?",
    sourceId,
  );

  moved.push_messages = (
    await env.DB.prepare("UPDATE push_messages SET user_id = ? WHERE user_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;

  moved.shared_entries = (
    await env.DB.prepare("UPDATE OR IGNORE shared_entries SET user_id = ? WHERE user_id = ?")
      .bind(targetId, sourceId)
      .run()
  ).meta?.changes ?? 0;

  const remainingEntries = await env.DB.prepare(
    "SELECT entry_id FROM shared_entries WHERE user_id = ?",
  )
    .bind(sourceId)
    .all();
  let rekeyed = 0;
  for (const row of remainingEntries.results) {
    const entryId = row.entry_id;
    if (!entryId) {
      continue;
    }
    const newId = crypto.randomUUID();
    await env.DB.prepare(
      "UPDATE shared_entries SET entry_id = ?, user_id = ? WHERE user_id = ? AND entry_id = ?",
    )
      .bind(newId, targetId, sourceId, entryId)
      .run();
    rekeyed += 1;
  }
  moved.shared_entries_rekeyed = rekeyed;
  moved.shared_entries_deleted = await runDelete(env, "DELETE FROM shared_entries WHERE user_id = ?", sourceId);

  const targetStatus = await env.DB.prepare(
    "SELECT logged_today, last_entry_date, weight_kg, waist_cm, updated_at FROM status_updates WHERE user_id = ?",
  )
    .bind(targetId)
    .first();
  const sourceStatus = await env.DB.prepare(
    "SELECT logged_today, last_entry_date, weight_kg, waist_cm, updated_at FROM status_updates WHERE user_id = ?",
  )
    .bind(sourceId)
    .first();
  const chosenStatus = chooseLatestStatus(targetStatus, sourceStatus);
  if (chosenStatus) {
    const loggedToday = normalizeLoggedToday(chosenStatus.last_entry_date);
    const updatedAt = chosenStatus.updated_at || new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO status_updates (user_id, logged_today, last_entry_date, weight_kg, waist_cm, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET logged_today = excluded.logged_today, last_entry_date = excluded.last_entry_date, weight_kg = excluded.weight_kg, waist_cm = excluded.waist_cm, updated_at = excluded.updated_at",
    )
      .bind(
        targetId,
        loggedToday,
        chosenStatus.last_entry_date,
        chosenStatus.weight_kg,
        chosenStatus.waist_cm,
        updatedAt,
      )
      .run();
  }
  moved.status_updates_deleted = await runDelete(env, "DELETE FROM status_updates WHERE user_id = ?", sourceId);

  const targetProfile = await env.DB.prepare(
    "SELECT settings_json, updated_at FROM profile_settings WHERE user_id = ?",
  )
    .bind(targetId)
    .first();
  const sourceProfile = await env.DB.prepare(
    "SELECT settings_json, updated_at FROM profile_settings WHERE user_id = ?",
  )
    .bind(sourceId)
    .first();
  let profileCopied = 0;
  if (!targetProfile && sourceProfile?.settings_json) {
    await env.DB.prepare(
      "INSERT INTO profile_settings (user_id, settings_json, updated_at) VALUES (?, ?, ?)",
    )
      .bind(targetId, sourceProfile.settings_json, sourceProfile.updated_at || new Date().toISOString())
      .run();
    profileCopied = 1;
  }
  moved.profile_settings_copied = profileCopied;
  moved.profile_settings_deleted = await runDelete(env, "DELETE FROM profile_settings WHERE user_id = ?", sourceId);

  try {
    moved.user_tokens = (
      await env.DB.prepare("UPDATE user_tokens SET user_id = ? WHERE user_id = ?")
        .bind(targetId, sourceId)
        .run()
    ).meta?.changes ?? 0;
  } catch (_err) {
    moved.user_tokens = 0;
  }
  try {
    moved.recovery_tokens_deleted = await runDelete(env, "DELETE FROM recovery_tokens WHERE user_id = ?", sourceId);
  } catch (_err) {
    moved.recovery_tokens_deleted = 0;
  }

  moved.users = await runDelete(env, "DELETE FROM users WHERE user_id = ?", sourceId);

  return {
    status: "ok",
    source: {
      user_id: source.user_id,
      friend_code: source.friend_code,
      display_name: source.display_name,
    },
    target: {
      user_id: target.user_id,
      friend_code: target.friend_code,
      display_name: target.display_name,
    },
    moved,
  };
}

async function mergeShareSettings(env, targetId, sourceId) {
  let updated = 0;
  const outgoing = await env.DB.prepare(
    "SELECT s.friend_id as friend_id, s.share_weight as s_weight, s.share_waist as s_waist, s.updated_at as s_updated, t.updated_at as t_updated FROM share_settings s JOIN share_settings t ON t.user_id = ? AND t.friend_id = s.friend_id WHERE s.user_id = ?",
  )
    .bind(targetId, sourceId)
    .all();
  for (const row of outgoing.results) {
    if (row.s_updated && (!row.t_updated || row.s_updated > row.t_updated)) {
      await env.DB.prepare(
        "UPDATE share_settings SET share_weight = ?, share_waist = ?, updated_at = ? WHERE user_id = ? AND friend_id = ?",
      )
        .bind(row.s_weight, row.s_waist, row.s_updated, targetId, row.friend_id)
        .run();
      updated += 1;
    }
  }
  const incoming = await env.DB.prepare(
    "SELECT s.user_id as user_id, s.share_weight as s_weight, s.share_waist as s_waist, s.updated_at as s_updated, t.updated_at as t_updated FROM share_settings s JOIN share_settings t ON t.friend_id = ? AND t.user_id = s.user_id WHERE s.friend_id = ?",
  )
    .bind(targetId, sourceId)
    .all();
  for (const row of incoming.results) {
    if (row.s_updated && (!row.t_updated || row.s_updated > row.t_updated)) {
      await env.DB.prepare(
        "UPDATE share_settings SET share_weight = ?, share_waist = ?, updated_at = ? WHERE user_id = ? AND friend_id = ?",
      )
        .bind(row.s_weight, row.s_waist, row.s_updated, row.user_id, targetId)
        .run();
      updated += 1;
    }
  }
  return updated;
}

async function mergePushSubscriptions(env, targetId, sourceId) {
  const rows = await env.DB.prepare(
    "SELECT id, endpoint, p256dh, auth, user_agent, updated_at FROM push_subscriptions WHERE user_id = ? AND endpoint IN (SELECT endpoint FROM push_subscriptions WHERE user_id = ?)",
  )
    .bind(sourceId, targetId)
    .all();
  let updated = 0;
  for (const row of rows.results) {
    const target = await env.DB.prepare(
      "SELECT id, updated_at FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
    )
      .bind(targetId, row.endpoint)
      .first();
    if (!target) {
      continue;
    }
    if (row.updated_at && (!target.updated_at || row.updated_at > target.updated_at)) {
      await env.DB.prepare(
        "UPDATE push_subscriptions SET p256dh = ?, auth = ?, user_agent = ?, updated_at = ? WHERE id = ?",
      )
        .bind(row.p256dh, row.auth, row.user_agent, row.updated_at, target.id)
        .run();
      updated += 1;
    }
    await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?")
      .bind(row.id)
      .run();
  }
  return updated;
}

function chooseLatestStatus(targetStatus, sourceStatus) {
  if (!targetStatus) {
    return sourceStatus;
  }
  if (!sourceStatus) {
    return targetStatus;
  }
  if (sourceStatus.updated_at && (!targetStatus.updated_at || sourceStatus.updated_at > targetStatus.updated_at)) {
    return sourceStatus;
  }
  return targetStatus;
}

async function handleRecoveryClaim(request, env) {
  const body = await request.json();
  const code = normalizeRecoveryCode(toText(body.code));
  if (!code) {
    throw badRequest("recovery code required");
  }
  const tokenHash = await sha256(code);
  const row = await env.DB.prepare(
    "SELECT user_id, expires_at, used_at FROM recovery_tokens WHERE token_hash = ?",
  )
    .bind(tokenHash)
    .first();
  if (!row || row.used_at) {
    throw unauthorized("recovery code invalid");
  }
  const now = new Date();
  if (row.expires_at && new Date(row.expires_at) < now) {
    throw unauthorized("recovery code expired");
  }
  const usedAt = now.toISOString();
  await env.DB.prepare(
    "UPDATE recovery_tokens SET used_at = ? WHERE token_hash = ?",
  )
    .bind(usedAt, tokenHash)
    .run();
  const token = randomToken();
  const newTokenHash = await sha256(token);
  try {
    await env.DB.prepare(
      "INSERT INTO user_tokens (token_hash, user_id, created_at) VALUES (?, ?, ?)",
    )
      .bind(newTokenHash, row.user_id, usedAt)
      .run();
  } catch (_err) {
    await env.DB.prepare(
      "UPDATE users SET token_hash = ? WHERE user_id = ?",
    )
      .bind(newTokenHash, row.user_id)
      .run();
  }
  const user = await env.DB.prepare(
    "SELECT user_id, friend_code, display_name, avatar_b64 FROM users WHERE user_id = ?",
  )
    .bind(row.user_id)
    .first();
  return {
    token,
    user_id: user?.user_id || row.user_id,
    friend_code: user?.friend_code || null,
    display_name: user?.display_name || null,
    avatar_b64: user?.avatar_b64 || null,
  };
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
  let user = await env.DB.prepare(
    "SELECT user_id, display_name, friend_code FROM users WHERE token_hash = ?",
  )
    .bind(tokenHash)
    .first();
  if (!user) {
    let tokenRow = null;
    try {
      tokenRow = await env.DB.prepare(
        "SELECT user_id FROM user_tokens WHERE token_hash = ?",
      )
        .bind(tokenHash)
        .first();
    } catch (_err) {
      tokenRow = null;
    }
    if (!tokenRow) {
      throw unauthorized("invalid token");
    }
    user = await env.DB.prepare(
      "SELECT user_id, display_name, friend_code FROM users WHERE user_id = ?",
    )
      .bind(tokenRow.user_id)
      .first();
    if (!user) {
      throw unauthorized("invalid token");
    }
  }
  return user;
}

function requireAdmin(request, env) {
  const adminToken = env.ADMIN_TOKEN;
  if (!adminToken) {
    throw unauthorized("admin not configured");
  }
  const token = request.headers.get("X-Admin-Token") || "";
  if (!token || token !== adminToken) {
    throw unauthorized("admin token invalid");
  }
  const deviceHeader = (request.headers.get("X-Admin-Device") || "").trim();
  const allowlistRaw =
    env.ADMIN_DEVICE_IDS || env.ADMIN_DEVICE_ALLOWLIST || env.ADMIN_DEVICE_ID || "";
  const allowlist = allowlistRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowlist.length) {
    throw unauthorized("admin device allowlist not configured");
  }
  if (!deviceHeader || !allowlist.includes(deviceHeader)) {
    throw unauthorized("admin device not allowed");
  }
  return { device_id: deviceHeader };
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

function generateRecoveryCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let raw = "";
  for (const byte of bytes) {
    raw += alphabet[byte % alphabet.length];
  }
  const grouped = raw.match(/.{1,4}/g) || [raw];
  return { code: grouped.join("-"), normalized: raw };
}

function normalizeRecoveryCode(value) {
  return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
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

async function runDelete(env, statement, ...params) {
  const result = await env.DB.prepare(statement).bind(...params).run();
  return result?.meta?.changes ?? 0;
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

function normalizeLoggedToday(lastEntryDate) {
  if (!lastEntryDate) {
    return 0;
  }
  const today = new Date().toISOString().slice(0, 10);
  return lastEntryDate === today ? 1 : 0;
}

function formatDateInTimeZone(date, timeZone) {
  if (!timeZone) {
    return date.toISOString().slice(0, 10);
  }
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
    return formatter.format(date);
  } catch (_err) {
    return date.toISOString().slice(0, 10);
  }
}

function maxIsoTimestamp(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  const aMs = Date.parse(a);
  const bMs = Date.parse(b);
  if (!Number.isNaN(aMs) && !Number.isNaN(bMs)) {
    return aMs >= bMs ? a : b;
  }
  return a >= b ? a : b;
}

function deriveEntryDate(entry, timeZone) {
  const dateLocal = toText(entry?.date_local);
  if (dateLocal) {
    return dateLocal;
  }
  const measuredAt = typeof entry?.measured_at === "string" ? entry.measured_at : "";
  if (measuredAt) {
    const parsed = Date.parse(measuredAt);
    if (!Number.isNaN(parsed)) {
      return formatDateInTimeZone(new Date(parsed), timeZone);
    }
  }
  return null;
}

async function fetchLatestEntry(env, userId) {
  return await env.DB.prepare(
    "SELECT measured_at, date_local, weight_kg, waist_cm, updated_at FROM shared_entries WHERE user_id = ? AND is_deleted = 0 ORDER BY measured_at DESC LIMIT 1",
  )
    .bind(userId)
    .first();
}

async function getUserTimezone(env, userId) {
  const row = await env.DB.prepare(
    "SELECT settings_json FROM profile_settings WHERE user_id = ?",
  )
    .bind(userId)
    .first();
  const raw = typeof row?.settings_json === "string" ? row.settings_json : "";
  if (!raw) {
    return null;
  }
  try {
    const settings = JSON.parse(raw);
    const tz = typeof settings.timezone === "string" ? settings.timezone.trim() : "";
    if (!tz) {
      return null;
    }
    return normalizeTimezone(tz);
  } catch (_err) {
    return null;
  }
}

async function refreshStatusFromEntries(env, userId, timeZone) {
  const latest = await fetchLatestEntry(env, userId);
  const now = new Date().toISOString();
  if (!latest) {
    const existing = await env.DB.prepare(
      "SELECT logged_today FROM status_updates WHERE user_id = ?",
    )
      .bind(userId)
      .first();
    const loggedFlag = existing ? Number(existing.logged_today) : 0;
    await env.DB.prepare(
      "INSERT INTO status_updates (user_id, logged_today, last_entry_date, weight_kg, waist_cm, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET logged_today = excluded.logged_today, last_entry_date = excluded.last_entry_date, weight_kg = excluded.weight_kg, waist_cm = excluded.waist_cm, updated_at = excluded.updated_at",
    )
      .bind(userId, loggedFlag, null, null, null, now)
      .run();
    return;
  }
  const lastEntryDate = deriveEntryDate(latest, timeZone);
  let loggedToday = null;
  if (timeZone) {
    const today = formatDateInTimeZone(new Date(), timeZone);
    loggedToday = lastEntryDate ? lastEntryDate === today : false;
  } else {
    const existing = await env.DB.prepare(
      "SELECT logged_today FROM status_updates WHERE user_id = ?",
    )
      .bind(userId)
      .first();
    if (existing && typeof existing.logged_today !== "undefined") {
      loggedToday = Boolean(existing.logged_today);
    } else if (lastEntryDate) {
      const todayUtc = formatDateInTimeZone(new Date(), null);
      loggedToday = lastEntryDate === todayUtc;
    } else {
      loggedToday = false;
    }
  }
  await env.DB.prepare(
    "INSERT INTO status_updates (user_id, logged_today, last_entry_date, weight_kg, waist_cm, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET logged_today = excluded.logged_today, last_entry_date = excluded.last_entry_date, weight_kg = excluded.weight_kg, waist_cm = excluded.waist_cm, updated_at = excluded.updated_at",
  )
    .bind(
      userId,
      loggedToday ? 1 : 0,
      lastEntryDate,
      latest.weight_kg ?? null,
      latest.waist_cm ?? null,
      now,
    )
    .run();
}

async function upsertStatusIfNeeded(env, userId, status, lastEntryDate, weightKg, waistCm, loggedToday) {
  if (!lastEntryDate) {
    return;
  }
  const loggedFlag = loggedToday ? 1 : 0;
  const sameLogged = (status?.logged_today ?? null) === loggedFlag;
  const sameDate = (status?.last_entry_date ?? null) === lastEntryDate;
  const sameWeight = (status?.weight_kg ?? null) === (weightKg ?? null);
  const sameWaist = (status?.waist_cm ?? null) === (waistCm ?? null);
  if (status && sameLogged && sameDate && sameWeight && sameWaist) {
    return;
  }
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO status_updates (user_id, logged_today, last_entry_date, weight_kg, waist_cm, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET logged_today = excluded.logged_today, last_entry_date = excluded.last_entry_date, weight_kg = excluded.weight_kg, waist_cm = excluded.waist_cm, updated_at = excluded.updated_at",
  )
    .bind(userId, loggedFlag, lastEntryDate, weightKg, waistCm, now)
    .run();
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
