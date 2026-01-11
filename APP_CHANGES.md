# HAPPY_SCALE_INSPIRED_UI_UX_SPEC.md

## Purpose
Create a mobile-first UI/UX that captures the *feel and workflow* of Happy Scale: calm, motivating, data-driven, and frictionless for daily logging—while using original styling/assets (do not copy proprietary visuals).

Primary objective: reduce the emotional volatility of daily weigh-ins by emphasizing trends over noisy day-to-day numbers, and to keep friends motivated through lightweight accountability signals.

(Reference behaviors and concepts: trend emphasis and “10-day best” as described by Happy Scale’s public materials.) 

---

## Non-negotiable: preserve existing functionality
This work is UI/UX focused. Do not remove capabilities that already exist.

### Required process rule for Codex
- **Inventory before changes**:
  - Identify current screens, flows, settings, and features.
  - Produce a short checklist of what exists today.
- **Compare and add, don’t delete**:
  - When redesigning, map each existing feature to a place in the new UI.
  - If a feature feels “out of place,” relocate it—do not remove it.
  - Any feature removal must be explicitly called out and justified (preferably avoided).
- **Regression guardrails**:
  - Preserve existing data fields, storage format, and relay API unless a backward-compatible migration is provided.
  - Keep theme customization and reminders behavior intact.

---

## Product principles
- **Open → log in < 10 seconds** (one-handed, minimal taps).
- **Trend-first**: show progress even when today’s number feels “bad.”
- **Motivation through accountability**: make it easy to see whether friends logged today.
- **Calm UI**: neutral dark theme, clear hierarchy, minimal decoration.
- **Every screen has one main action** (no clutter).
- **No silent failures**: network/sync errors must be obvious and actionable.
- **Mobile-first**: iPhone Home Screen PWA is the primary target.
- **Cross-client consistency**: PWA remains compatible with the desktop app.

---

## Cross-client compatibility (PWA ↔ Desktop app)
UI/UX changes must NOT break friend/data sharing with the desktop app.

### Compatibility requirements
- Friend invites, accept/reject, friend list, and local rename behaviors remain compatible.
- Shared profile fields across clients:
  - avatar/profile picture
  - display name (friend can locally rename without overwrites)
  - shared metrics: **weight** and **waist**
- Friend update presentation:
  - friend name + avatar
  - last shared time
  - latest shared weight/waist (only if allowed by share settings)
- Do not change endpoints/payloads unless backward compatible and documented.

---

## Information architecture
Bottom nav with 4 tabs:
1) **Summary**
2) **Chart**
3) **Logbook**
4) **Settings**

Friends should not be a bottom tab. Use the top-right circle button (below).

---

## Friends entrypoint (top-right circle icon)
### Requirement
- Add a small circular Friends button in the top-right of the header on main screens (Summary/Chart/Logbook/Settings).
- Icon can be a simple person/head silhouette (original).
- Tapping opens Friends UI.

### Motivation indicator (must keep)
- The **home/Summary page must retain the existing indicator** that shows whether friends have logged **today**.
- This indicator is core to motivation/accountability.
- The indicator should be visible without extra taps (e.g., a compact strip/card near the top).

---

## Theme & customization (must preserve existing behavior)
- Preserve existing theme customization:
  - The existing **color wheel** allowing arbitrary theme/accent color must remain.
- Always provide a dark mode.
- Implement UI using theme tokens (CSS variables) so color updates apply everywhere:
  - primary accent, focus states, primary buttons, chart trend line accents, etc.
- Do not hardcode colors into components beyond neutral surfaces/text.

---

## Notifications (push-only)
- All reminders/notifications are **push notifications** (service worker Web Push).
- No in-app notification inbox or “notification center” screen.
- In-app banners/toasts are allowed for status/errors (not considered notifications).

---

## Screen specs

### 1) Summary (dashboard)
Single scrollable screen of compact cards, trend-first, motivation-first.

#### A) Friends “logged today” indicator (must-have)
- A compact section showing friends and whether they’ve logged today:
  - avatar + name (or initials)
  - clear state: logged / not logged
- If there are many friends, use a horizontally scrollable row.
- Optional: nudge copy such as “2/3 friends logged today” (keep it neutral).

#### B) Recent stats (3 compact tiles)
- Today’s recorded weight (or “Not logged today”)
- Trend weight (current week average)
- 10-day best (lowest when losing, highest when gaining, over last 10 days)
Each tile tappable → deep links to Chart/Logbook filtered views.

#### C) Avg weekly change
- A compact block showing the average weekly change based on recent weeks (e.g., last 4 weeks).

#### D) Primary action
Prominent sticky “Log weight” or “+”:
- Opens Log Entry bottom sheet/modal.

---

### 2) Chart
Trend visualization and comparisons.

#### Requirements
- Plot:
  1) daily recorded weights (points)
- Show goal lines (final goal where configured).
- Tap/drag inspector:
  - recorded weight
  - trend weight
  - delta vs N days ago
- Time ranges: 1W / 1M / 3M / 1Y / All

#### Trend comparison (must preserve)
- Preserve the app’s existing ability to **compare trends**.
- If current app supports comparing:
  - your trend vs friend trend, or
  - multiple metrics, or
  - multiple time windows,
  keep it and place it in a clear control (e.g., “Compare” button, toggle, or dropdown).
- The redesign may improve discoverability and presentation, but must not remove it.

---

### 3) Logbook
Entries list for editing and detail.

#### Row format
- Date (with day-of-week)
- Recorded weight
- Trend weight
- Optional: small note indicator (if note exists)

#### Behaviors
- Tap row → Entry Details:
  - edit weight/date/time/note
  - delete entry (confirm)
- Quick add (“+” adds today; optional long-press for prior date).
- Filtering: All / Last 30 days / This month
- Optional: “Show only new 10-day best days”

---

### 4) Settings
Professional, grouped sections, preserves existing behavior.

#### A) Goals
- starting point date
- “Fresh start” mode (hide earlier entries without deleting)
- final goal weight

#### B) Theme (preserve current)
- color wheel (existing)
- dark mode always available
- keep stored preferences compatible

#### C) Calculation / display
- units (lb/kg)
- display emphasis (trend vs 10-day best)
- short plain-English descriptions

#### D) Reminders & Push Notifications (must preserve existing functionality)
- Preserve existing **custom reminders** feature:
  - user can create **as many reminders as they want**
  - each reminder supports:
    - time of day
    - repeat days (e.g., Mon/Wed/Fri)
    - enable/disable per reminder
- Provide:
  - reminders list (editable)
  - add reminder
  - edit reminder
  - delete reminder (confirm)
- Push notification status:
  - enabled/not enabled
  - test push button

#### E) Privacy & Security
- app lock if supported
- export/backup
- explanation of local vs synced storage

---

## Friends UI (opened from top-right circle button)
### Friend list
- avatar + name
- status: last update time + logged today indicator if applicable
- pending invites at top

### Friend detail
- avatar + name (local rename)
- last shared time
- latest shared metrics (weight + waist) where allowed
- share controls (if supported)
- remove friend (confirm)

---

## Logging UX (critical path)
Bottom sheet/modal:

### Must include fields
- Weight input (numeric keypad)
- Waist input (if supported)
- **Note field** (must-have):
  - short optional text note for that weigh-in
  - keep it unobtrusive (collapsed “Add note” is OK)
- Date/time (default today; time hidden under “More”)

### Validation
- soft validation (warn on extremes, allow save)
- never wipe user input on error

### After save
- toast “Saved”
- Summary updates immediately
- if sync fails: non-blocking banner (“Saved locally. Sync failed—Retry”)

---

## Visual style guide (original, not a clone)
- Dark theme, neutral grays, subtle elevation.
- 12–16px card radius.
- Accent color is user-selected via the existing color wheel.
- System fonts, consistent type scale.
- Tap targets ≥ 44px.
- Avoid overdesign (no neon gradients, excessive blur, or busy animations).

---

## Components to implement once and reuse
- Header bar with top-right Friends circle button
- Friends-logged-today indicator strip/card
- Card, stat tile
- Primary/secondary/danger buttons
- Bottom sheet modal
- Toast/snackbar (status only)
- Inline banner (info/warn/error)
- Chart tooltip overlay
- Empty states with one CTA
- Reminder row editor components (time picker + repeat days + enable toggle)

---

## States & failure handling
- Offline banner: “Offline — saving locally”
- Loading skeletons for Summary, lists, charts
- Friends sync:
  - show last sync failed and retry option

---

## Acceptance criteria checklist
- Summary includes a visible **friends logged today** indicator.
- Friends accessible via top-right circular icon on all main screens.
- Logging includes an optional **note** field per entry.
- Reminders UI preserves:
  - unlimited reminders
  - per-reminder time + repeat days + enable/disable
  - push-only notifications
- Trend comparison functionality remains available and usable.
- Theme color wheel customization continues to work; dark mode is available.
- PWA remains compatible with desktop app for friends + sharing (avatars, names, weight, waist).
- Codex performed an inventory and mapped old features to the new UI (compare-and-add, not remove).
