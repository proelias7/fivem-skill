# FiveM Best Practices

**Author:** Elias Araújo
**Focus:** Performance, Optimization, and Security (framework-agnostic)

---

## 1. Client/Server Communication

### 1.1 Callback vs Events — Golden Rule

> **Callback/Tunnel** = when you NEED a return
> **Event** = when you DO NOT need a return

**Performance Hierarchy (from lightest to heaviest):**

| Method | Performance | When to use |
|--------|-------------|-------------|
| `TriggerServerEvent` | Lightest | Action without return (preferred) |
| `ServerCallback._function()` | Medium | Fire-and-forget via callback (function already exists) |
| `ServerCallback.function()` | Heaviest | When return is needed |

```lua
-- CORRECT: return needed → callback/Tunnel
local inventory = ServerCallback.getUserInventory()

-- CORRECT: NO return needed → Event
TriggerServerEvent("airdrop:start")

-- AVOID: callback without using return (generates unnecessary overhead)
ServerCallback.startEvent()
```

**Why is callback/Tunnel heavier?** Each call generates:
- Argument serialization
- Promise creation (future)
- Callback allocation
- Timeout control (30s)

**Problems with callback without return:**
1. **Deadlocks** — system waits for a response that never comes
2. **Overhead** — high cost for simple action
3. **Saturation** — accumulated callbacks degrade the main thread

### 1.2 `_` Prefix (Fire-and-Forget)

```lua
-- WITH underscore: do not prepare callback
ServerCallback._startEvent()

-- WITHOUT underscore: prepares callback and waits for return
ServerCallback.startEvent()
```

Even with `_`, the callback still performs serialization and RPC processing. **Native event is always lighter.**

### 1.3 Calls in the Same Environment

Using events to call functions in the same environment (server→server) is wasteful.

```lua
-- WRONG: event in same environment
TriggerEvent("garages:tryDelete", vehNet, vehPlate)

-- CORRECT: direct function call
local function tryDelete(vehNet, vehPlate)
    -- logic
end
tryDelete(vehNet, vehPlate)

-- Expose to other contexts if necessary:
RegisterServerEvent("garages:tryDelete", tryDelete)  -- client→server
MyCallback.tryDelete = tryDelete                       -- callback
```

| Method | Environment | Performance |
|--------|----------|-------------|
| `function()` | Same | Instant |
| `TriggerEvent()` | Same | Goes through queue |
| `TriggerServerEvent()` | Client→Server | Network + queue |
| `Callback/Tunnel` | Client↔Server | Network + RPC |

**No thin event wrappers.** Do not create a `local function` whose only job is one `TriggerEvent` / `TriggerServerEvent` with no extra logic — that adds indirection without reuse (common AI mistake after audits).

```lua
-- WRONG: wrapper that only fires an event
local function finishSpawnSelection()
    TriggerEvent("login:Spawn", false)
end
finishSpawnSelection()

-- CORRECT: inline at the call site (1–2 uses)
TriggerEvent("login:Spawn", false)

-- CORRECT: real helper with shared logic (fade, camera, NUI, then notify)
local function closeSpawnUiAndNotifyLogin()
    SetNuiFocus(false, false)
    destroySpawnCamera()
    TriggerEvent("login:Spawn", false)
end
```

If the handler lives in the **same file**, call the local function directly (§1.3) instead of `TriggerEvent`. Use `TriggerEvent` only for **other resources** or documented hooks — and inline it unless the same call appears **3+ times**.

### 1.4 Avoid Remote Calls in Loops

```lua
-- WRONG: callback in high frequency loop
while true do
    ServerCallback.updatePosition()
    Wait(100)
end

-- CORRECT: larger interval
while true do
    TriggerServerEvent("player:position", GetEntityCoords(PlayerPedId()))
    Wait(5000)
end

-- BETTER: send only when necessary
local lastPosition = nil
while true do
    local pos = GetEntityCoords(PlayerPedId())
    if lastPosition == nil or #(pos - lastPosition) > 10.0 then
        TriggerServerEvent("player:position", pos)
        lastPosition = pos
    end
    Wait(100)
end

-- ALTERNATIVE: data batch
local positions = {}
while true do
    table.insert(positions, GetEntityCoords(PlayerPedId()))
    if #positions >= 10 then
        TriggerServerEvent("player:positions_batch", positions)
        positions = {}
    end
    Wait(100)
end
```

### 1.5 Mandatory Dynamic Sleep

**NEVER use fixed `Wait(0)`.** Adjust sleep based on current state.

```lua
-- WRONG
CreateThread(function()
    while true do
        Wait(0)  -- RUNS 60x/s, ALWAYS
        if IsPedArmed(PlayerPedId(), 6) then
            DisableControlAction(1, 140, true)
        end
    end
end)

-- CORRECT
CreateThread(function()
    while true do
        local sleep = 1500
        local ped = PlayerPedId()
        if IsPedArmed(ped, 6) then
            sleep = 0  -- Armed: needs to run every frame
            DisableControlAction(1, 140, true)
            DisableControlAction(1, 141, true)
            DisableControlAction(1, 142, true)
        end
        Wait(sleep)
    end
end)
```

**Recommended Sleep Table:**

| Situation | Sleep |
|----------|-------|
| Constant check (DisableControl, DrawText) | `0` |
| Player armed/in vehicle | `0-10` |
| State check (health, position) | `100-500` |
| Occasional check (zone, weather) | `1000-2000` |
| Rare check (configs, permissions) | `5000+` |

### 1.6 Payloads in Events

FiveM Limits:

| Type | Limit |
|------|--------|
| Single Event | ~16 KB (recommended < 8 KB) |
| Network buffer per tick | ~64 KB |
| Nested table | Max 16 levels |

```lua
-- WRONG: send full inventory when 1 item changes
TriggerClientEvent("inventory:full", source, fullInventory)

-- CORRECT: send only the change
TriggerClientEvent("inventory:addItem", source, { item = "water", amount = 1 })

-- For large data: divide into chunks
local function sendInChunks(source, data, chunkSize)
    local chunks = {}
    local current = {}
    local count = 0
    for k, v in pairs(data) do
        current[k] = v
        count = count + 1
        if count >= chunkSize then
            table.insert(chunks, current)
            current = {}
            count = 0
        end
    end
    if count > 0 then table.insert(chunks, current) end
    for i, chunk in ipairs(chunks) do
        TriggerClientEvent("sync:chunk", source, chunk, i, #chunks)
        Wait(100)
    end
end
```

**Signs of problem:** `Network overflow` in console, players disconnecting, lag spikes.

### 1.6.1 Broadcast targets — `source` vs `-1` vs cerberus

Choose the target by **audience** (who must receive) and **payload size** (how much data).

| Target | When to use | Payload size |
|--------|-------------|--------------|
| `source` | One player — UI/NUI reply, admin panel, personal bootstrap | Any (prefer < 8 KB) |
| `-1` | **Global world sync** — all clients must apply the same small change (blip, zone, delete id) | **Small only** (< ~8 KB recommended) |
| `SendDeltaSync` / `SendFullSync` | Many players + large table, or need **scope** (`range`, `scopeRadius`, chunking) | Any — cerberus handles load balance |

**Rules:**

1. **`-1` is for global gameplay state**, not admin/manager UI. Events like `manager:*`, panel refresh, or staff-only data → **`source`** (or explicit admin source list).
2. **Small delta to everyone** → `TriggerClientEvent("world:updateX", -1, smallPayload)` or cerberus `SendDeltaSync(-1, ...)` when payload is tiny.
3. **Large sync to everyone or scoped area** → **never** manual `ChunkTable` + `Wait` + `TriggerClientEvent(-1, ...)`. Use cerberus with `coords`, `range`, `scopeRadius`.
4. **Bootstrap one player** → `source` + pre-built view cache, or `SendFullSync(source, ...)`.

```lua
-- WRONG: admin UI broadcast to all players
TriggerClientEvent("manager:garageUpdated", -1, ManagerGarageListCache[id])

-- CORRECT: admin UI → only the admin client
TriggerClientEvent("manager:garageUpdated", source, ManagerGarageListCache[id])

-- CORRECT: world blip/zone sync → all players, small payload
TriggerClientEvent("garages:updateGarage", -1, {
    id = tostring(id), x = coords.x, y = coords.y, z = coords.z, spawns = spawns
})

-- CORRECT: large cache bootstrap near player
exports["cerberus"]:SendFullSync(source, "garages:fullSync", SanitizedGarageCache, {
    key = "garages:bootstrap",
    coords = GetEntityCoords(GetPlayerPed(source)),
    range = 150.0
})

-- CORRECT: delta to all, small entry (alternative to TriggerClientEvent -1)
exports["cerberus"]:SendDeltaSync(-1, "garages:updateGarage", ViewCache[id])
```

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `TriggerClientEvent("manager:*", -1, ...)` | Leaks admin data to every client | `source` only |
| `TriggerClientEvent(-1, hugeTable)` | Network overflow, tick spikes | cerberus `SendFullSync` / `SendDeltaSync` + scope options |
| Manual chunk loop to `-1` | Reinventing cerberus poorly | Pre-built cache + cerberus exports |

### 1.7 Signs of Callback/Tunnel Problems

If you see errors related to Tunnel/callback timeouts:
- **Cause:** Callback being used without return or in loop
- **Symptoms:** Internal loops, stuck callbacks
- **Solution:** Change to events

---

## 2. Data Cache

### 2.1 cacheaside — In-Memory Cache with TTL

Database queries are expensive operations. Use cache for repeatedly queried data.

```lua
-- WRONG: query every time
exports("checkRelation", function(playerId)
    local result = MySQL.query.await("SELECT * FROM relationship WHERE player_id = ?", { playerId })
end)

-- CORRECT: using cacheaside
exports("checkRelation", function(playerId)
    local Consult = exports.cacheaside:Get("relationship:findRelationship", playerId, {
        query = { "SELECT * FROM relationship WHERE player_id = ?", { playerId } },
        default = {}
    })
    if Consult[1] and Consult[1]["status"] == 3 then
        return true, Consult[1]["other_id"]
    end
    return false
end)
```

**Cacheaside API:**

| Function | Description |
|--------|-----------|
| `Get(namespace, key, opts)` | Fetches from cache or executes query |
| `Set(namespace, key, value, ttl)` | Saves value to cache (TTL optional, seconds) |
| `Delete(namespace, key)` | Removes specific item |
| `FlushNamespace(namespace)` | Clears entire namespace |
| `GetNamespace(namespace)` | Returns all entries in a namespace |

**Get Options:**
```lua
exports.cacheaside:Get("namespace", "key", {
    query = { "SQL", { params } },  -- query if cache miss
    ttl = 300,                       -- TTL in seconds
    default = {},                    -- default value
    forceRefresh = false,            -- force fetch from DB
    logger = true                    -- activate logs
})
```

**Install:** add `ensure cacheaside` in `server.cfg` before resources that depend on it. Recommended: **oxmysql** for the `query` option in `Get`.

**When to use cache:**

| Situation | Use Cache? |
|----------|-------------|
| Data that changes rarely (configs, ranks) | Yes |
| Repeated queries in short period | Yes |
| Real-time data (position, health) | No |
| Data that changes with every player action | No |

**Invalidating cache:**
```lua
exports.cacheaside:Delete("relationship:findRelationship", playerId)
exports.cacheaside:Set("relationship:findRelationship", playerId, newValue, 300)
```

### 2.2 Pre-Build Client Sync Payloads (View Cache)

When server data lives in a raw cache (DB row shape) but must be normalized before sending to clients — `json.decode`, field renaming, counts, defaults — **build the client-facing shape once** when the cache is populated or updated. Do **not** rebuild on every `TriggerClientEvent`.

```lua
-- WRONG: transform on every send
TriggerClientEvent("manager:garageUpdated", source, buildManagerGarageListItem(id, cacheEntry))

-- CORRECT: send pre-built payload from view cache
TriggerClientEvent("manager:garageUpdated", source, ManagerGarageListCache[id])
```

**Pattern:** keep two layers — source cache (truth) and view cache (client-ready).

```lua
local GarageCache = {}              -- raw DB / source truth
local ManagerGarageListCache = {}   -- client-ready view (pre-built)

local function buildManagerGarageListItem(id, data)
    local permOut = data.perm or ""
    local ok, decoded = pcall(json.decode, permOut)
    if ok and decoded and type(decoded) == "table" and #decoded > 0 then
        permOut = decoded
    end

    local vehicleClassesOut = data.vehicleClasses or {}
    if not vehicleClassesOut or #vehicleClassesOut == 0 then
        vehicleClassesOut = {}
    end

    return {
        id = id,
        name = data.name,
        coords = data.coords,
        spawns = data.spawns or {},
        spawnCount = data.spawns and type(data.spawns) == "table" and _countTable(data.spawns) or 0,
        perm = permOut,
        type = data.type or "Normal",
        vehicleSet = NormalizeGarageVehicleSetId(data.vehicleSet or data.vehicle_set),
        vehicleClasses = vehicleClassesOut,
        requireService = data.requireService == true or data.require_service == 1,
    }
end

local function rebuildManagerGarageListItem(id)
    local data = GarageCache[id]
    if data then
        ManagerGarageListCache[id] = buildManagerGarageListItem(id, data)
    else
        ManagerGarageListCache[id] = nil
    end
end

local function rebuildManagerGarageList()
    ManagerGarageListCache = {}
    for id, data in pairs(GarageCache) do
        ManagerGarageListCache[id] = buildManagerGarageListItem(id, data)
    end
end

-- Resource start / DB load
loadGaragesFromDb()
rebuildManagerGarageList()

-- CRUD: rebuild view cache, then sync by audience
function upsertGarage(id, data, adminSource)
    GarageCache[id] = data
    rebuildManagerGarageListItem(id)
    -- Admin UI → source only (§1.6.1)
    TriggerClientEvent("manager:garageUpdated", adminSource, ManagerGarageListCache[id])
    -- World state → all players, small delta
    TriggerClientEvent("garages:updateGarage", -1, WorldViewCache[id])
end

function removeGarage(id, adminSource)
    GarageCache[id] = nil
    ManagerGarageListCache[id] = nil
    TriggerClientEvent("manager:garageDeleted", adminSource, id)
    TriggerClientEvent("garages:deleteGarage", -1, id)
end

-- Player bootstrap: one player, large payload → cerberus or pre-built chunks
exports["cerberus"]:SendFullSync(source, "garages:fullSync", SanitizedGarageCache, {
    key = "garages:bootstrap:" .. source,
    coords = GetEntityCoords(GetPlayerPed(source)),
    range = 150.0
})
```

If the client needs a sorted array, build that list once at bootstrap or full rebuild — not per player or per event:

```lua
local function buildManagerGarageList()
    local list = {}
    for id, item in pairs(ManagerGarageListCache) do
        list[#list + 1] = item
    end
    table.sort(list, function(a, b) return tostring(a.id) < tostring(b.id) end)
    return list
end
```

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `build*(id, cacheEntry)` inside every `TriggerClientEvent` | Repeated decode/normalize/allocate on hot paths; CPU spikes when broadcasting | Rebuild view cache on load and on CRUD only |
| Full list sort on every delta sync | O(n log n) work per small change | Keep map cache; sort once for bootstrap or when list shape changes |
| Same transform in multiple handlers | Drift and inconsistent payloads | Single `build*` function; write only to view cache |
| Full resync (`Load*Player`, `Sanitize*Cache`, manual chunks) on single CRUD | Rebuilds entire cache + network blast for one change | Delta event or cerberus `SendDeltaSync`; full sync only from pre-built chunks |
| `Load*Cache()` full DB reload after one insert/update | O(all rows) query + reparse per admin action | Upsert affected entry in memory cache + rebuild view for that key |
| `Get*SummaryList()` / `build*List()` inside event handlers | Recompute + sort on every manager open | Cache summary/list at load/CRUD; handlers send cached reference |
| `TriggerClientEvent("manager:*", -1, ...)` | Admin payload to all clients | `source` for UI; `-1` only for world sync events (§1.6.1) |
| `TriggerClientEvent(-1, largeTable)` | Overflow / lag | cerberus `SendFullSync` / `SendDeltaSync` with scope |

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

**V-h rule:** flag `apply*Entry` + `build*Item` (or similar) when both decode/normalize the same cache fields without a shared view cache.

**V-j rules (§1.6.1):**

- `TriggerClientEvent("manager:*", -1, ...)` → **Critical** (admin data leak)
- `TriggerClientEvent(-1, ...)` with payload likely > 8 KB or full cache table → **High** — use cerberus
- `TriggerClientEvent(-1, smallWorldDelta)` for gameplay sync → **OK** — do not flag

Missing rows that apply to the resource = **incomplete audit**.

#### Pass 3 — Globals with cross-file grep (§3.6)

For **each** top-level global in server scope:

1. `grep -l SymbolName` across all server Lua files listed in `fxmanifest`.
2. **One file only** → finding `G*` — recommend `local`.
3. **Two+ server files** → row in report **OK — justified** (do not flag).
4. Repeat for client scope separately.
5. Never flag `GarageLocates`-style globals without checking `server.lua` (or sibling files).

Report a **Globals table** with columns: Symbol | Declared | Used in files | Verdict.

#### Pass 4 — Admin / manager events (§5.1)

Grep all server events with admin/manager prefixes:

```text
RegisterNetEvent\("manager:
RegisterNetEvent\("admin:
RegisterNetEvent\(".*:[Mm]anager
```

Build a **Manager events matrix** — one row per event:

| Event | SafeEvent | Real permission (`hasGroup`/`hasPermission`) | Cooldown-only helper | CRUD / leak | Severity if missing auth |
|-------|-----------|-----------------------------------------------|----------------------|-------------|--------------------------|
| `manager:getGarages` | ? | ? | ? | data leak | **Critical** |
| `manager:deleteGarage` | ? | ? | ? | CRUD | **Critical** |

**Critical rule:** a helper named `CanUse*`, `checkCooldown`, or similar that only checks **time/source** is **not** permission. Do not treat it as auth. When stating "used by N events", **grep and count** — do not guess (e.g. `CanUseGarageManager` may be 6 calls, not 7).

Flag missing **real** server permission on:

- Events that **read** sensitive config (lists with perms, coords, admin data)
- Events that **mutate** DB/world (create/update/delete/teleport)

If **any** `manager:*` / admin event lacks real permission → **Critical**, grouped as one systemic finding with all event names listed.

#### Pass 5 — Severity ↔ correction plan alignment

| Severity in findings | Phase in plan |
|----------------------|---------------|
| Critical | **Phase 1 only** |
| High | **Phase 2** (view cache, hot-path perf, exploit surface) |
| Medium | Phase 3 |
| Low | Phase 4 |

**Forbidden:** marking a finding **High** in the table but placing its fix in Phase 3/4.

#### Pass 6 — Pre-report self-check

Before saving the report, confirm:

- [ ] All `fxmanifest` Lua files listed in **Files reviewed**
- [ ] View cache matrix: every applicable row checked (V-a–V-j)
- [ ] Broadcast targets: `manager:*` / admin events use `source`, not `-1` (§1.6.1)
- [ ] Large `-1` or full-cache sync uses cerberus, not manual chunks
- [ ] Every `build*` caller grep'd with `file:line`
- [ ] Globals table complete for server + client scope
- [ ] Manager events matrix complete (or N/A stated)
- [ ] No finding references wrong handler/symbol
- [ ] Phase plan severity matches findings tables
- [ ] Each High/Critical finding has a **before/after code snippet**

#### Pass 7 — Report quality gates (common agent mistakes)

Fix these before saving — they caused **valid audits to lose trust**:

| Gate | Rule |
|------|------|
| **Files reviewed** | Only paths from `fxmanifest` (`server_scripts`, `client_scripts`, `shared_scripts`) + NUI if audited. **Never** list files not in manifest (e.g. `config/config.lua` when absent). |
| **Summary counts** | Count **rows in Findings tables** per severity. Systemic auth may be **1 theme + S2…Sn rows** — if grouped in summary, say so explicitly; sub-rows must still exist in tables. |
| **V-b completeness** | Grep `build*List\(` and `Get*Summary*` — **all** call sites in detail, not only the first. |
| **V-d accuracy** | Name **each** sync call in the CRUD handler; count paths, do not round to "triple". |
| **Cooldown count** | Grep `CanUse*Manager` (or similar) — exact count in prose. |
| **Delete + view cache** | Phase 2 must include **invalidating** view cache on delete (`ViewCache[id] = nil`), not only upsert. |
| **Permission fix** | Snippets use `hasGroup`/`hasPermission` with note: **confirm project staff group** — do not hardcode `Admin` without codebase evidence. |
| **Checklist honesty** | Do not mark `[x]` on security items the code fails (e.g. "client data re-validated" when `getGarages` has no auth). |

---

## 3. Code Structure

### 3.1 `or` Chains → Permission Table

```lua
-- WRONG: or chain
if hasPermission(source, "Cor")
or hasPermission(source, "Police32")
or hasPermission(source, "Diamante")
-- ... 15 more lines ...
then end

-- CORRECT: table + function
local weaponColorPerms = {
    "Cor", "Police32", "Police16", "Soul", "Diamante",
    "Boost", "Admin", "Rubi", "DoadorFacT201"
}

local function hasAnyPermission(source, list)
    for _, perm in ipairs(list) do
        if hasPermission(source, perm) then
            return true
        end
    end
    return false
end

if hasAnyPermission(source, weaponColorPerms) then
    -- action
end
```

### 3.2 if/else → Lookup Tables

```lua
-- WRONG
if type == "bronze" then return 100
elseif type == "silver" then return 250
elseif type == "gold" then return 500
end

-- CORRECT (O(1) vs sequential)
local rewards = { bronze = 100, silver = 250, gold = 500 }
local value = rewards[type] or 0
```

Use tables when: more than 3 conditions, dynamic types (items, ranks, vehicles).

### 3.3 Never Empty `if`

```lua
-- WRONG
if success then
    -- empty
else
    TriggerClientEvent('Notify', source, 'negado', 'Error')
end

-- CORRECT
if not success then
    TriggerClientEvent('Notify', source, 'negado', 'Error')
end
```

### 3.4 Protect Against nil

```lua
-- WRONG: crash if playerData is nil
"Name: " .. playerData.firstName .. " " .. playerData.lastName

-- CORRECT: check and protect
local playerData = GetPlayerData(source)
if not playerData then
    TriggerClientEvent('Notify', source, 'negado', 'Player not found')
    return
end

-- Or use fallback
local name = (playerData.firstName or "") .. " " .. (playerData.lastName or "")
```

### 3.5 Resource Layout — Monolith First

**Default structure for a FiveM resource:**

```
resource_name/
├── fxmanifest.lua
├── shared/config.lua
├── server/server.lua
└── client/client.lua
```

Split into extra files **only when**:

- A single file is genuinely hard to navigate (~800–1000+ lines **and** a clear domain boundary), **or**
- Code is shared by multiple resources

**Do not:**

- Create one file per feature, panel, cache, or logger when a `local function` in `server.lua` suffices
- Split client/server like React components — that pattern belongs in NUI (see skill `fivem-react-nui` → `ui-guide.md`), not in Lua scripts

**fxmanifest:** keep `server_scripts` and `client_scripts` minimal.

```lua
-- BAD (over-split)
server_scripts {
    "server/discord.lua",
    "server/cache.lua",
    "server/panel_a.lua",
    "server/panel_b.lua",
    "server/server.lua",
}

-- GOOD (default)
server_scripts {
    "@vrp/lib/utils.lua",
    "server/server.lua",
}
```

### 3.6 Reuse Functions — Avoid Fake Modules

Prefer `local function` in the same file over new globals or extra modules.

| Situation | Do |
|-----------|-----|
| Helper used once in the same file | `local function` near the top |
| Helper used in multiple handlers in the same file | One shared `local function` — do not duplicate |
| Helper shared across resources | Separate file or shared lib — justified |
| Small cache (names, cooldowns) | `local` table at file top |
| Cache read by **another file in the same resource, same side** (server→server or client→client) | Global or `return` module — justified |

**Globals rule:** a table/function without `local` is OK only when **another script file in the same resource and same runtime side** reads it (per `fxmanifest` — all paths under `server_scripts` share server scope; `client_scripts` share client scope). If the symbol is used **only in the file that declares it**, use `local`.

**Audit check for globals:**

1. Read `fxmanifest.lua` — split files into **server scope** vs **client scope** (ignore `shared_scripts` for this rule unless the global is explicitly shared by design).
2. Grep top-level assignments: `^[A-Z][A-Za-z0-9_]*\s*=` and `^function [A-Z]` (exclude `local`).
3. For each symbol, grep all Lua files in the **same scope only**.
4. **Flag** if used in declaring file only → recommend `local`.
5. **Do not flag** if referenced from another file in same scope (e.g. `GarageCache` in `adapter.lua` read by `server/garages.lua`).
6. **Flag** server global read from client file (or vice versa) — wrong pattern; use events, exports, or shared with clear contract.

```lua
-- OK: server/adapter.lua
GarageCache = {}
-- server/spawn.lua reads GarageCache[id]

-- WRONG: only used inside adapter.lua
GarageCache = {}  -- → local GarageCache = {}

-- CORRECT: local helper in server.lua
local identityNameCache = {}
```

Extract to another file only when the boundary is **stable, large, and reused** — not preemptively.

### 3.7 Comments — Less Is More

Code must be readable **without** comments. Agents often over-comment; avoid that.

**Do not:**

- Banner separators (`-------------------------------------------------------------------`)
- Comment every function or block
- Narrate obvious steps (`-- get player`, `-- check permission`, `-- return false`)

**Do comment:**

- Non-obvious business rules
- Framework quirks (e.g. vRP `hasGroup` vs `hasPermission`)
- Anti-bug traps that are not obvious from the code

```lua
-- WRONG
-- Check if player has permission
if vRP.hasGroup(passport, "Police") then
    -- Give item
    vRP.generateItem(passport, "bandage", 1)
end

-- CORRECT (no comment needed — names are clear)
if vRP.hasGroup(passport, "Police") then
    vRP.generateItem(passport, "bandage", 1)
end

-- CORRECT (comment adds real context)
-- PoliceSSP.Parent includes Police/Dip; use hasPermission for direct SSP staff only
if vRP.hasPermission(passport, "PoliceSSP") then
    ...
end
```

### 3.8 Variable and State Placement

Declare **all** constants and state at the **top** of the file — never scatter new `local` blocks between event handlers.

**Recommended file order:**

1. Requires / Tunnel / Proxy
2. Constants and state tables (`local ActiveActions = {}`, cooldowns, flags)
3. Local helper functions
4. Interface binding (`cRP = {}`, `Tunnel.bindInterface`)
5. Event handlers and `RegisterNetEvent` / NUI callbacks

```lua
local Tunnel = module("vrp", "lib/Tunnel")
local Proxy  = module("vrp", "lib/Proxy")

vRP  = Proxy.getInterface("vRP")
vRPC = Tunnel.getInterface("vRP")

local PANEL_COOLDOWN_MS = 5000
local activeActions     = {}
local panelOpen         = false

local function trim(s)
    return tostring(s or ""):gsub("^%s*(.-)%s*$", "%1")
end

local function canOpenPanel(source)
    ...
end

RegisterNetEvent("myresource:openPanel", function()
    if not canOpenPanel(source) then return end
    ...
end)
```

**Wrong:** declaring `local lastOpen = 0` halfway down the file between two `RegisterNetEvent` blocks.

### 3.9 Agent Checklist (Before Finishing Code)

Before delivering Lua for a FiveM resource, verify:

- [ ] Could this stay in one `server.lua` and one `client.lua`?
- [ ] Is every extra file justified by size **and** a clear domain boundary?
- [ ] Were comments removed that only repeat what the code says?
- [ ] Are state tables and constants grouped at the top?
- [ ] Were helpers reused instead of duplicated or split into unnecessary globals?

### 3.10 Anti-Pattern Snapshot

Typical **AI over-engineering** mistakes — **do not generate code like this:**

- **Many server files** for one resource (`discord.lua`, `cache.lua`, `panel_a.lua`, `panel_b.lua`, plus a huge `server.lua`)
- **Many client files** for one resource (`client.lua`, `hud.lua`, `spectate.lua`, …)
- **Globals everywhere** instead of locals — flag only when symbol is not read by another file in same scope (§3.6)
- **Comment noise** — banner blocks and `---` on every helper
- **State mixed with handlers** — variables and helpers declared mid-file
- **Rebuild client payload on every send** — `TriggerClientEvent(..., buildItem(id, rawCache))` instead of a pre-built view cache

When in doubt: **one server file, one client file, locals at top, fewer comments, reuse functions.**

---

## 4. Cerberus (modular resource)

[`cerberus`](https://github.com/proelias7/cerberus) is a modular FiveM resource. The public README highlights **Load Balance**; the full module also includes **SafeEvent** (server anti-exploit) and **SetCooldown** (client rate-limit) when enabled in `config/config.lua`:

```lua
config.modules = {
    banned = false,
    safeEvent = true,
    analytics = true,
}
```

### 4.1 Network sync (Load Balance)

[`cerberus`](https://github.com/proelias7/cerberus) centralizes large server→client payload delivery. Consumer scripts prepare the payload and call an export; cerberus handles transport, chunking, queue, priority, and client-side reassembly.

**Flow:**

```text
resource server -> cerberus server -> network -> cerberus client -> local TriggerEvent -> resource client
```

The final `TriggerEvent` on the client is local and does not add extra network traffic.

### 4.2 When to use cerberus vs `TriggerClientEvent`

| Situation | Target | Method |
|-----------|--------|--------|
| Reply to one player (UI, bootstrap, admin panel) | `source` | `TriggerClientEvent` with pre-built cache |
| Small world delta to **all** (id, coords, delete) | `-1` | `TriggerClientEvent` if payload < ~8 KB |
| Small world delta with flood protection | `-1` | `SendDeltaSync(-1, event, payload)` |
| Full/large cache to **one** player | `source` | `SendFullSync(source, ...)` |
| Full/large cache to **many** or **scoped area** | `-1` or table | `SendFullSync` / `SendDeltaSync` + `coords`, `range`, `scopeRadius` |
| Manual `ChunkTable` + `Wait` to players | — | **Replace** with cerberus |

> **Rule:** `-1` = global **gameplay** sync with **small** payload. Admin/manager events → **`source` only** (§1.6.1).
>
> **Rule:** Do not implement manual chunking in consumer scripts. Use cerberus exports instead.
>
> **Rule:** Prefer `SendDeltaSync` for unit updates. Reserve `SendFullSync` for bootstrap or full cache rebuild.

### 4.3 Exports

| Export | Alias | Purpose |
|--------|-------|---------|
| `SendFullSync(targets, eventName, payload, options)` | `SyncFull` | Full/bootstrap sync; replaces pending job for same `key` |
| `SendDeltaSync(targets, eventName, payload, options)` | `SyncDelta` | Unit update; does not replace pending jobs by default |
| `SendBalancedPayload(targets, eventName, payload, options)` | `QueueBalancedPayload` | Generic/manual control |

**`targets`:** `source`, `-1`, or table of sources.

**`options`:** `key`, `coords`, `range`, `scopeRadius`, `replacePending`, `syncKind`.

- `range`: players near `coords` receive first; others receive later
- `scopeRadius`: with `coords` and `-1`, only players inside radius receive the event

### 4.4 Examples

**Full sync (player bootstrap):**
```lua
exports["cerberus"]:SendFullSync(
    source,
    "chest:fullSync",
    chestCacheSanitized,
    {
        key = "inventory:chests:full",
        coords = GetEntityCoords(GetPlayerPed(source)),
        range = 150.0
    }
)
```

**Delta update:**
```lua
exports["cerberus"]:SendDeltaSync(-1, "chest:updateChest", chestData)
```

**Delta delete:**
```lua
exports["cerberus"]:SendDeltaSync(-1, "chest:deleteChest", { name = chestName })
```

**Client consumer:**
```lua
RegisterNetEvent("chest:updateChest")
AddEventHandler("chest:updateChest", function(chestData)
    allChests[chestData.name] = chestData
    UpdateTargetZones(chestData.name)
end)
```

### 4.5 Load balance — what to avoid

- Manual chunking in inventory/routes/NUI resources
- Full sync for every small change
- Putting queue/priority logic in the consumer client

### 4.6 SafeEvent (server — anti-exploit)

Requires `config.modules.safeEvent = true`. Protects actions that give advantage (money, items, XP). Returns `true` = blocked, `false` = allowed.

```lua
exports["cerberus"]:SafeEvent(source, eventName, options)
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `time` | number | `config.defaultTime` (30) | Minimum interval in seconds |
| `noBan` | boolean | false | If true, does not auto-ban |
| `position` | boolean | false | Check distance between actions |
| `positionDist` | number | 100 | Min distance in meters when `position=true` |
| `notification` | boolean | false | Notify player when blocked |
| `blockThreshold` | number | `config.blockThreshold` | Suspicions per event before blocking |
| `logThreshold` | number | `config.logThreshold` | Suspicions before console logs |
| `silentLog` | boolean | false | Log internally without console |
| `interPorDetect` | number | `config.interPorDetect` | Window to count suspicions |
| `suspectCount` | number | `config.suspectCount` | Total suspicions for auto-ban |
| `data` | any | nil | Extra data for logs |

**Example:**
```lua
RegisterServerEvent("shop:buy")
AddEventHandler("shop:buy", function(itemId)
    local source = source
    if not source then return end

    if exports["cerberus"]:SafeEvent(source, "shop:buy", {
        time = 10,
        position = true,
        positionDist = 2
    }) then
        return
    end

    -- server validation + grant reward
end)
```

**Flood / DB-sensitive events:**
```lua
if exports["cerberus"]:SafeEvent(source, "requestInventory", {
    time = 2,
    noBan = true,
    notification = true,
    blockThreshold = 3
}) then
    return
end
```

### 4.7 SetCooldown (client — rate-limit)

Runs on **client**. Time in **milliseconds**. Returns `true` = blocked.

```lua
exports["cerberus"]:SetCooldown(name, time, hits)
```

```lua
-- Time-based
if exports["cerberus"]:SetCooldown("open:inventory", 3000) then
    return
end

-- Hit-based: 3 attempts then block for 5s
if exports["cerberus"]:SetCooldown("use:item", 5000, 3) then
    return
end
```

```lua
RegisterNUICallback("buy", function(data, cb)
    if exports["cerberus"]:SetCooldown("shop:buy", 2000) then
        cb("blocked")
        return
    end
    TriggerServerEvent("shop:buy", data.item)
    cb("ok")
end)
```

SetCooldown shows an automatic "Aguarde X segundos..." notification when blocked.

### 4.8 SafeEvent vs SetCooldown

| Feature | SafeEvent | SetCooldown |
|---------|-----------|-------------|
| Side | Server | Client |
| Purpose | Anti-exploit | Rate-limit spam |
| On detect | Block and/or ban | Block temporarily |
| Time unit | Seconds | Milliseconds |

| Situation | Use |
|-----------|-----|
| Money/item/advantage server event | `SafeEvent` |
| Open menu / use item / NUI spam | `SetCooldown` |
| Large cache sync to clients | `SendFullSync` / `SendDeltaSync` |

> **Rule:** Every server event that grants money, items, XP, vehicles, or bypasses restrictions must use `SafeEvent` **and** server-side validation.
>
> **Rule (`source = -1`):** Protect flood-prone server events with `SafeEvent` and `noBan = true` when appropriate.
>
> **Rule (DB from client):** Client-triggered DB-heavy events should use `SafeEvent` with `noBan = true` plus throttling/cache.

---

## 5. Server Security (General)

Cerberus `SafeEvent` complements — but does not replace — server-side validation:

- Re-validate money, items, permissions, and distance on the server
- Never trust NUI/client payload without server checks
- Rate-limit repetitive client actions locally (cooldown flag, debounce, or framework pattern)
- Guard events that can run with `source = -1` against floods
- Avoid heavy DB work directly from high-frequency client callbacks without throttling

> **Rule:** Every server event that grants money, items, XP, vehicles, or bypasses restrictions must validate on the server before applying the reward.

### 5.1 Admin / Manager Events — Server Auth (Audit)

Client-only UI gating is **not** security. Every admin/manager server event must validate on the server.

**Real permission** = `hasGroup`, `hasPermission`, `hasService`, job check, or project-specific staff API with **identity** (`getUserId` / Passport).

**Not permission:**

```lua
-- WRONG: cooldown/rate-limit presented as "manager check"
local function CanUseGarageManager(source)
    if os.time() - (lastAction[source] or 0) < 3 then return false end
    return true  -- anyone can pass after 3s
end
```

**Audit:** grep all `RegisterNetEvent("manager:*")` (and `admin:*`, panel prefixes). For each handler verify:

1. `local source = source` + `getUserId` early
2. **Staff permission** before read leak or CRUD
3. `cerberus` `SafeEvent` on mutating events (create/update/delete)
4. Same permission helper on **read** events that expose sensitive data (`get*`, `list*`, `teleport*`)

| Event type | Missing SafeEvent | Missing real permission | Typical severity |
|------------|-------------------|-------------------------|------------------|
| delete / create / update DB | Flag | Flag | **Critical** |
| get list with perms/coords | — | Flag | **Critical** |
| teleport / spawn admin | — | Flag | **Critical** |
| read-only public data | — | Maybe OK | Context-dependent |

**Fix pattern:**

```lua
local function CanManageResource(source)
    local user_id = vRP.getUserId(source)
    if not user_id then return false end
    return vRP.hasGroup(user_id, "Admin", 1) -- project rule
end

RegisterNetEvent("manager:getGarages")
AddEventHandler("manager:getGarages", function()
    local source = source
    if not CanManageResource(source) then return end
    TriggerClientEvent("manager:receiveGarages", source, getManagerGarageListCached())
end)
```

Report missing auth as **one systemic finding** listing all unprotected events, not isolated low-severity rows.
