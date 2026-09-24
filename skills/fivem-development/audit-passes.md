# FiveM Audit — Mandatory Passes & Report Gates

**Author:** Elias Araújo  
**Part of:** [best-practices.md](best-practices.md) index (one skill: `fivem-development`)  
**When to read:** only for `/fxmind audit` (and the audit input of `/fxmind refactor`). Implementation rules live in [performance.md](performance.md), [security.md](security.md) and `.fxmind/policy/fivem-principles.md`.  
**Section numbers** (`§2.3`–`§2.5`, Pass ids, V-a…V-j, E-a…E-g, N-a…N-d) are stable — keep them when linking from audits/corrections.

---

## 2. Audit passes (moved from performance.md — numbering kept)

### 2.3 Audit — View Cache & Hot-Path Rebuild

Use this checklist when running **`/fxmind audit`** or reviewing server sync code.

#### Step A — Find transform/build functions

Grep scope: all `server/**/*.lua` (or `client/**/*.lua` for client-only UI state) in the resource.

```text
^function build|^local function build
^function Sanitize|^local function Sanitize
^function Get.*List|^local function Get.*List
^function Get.*Summary|^local function Get.*Summary
json\.decode
table\.sort
ChunkTable|CHUNK_SIZE|CHUNK_DELAY
Load.*Player|Load.*Cache
```

Flag any function that **transforms** cached data (`json.decode`, normalize loops, `_countTable`, `table.sort`, chunking) — not plain DB reads.

#### Step B — Map call sites (hot vs cold)

For each transform function, list callers and classify:

| Call context | Hot path? | Typical severity |
|--------------|-----------|------------------|
| Inside `TriggerClientEvent(...)` argument | Yes | **High** |
| `RegisterNetEvent` / `AddEventHandler` (player request) | Yes | **High** |
| `playerConnect` / `playerJoining` / spawn bootstrap | Yes | **High** |
| CRUD handler after single row change (create/update/delete) | Yes if full rebuild | **High** |
| Resource start / `Load*Cache` after DB fetch | No (cold) | OK |
| Incremental rebuild of one key after CRUD | No | OK |

**Evidence required:** `file:line` for both the build function and each hot caller.

#### Step C — Check for missing view cache

Red flags:

1. **Source cache only** — e.g. `GarageCache = {}` populated in `LoadGarageCache`, but no parallel `*ViewCache`, `*Sanitized*`, or `Manager*Cache`.
2. **Build on send** — `TriggerClientEvent("...", source, buildItem(id, RawCache[id]))`.
3. **Double build** — one item built for delta, then `buildList()` for full list in same handler.
4. **Full player reload on delta** — `LoadSomethingPlayer(source)` after create/update when `SendDeltaSync` or small delta event exists.
5. **Manual chunk loop** — `ChunkTable` + `Wait(ms)` per player instead of cerberus or pre-built chunks sent from cache.
6. **Full cache reload** — `LoadSomethingCache()` (DB `SELECT *`) after single insert/update instead of patching one entry.

#### Step D — Propose fix (audit report format)

Each finding must include **Problem → Fix → Snippet**. Prefer minimal diff:

```markdown
| ID | Severity | File | Issue | Recommendation |
| P2 | High | `server/adapter.lua:574` | `buildManagerGarageList()` on every `manager:getGarages` | Add `ManagerGarageListCache`; rebuild in `LoadGarageCache` + CRUD; handler sends cache |
```

**Fix template — view cache layer:**

```lua
local SourceCache = {}
local ViewCache = {}       -- map id -> client-ready item
local ViewListCache = nil  -- optional sorted array; nil = dirty

local function rebuildViewItem(id)
    local data = SourceCache[id]
    ViewCache[id] = data and buildItem(id, data) or nil
    ViewListCache = nil
end

local function rebuildViewAll()
    ViewCache = {}
    for id, data in pairs(SourceCache) do
        ViewCache[id] = buildItem(id, data)
    end
    ViewListCache = nil
end

local function getViewList()
    if not ViewListCache then
        local list = {}
        for _, item in pairs(ViewCache) do list[#list + 1] = item end
        table.sort(list, function(a, b) return tostring(a.id) < tostring(b.id) end)
        ViewListCache = list
    end
    return ViewListCache
end

-- Load: SourceCache = ... ; rebuildViewAll()
-- CRUD: SourceCache[id] = ... ; rebuildViewItem(id)
-- Send: TriggerClientEvent("...", source, ViewCache[id]) or getViewList()
```

**Fix template — delta instead of full resync:**

```lua
-- WRONG: full reload for one garage change
LoadGaragePlayer(source)

-- CORRECT: delta already shaped in view cache
TriggerClientEvent("garages:updateGarage", -1, ViewCache[id])
-- or exports["cerberus"]:SendDeltaSync(-1, "garages:updateGarage", ViewCache[id])
```

**Fix template — incremental cache after DB write:**

```lua
-- WRONG
CreateRow(...)
LoadFullCacheFromDb()

-- CORRECT
local entry = buildSourceFromRow(row)
SourceCache[id] = entry
rebuildViewItem(id)
```

### 2.4 Audit Assertiveness — Mandatory Passes

When running **`/fxmind audit`**, the agent **must** complete every pass below before writing the report. Skipping a pass or auditing a single file while ignoring `fxmanifest` siblings is an **incomplete audit**.

#### Pass 0 — Full resource scope (non-negotiable)

1. Read **`fxmanifest.lua`** first — list every path in `server_scripts`, `client_scripts`, `shared_scripts`.
2. Read **every Lua file** in those paths (not only the file the user `@` mentioned).
3. In **Files reviewed**, list each file with line count — prove full coverage.
4. If user scoped one file explicitly (`audit adapter.lua only`), state that limitation in the report header; otherwise audit the **whole resource**.

#### Pass 1 — Evidence discipline

Every finding **must** include:

| Field | Rule |
|-------|------|
| **File:line** | Read the line — do not infer from memory or nearby findings |
| **Symbol** | Exact function/event name (`manager:updateGarage`, not "update handler") |
| **Caller context** | Quote the enclosing `RegisterNetEvent` / function name |

**Forbidden:**

- Attributing a line to the wrong handler (e.g. citing `updateGarage` when line 804 is inside `updateGarageVehicleSet`)
- Generic findings without grep proof
- Copying one finding's fix to another event without verifying each handler

**Verify before write:** for each `file:line`, confirm the line content matches the issue described.

#### Pass 2 — View cache matrix (check ALL rows)

For every resource with `*Cache`, `Load*`, `build*`, or manager sync — report **each row found**, or explicitly mark **N/A**:

| # | Check | Grep hint | If found → severity |
|---|-------|-----------|---------------------|
| V-a | `build*` / `Sanitize*` **inside** `TriggerClientEvent(...)` args | `TriggerClientEvent\([^)]*build` | **High** |
| V-b | `build*List()` / `Get*Summary*()` in event handler | **every** caller grep'd — list all `file:line` | **High** |
| V-c | **Double build** — `build*Item` then `build*List` in same handler | same function body | **High** |
| V-d | **Redundant sync storm** in same CRUD handler | count **every** send: manager UI + full list + `Load*Player` + world delta (`Send*Update*`, `garages:*`) | **High** |
| V-e | `Load*Player` / full sanitize on `playerConnect` | `playerConnect` → `Load*` | **High** |
| V-f | `Load*Player` after single CRUD when delta fn exists | update/create + `Send*Update` / `SendDelta` | **High** |
| V-g | `Load*Cache()` full DB after one insert/update | `insertSync`/`execute` then `Load*Cache()` | **Medium** |
| V-h | Duplicate transform (`apply*Entry` vs `build*Item`, duplicate `decode*`, same normalize in 2+ fns) | same fn name twice **or** parallel build paths without shared view cache | **Medium** |
| V-i | Manual `ChunkTable` + `Wait` loop | `ChunkTable` + `Wait(` | **Medium** |
| V-j | **`TriggerClientEvent(-1, ...)` misuse** | `manager:*` or admin UI to `-1`; large table to `-1` without cerberus | **High** / **Critical** if admin leak |

**V-b rule:** one matrix row is not enough — in **V-b detail**, list **every** hot caller (e.g. `getGarages` **and** each `GetGarageVehicleSetSummaryList()` after CRUD).

**V-d rule:** do not label "triple" from habit — **list each sync line** in the handler. Example create: `manager:garageUpdated` + `manager:receiveGarages` + `LoadGaragePlayer` + `SendGarageUpdateToClients` = **4 paths**; recommend keeping only admin `source` delta + world delta.

**Findings vs matrix:** V-b/V-d detail and the view-cache matrix drive **discovery** — each distinct issue still gets its **own row** in the Findings table (e.g. two V-b rows, two V-d rows). **Summary counts come from Findings rows only**, not from matrix row count (see Pass 7 **Summary count rule**).

**V-h rule:** flag `apply*Entry` + `build*Item` (or similar) when both decode/normalize the same cache fields without a shared view cache.

**V-j rules (§1.6.1):**

- `TriggerClientEvent("manager:*", -1, ...)` → **Critical** (admin data leak)
- `TriggerClientEvent(-1, ...)` with payload likely > 8 KB or full cache table → **High** — use cerberus
- `TriggerClientEvent(-1, smallWorldDelta)` for gameplay sync → **OK** — do not flag
- A V-j marked **Found** (even conditional/disabled) always gets its own Findings row — matrix-only V-j breaks the Summary count (robberys).

Missing rows that apply to the resource = **incomplete audit**.

#### Pass 2b — Client-callable endpoint flow (amplification / DoS / payload)

View-cache (V-a–V-j) asks *how* you build/sync. This pass asks: **what happens if a cheat fires this endpoint in a tight loop?**

**Scope — inventory EVERY client-callable server endpoint**, not only `RegisterNetEvent`:

```text
RegisterNetEvent / AddEventHandler   (TriggerServerEvent)
Tunnel.bindInterface("<name>", func)  → each func.* is an endpoint (vRP Creative)
RegisterNUICallback → client → server (NUI-triggered)
```

For each endpoint:

```text
client → endpoint
        → server handler
              ├─ MySQL / oxmysql / heavy query?     → cost × N spam
              ├─ TriggerClientEvent(..., -1, ...)? → cost × players × N spam
              ├─ Load*Cache / full rebuild?         → cost × N spam
              ├─ response size (tunnel_res)?        → KB × N spam (§1.6)
              └─ SafeEvent / cooldown / auth?       → brake or open flood
```

| # | Check | Why it matters | If found → severity |
|---|-------|----------------|---------------------|
| E-a | Handler does **direct DB** (`MySQL.*`, `oxmysql`, `query.await`, `execute`) on every invoke | Cheat spam = DB saturation / server hitch | **High**; **Critical** if no throttle + mutating |
| E-b | Handler ends in **`TriggerClientEvent(..., -1, ...)`** or cerberus sync to all from **client-triggered** path | 1 packet in → N packets out (amplification); loop can lag/crash server | **Critical** if no auth/SafeEvent/cooldown; **High** if only weak throttle |
| E-c | Handler does **full cache reload** (`Load*Cache`, `SELECT *`, rebuild all views) on client request | Same as E-a at memory/CPU scale | **High** |
| E-d | Mutating / expensive handler **missing** `SafeEvent` (or equivalent rate-limit) | No server-side brake against flood | **High** (see [security.md](security.md) §4.6) |
| E-e | **StateBag churn** — `GlobalState` / replicated `.state:set` in loops, per-tick, or spam-able client events (§1.6.2) | Silent broadcast storm; same blast radius as `-1` | **Critical** if `GlobalState` + client-triggered; **High** if tight loop |
| E-f | **Response payload** — Tunnel/callback return or `TriggerClientEvent` reply > ~8 KB, or unbounded (LONGTEXT/base64 list) | `tunnel_res` flood; 290 KB response = 35× budget | **High** if > ~64 KB or list with heavy fields; **Medium** if > ~8 KB |
| E-g | **N+1 client loop** — client calls endpoint per item of a list it already holds (§1.4) | N queries + N responses per open | **High** on open path; **Medium** otherwise |

**Rules:**

1. **Assume the client is hostile.** Any `RegisterNetEvent` is callable by a cheat — UI buttons are not a gate.
2. **Never** put “query DB → broadcast `-1`” on an unauthenticated, unlimited client event. Prefer: validate → mutate memory/cache → delta to `source` or controlled world sync from **trusted server CRUD** (admin with auth, or internal timer) — not from a public spam-able event.
3. **Read-only** client events that need data: serve from **view cache** / `cacheaside`, not live SQL; still rate-limit.
4. **World `-1` deltas** after a real state change are fine when the trigger is server-authoritative (e.g. admin CRUD after §5.1 auth). Flag when the **entry point** is a naked client event.
5. **`GlobalState` / replicated bags** are network-expensive — apply the same hostility model as E-b (§1.6.2).
6. Cross-check with §1.6.1–§1.6.2 (who receives / bag replication) and §4.6 / §5.1 (SafeEvent + permission).
7. **Tunnel functions are endpoints too.** `Tunnel.bindInterface("x", func)` exposes every `func.*` to the client with a network return — apply E-a…E-g identically. Estimate response KB for `tunnel_res` (§1.6).

```lua
-- WRONG: cheat can loop TriggerServerEvent("shop:refresh") → DB + blast all clients
RegisterNetEvent("shop:refresh")
AddEventHandler("shop:refresh", function()
    local rows = MySQL.query.await("SELECT * FROM shops")
    TriggerClientEvent("shop:setAll", -1, rows)
end)

-- CORRECT: client gets cached view for self only; writes go through auth + SafeEvent
RegisterNetEvent("shop:get")
AddEventHandler("shop:get", function()
    local src = source
    if not exports["cerberus"]:SafeEvent(src, "shop:get", { interval = 2000, noBan = true }) then return end
    TriggerClientEvent("shop:set", src, ShopViewCache)  -- pre-built; no SQL
end)
```

**Audit output:** for each E-a…E-g hit, one Findings row with endpoint name, `file:line`, and the amplification/payload path (`DB`, `-1`, `Load*Cache`, `tunnel_res 290KB`, `N+1`). Do not leave E-* only in a matrix.

#### Pass NUI — CEF overlay fill & Vite cache (when `ui_page` or NUI `files` in fxmanifest)

**Mandatory** when the resource ships a NUI (`ui_page`, `files` with `nui/`, `html/`, `src/ui/build/`). Otherwise mark **N/A** for all rows.

View-cache and endpoint passes do not cover CEF rendering bugs. **Do not confuse** Vite cache (N-a) with rgba fill (N-b/N-c) — if build output already has `[hash]` and CSS uses hex, investigate N-b/N-c, not cache.

| # | Check | Grep hint | If found → severity |
|---|-------|-----------|---------------------|
| N-a | Vite output **without** content hash | `entryFileNames` / `chunkFileNames` / `assetFileNames` without `[hash]` in `vite.config.ts` | **High** |
| N-b | **Alpha fill** on rounded overlay/shell/popup over transparent html | `rgba(` on `.popup`/`.shell`/overlay; Tailwind `bg-*/[0-9]` or `rgb(... / var(--tw-bg-opacity))` on panel fill | **High** |
| N-c | **fadeIn/fadeOut** or opacity animation on overlay container | `fadeIn`, `fadeOut`, `.fade(` in NUI JS/CSS | **High** |
| N-d | **oklch** in CSS source or build output | `oklch(` (Tailwind v4) | **High** |

**N-b rules:**

- Solid buttons (`#F1A80D`) and `rgba` in **box-shadow** are OK — flag only the **panel/shell fill**.
- PNG/image backgrounds (`url(...)`, `images/bg.png`) are valid fills.
- React: flag `bg-black/70`, `bg-opacity-*` on rounded shell components.

**Audit output:** NUI matrix (N-a–N-d: Found / N/A) in report; each hit = Findings row with `file:line` + before/after fix (hex+gradient, dim on `::before`, remove fadeIn, or restore Vite `[hash]`).

**Correction plan (N-b/N-c):**

1. Replace rgba/Tailwind alpha fill with `#111111` + `background-image: linear-gradient(#111111,#111111)`.
2. Move screen dim to sibling/`::before` inset-0 without `border-radius`.
3. Replace `fadeIn`/`fadeOut` with `display: flex|none`.
4. React: absolute `inset-0 z-0` fill layer; content `z-[3]`.

#### Pass 3 — Globals with cross-file grep (§3.6)

For **each** top-level global in server scope:

1. `grep -l SymbolName` across all server Lua files listed in `fxmanifest`.
2. **One file only** → finding `G*` — recommend `local`.
3. **Two+ server files** → row in report **OK — justified** (do not flag).
4. Repeat for client scope separately.
5. Never flag `GarageLocates`-style globals without checking `server.lua` (or sibling files).

Report a **Globals table** with columns: Symbol | Declared | Used in files | Verdict.

#### Pass 4 — Client-callable endpoint matrix (exposure & auth)

Grep **every** client-callable server endpoint (all classes):

```text
RegisterNetEvent\("                → event endpoints
Tunnel\.bindInterface\(            → Tunnel resources; then enumerate each func.*
RegisterNUICallback                → NUI → client → server chains
RegisterNetEvent\("manager:        → admin class (subset)
RegisterNetEvent\("admin:
```

Build a **Client-callable endpoint matrix** — one row per endpoint:

| Endpoint | Type (event/Tunnel/NUI) | Auth | Rate-limit (SafeEvent) | Input validated | DB cost | Response (KB) | Fan-out | Severity if missing |
|----------|-------------------------|------|------------------------|-----------------|---------|---------------|---------|---------------------|
| `func.loadPresets` | Tunnel | Passport | none | n/a (read) | query per call | ~290 KB list | source | High (E-a/E-f) |
| `func.deleteOutfit` | Tunnel | Passport | none | **no** | execute | tiny | source | High (E-d) |
| `manager:deleteGarage` | event | **none** | none | no | execute | tiny | source | **Critical** (no auth) |

**Classes & severity anchors:**

| Class | Rule | Severity if violated |
|-------|------|----------------------|
| `manager:*` / `admin:*` (staff) | **Real** server permission required (`hasGroup`/`hasPermission` + identity) | **Critical** (read leak or CRUD without auth) |
| Mutation (create/update/delete) | SafeEvent + input validation (§5.3) | **High** (E-d / §5.3) |
| Read with DB cost | cacheaside/view cache + rate-limit | **High** (E-a) |
| Read with large response | metadata-only list; detail on demand (§1.6, §2.1.1) | **High** (E-f) |

**Critical rule:** a helper named `CanUse*`, `checkCooldown`, or similar that only checks **time/source** is **not** permission. Do not treat it as auth. When stating "used by N events", **grep and count** — do not guess.

If **any** `manager:*` / `admin:*` endpoint lacks real permission → **Critical**, grouped as one systemic finding with all endpoint names listed. Non-admin endpoints: one Findings row per violated rule (E-*, §5.3).

#### Pass 5 — Severity ↔ correction plan alignment

| Severity in findings | Phase in plan |
|----------------------|---------------|
| Critical | **Phase 1 only** |
| High | **Phase 2** (view cache, hot-path perf, exploit surface) |
| Medium | Phase 3 |
| Low | Phase 4 |

**Forbidden:** marking a finding **High** in the table but placing its fix in Phase 3/4.

### 2.5 Report quality gates (Pass 6–7)

Pass 6 = pre-save checklist. Pass 7 = gates that commonly invalidate otherwise good audits (including **Summary count rule**).

#### Pass 6 — Pre-report self-check

Before saving the report, confirm:

- [ ] All `fxmanifest` Lua files listed in **Files reviewed**
- [ ] View cache matrix: every applicable row checked (V-a–V-j)
- [ ] **Endpoint flow (Pass 2b):** every client-callable endpoint (event + `Tunnel.bindInterface` funcs + NUI chains) checked for E-a…E-g
- [ ] **NUI matrix (Pass NUI):** when `ui_page`/NUI files present — every row N-a–N-d checked (Found / N/A)
- [ ] **Response size estimated** per read endpoint (KB); any `tunnel_res`/reply > ~8 KB flagged (E-f)
- [ ] **N+1 grep:** no client loop calling server per item of a list (E-g / §1.4)
- [ ] Broadcast targets: `manager:*` / admin events use `source`, not `-1` (§1.6.1)
- [ ] StateBags: no `GlobalState` / replicated writes in hot loops; bags stay small (§1.6.2)
- [ ] Large `-1` or full-cache sync uses cerberus, not manual chunks
- [ ] Every `build*` caller grep'd with `file:line`
- [ ] Globals table complete for server + client scope
- [ ] **Client-callable endpoint matrix** complete (Pass 4); admin/manager marked as class
- [ ] Input validation checked on every mutation (§5.3)
- [ ] Client-side cache considered in fixes for repeated reads (§2.1.1)
- [ ] No finding references wrong handler/symbol
- [ ] Phase plan severity matches findings tables
- [ ] Each High/Critical finding has a **before/after code snippet**
- [ ] **Summary counts** match Findings row totals per severity (Pass 7 **Summary count rule**)

#### Pass 7 — Report quality gates (common agent mistakes)

Fix these before saving — they caused **valid audits to lose trust**:

| Gate | Rule |
|------|------|
| **Files reviewed** | Only paths from `fxmanifest` (`server_scripts`, `client_scripts`, `shared_scripts`) + NUI if audited. **Never** list files not in manifest (e.g. `config/config.lua` when absent). `fxmanifest.lua` itself is read for scope, not listed — never penalize its absence. |
| **Summary counts** | Tally **every row** in Findings tables — see **Summary count rule** below. Matrix rows (V-a–V-j) do **not** map 1:1 to Summary. |
| **V-b completeness** | Grep `build*List\(` and `Get*Summary*` — **all** call sites in detail, not only the first. |
| **V-d accuracy** | Name **each** sync call in the CRUD handler; count paths, do not round to "triple". |
| **Cooldown count** | Grep `CanUse*Manager` (or similar) — exact count in prose. |
| **Endpoint inventory** | Grep `Tunnel.bindInterface` and enumerate **each** `func.*` — do not audit only `RegisterNetEvent`. Tunnel funcs are client-callable endpoints with `tunnel_res` responses. |
| **Payload estimate** | For every read endpoint, estimate response KB from the SELECT/payload shape (LONGTEXT/base64 = heavy). Never leave "response size" blank. |
| **Flood severity** | Never downgrade flood findings (E-a/E-d/E-f) to Medium/Low because "cerberus is present but unused" — presence without `SafeEvent` call = no brake. |
| **Delete + view cache** | Phase 2 must include **invalidating** view cache on delete (`ViewCache[id] = nil`), not only upsert. |
| **Permission fix** | Snippets use `hasGroup`/`hasPermission` with note: **confirm project staff group** — do not hardcode `Admin` without codebase evidence. |
| **Checklist honesty** | Do not mark `[x]` on security items the code fails (e.g. "client data re-validated" when `getGarages` has no auth). |

**Summary count rule (§2.5):**

The view-cache matrix (V-a–V-j) and V-b/V-d detail sections are for **discovery**. The **Summary** table counts **only Findings table rows**:

1. Sum rows in every Findings subsection by the **Severity** column (Security, Performance — View Cache, Performance — General, Patterns & Code Quality, NUI).
2. **One table row = one count** — even when the ID repeats (`V-b`, `V-d`, `V-h` each get separate Findings rows and each increments the total).
3. **Do not** derive Summary from matrix rows ("V-b found once" ≠ one High), Phase headings, or grouped themes in prose.
4. **Verify before save:** re-count Critical / High / Medium / Low from Findings; Summary must match exactly.

**Common mistake (`garages`):** matrix shows V-b and V-d once each, but Findings has **V-b×2** and **V-d×2** → Summary High **11** (wrong) vs **13** (correct: S8–S10 + V-a, V-b×2, V-c, V-d×2, V-e, V-f, V-j). Medium **10** vs **12** when V-h×2 and other Medium rows are under-counted.

Systemic auth (S1 narrative + S2…Sn) still requires **one Findings row per distinct issue** — do not collapse events into a single row without listing sub-rows in the table.
