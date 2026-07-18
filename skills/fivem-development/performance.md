# FiveM Best Practices — Performance & Cache

**Author:** Elias Araújo  
**Part of:** [best-practices.md](best-practices.md) index (one skill: `fivem-development`)  
**Section numbers** (`§1.6.1`, `§2.4`, …) are stable — keep them when linking from audits/corrections.

---

## Network & tick cost (§1.4–§1.6.1)

> Protocol choice (Tunnel vs event, `_` prefix, same-side calls) stays in [communication.md](communication.md) §1.1–§1.3 / §1.7.  
> Below: **when** and **how heavy** those calls are — loops, sleep, payload size, broadcast targets.

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

### 1.6.2 StateBags — replication cost (`GlobalState` / entity / player)

State bags are **replicated network state**. Every write that replicates is roughly like a small broadcast — worse when the value is large or changes every frame/tick.

| Bag | Replicates to | Cost if churned |
|-----|---------------|-----------------|
| `GlobalState.key = value` | **All clients** | Highest — treat like `TriggerClientEvent(-1, …)` |
| `Entity(ent).state:set(k, v, true)` / replicated player state | Clients that care about that entity/player (still network) | High if many entities or high frequency |
| Local / non-replicated (`replicate = false`) | Nobody else | Safe for hot local loops |

**Rules:**

1. **Never** write `GlobalState` or replicated bags inside `Wait(0)` / per-frame loops, position ticks, or spam-able net events.
2. **Debounce / threshold** — only set when the value **actually changed** (and preferably when change > epsilon for numbers/coords).
3. **Keep values tiny** — ids, flags, enums. Do **not** stuff full inventories, shop tables, or JSON blobs into StateBags; use events/cerberus/view cache instead.
4. **Server-authoritative writes** for shared world flags. Client-driven replicated bags are an exploit + flood surface (pair with Pass 2b / SafeEvent).
5. Prefer **one bag update per logical state change** (door open/closed), not continuous telemetry (use a throttled event or local-only state for that).

```lua
-- WRONG: GlobalState every tick → all clients get a bag update continuously
CreateThread(function()
    while true do
        GlobalState.serverTime = os.time()
        Wait(0)
    end
end)

-- WRONG: replicated bag from a client-spamable event
RegisterNetEvent("hud:setBusy")
AddEventHandler("hud:setBusy", function(busy)
    GlobalState["busy:" .. source] = busy  -- cheat loop = global replication storm
end)

-- CORRECT: write only on change; rare global flags
local lastWeather = nil
function setWeather(name)
    if lastWeather == name then return end
    lastWeather = name
    GlobalState.weather = name  -- infrequent, small value
end

-- CORRECT: high-frequency data stays local or uses throttled events — not GlobalState
LocalPlayer.state:set("nearestDoor", doorId, false)  -- replicate=false
```

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `GlobalState` / replicated `:set(..., true)` in a tight loop | Network saturation, hitch for every player | Local state, throttle, or event delta |
| Large table in a state bag | Fat replication payload | Tiny keys; sync bulk via cerberus/events |
| Client event → write `GlobalState` without rate-limit | Cheat amplification (same class as E-b) | Server auth + SafeEvent; avoid GlobalState for per-player noise |
| Using bags as a full data bus | Hidden `-1`-class traffic | Bags = small flags; caches/events for data |

**Audit grep hints:** `GlobalState`, `.state:set`, `LocalPlayer.state`, `Player(..).state`, `Entity(..).state`.

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

**Findings vs matrix:** V-b/V-d detail and the view-cache matrix drive **discovery** — each distinct issue still gets its **own row** in the Findings table (e.g. two V-b rows, two V-d rows). **Summary counts come from Findings rows only**, not from matrix row count (see Pass 7 **Summary count rule**).

**V-h rule:** flag `apply*Entry` + `build*Item` (or similar) when both decode/normalize the same cache fields without a shared view cache.

**V-j rules (§1.6.1):**

- `TriggerClientEvent("manager:*", -1, ...)` → **Critical** (admin data leak)
- `TriggerClientEvent(-1, ...)` with payload likely > 8 KB or full cache table → **High** — use cerberus
- `TriggerClientEvent(-1, smallWorldDelta)` for gameplay sync → **OK** — do not flag

Missing rows that apply to the resource = **incomplete audit**.

#### Pass 2b — Client→server event flow (amplification / DoS)

View-cache (V-a–V-j) asks *how* you build/sync. This pass asks: **what happens if a cheat fires the net event in a tight loop?**

For **every** `RegisterNetEvent` / `AddEventHandler` on **server** that a client can invoke (`TriggerServerEvent` / Tunnel / NUI → server):

```text
client TriggerServerEvent(name)
        → server handler
              ├─ MySQL / oxmysql / heavy query?     → cost × N spam
              ├─ TriggerClientEvent(..., -1, ...)? → cost × players × N spam
              ├─ Load*Cache / full rebuild?         → cost × N spam
              └─ SafeEvent / cooldown / auth?       → brake or open flood
```

| # | Check | Why it matters | If found → severity |
|---|-------|----------------|---------------------|
| E-a | Handler does **direct DB** (`MySQL.*`, `oxmysql`, `query.await`, `execute`) on every invoke | Cheat spam = DB saturation / server hitch | **High**; **Critical** if no throttle + mutating |
| E-b | Handler ends in **`TriggerClientEvent(..., -1, ...)`** or cerberus sync to all from **client-triggered** path | 1 packet in → N packets out (amplification); loop can lag/crash server | **Critical** if no auth/SafeEvent/cooldown; **High** if only weak throttle |
| E-c | Handler does **full cache reload** (`Load*Cache`, `SELECT *`, rebuild all views) on client request | Same as E-a at memory/CPU scale | **High** |
| E-d | Mutating / expensive handler **missing** `SafeEvent` (or equivalent rate-limit) | No server-side brake against flood | **High** (see [security.md](security.md) §4.6) |
| E-e | **StateBag churn** — `GlobalState` / replicated `.state:set` in loops, per-tick, or spam-able client events (§1.6.2) | Silent broadcast storm; same blast radius as `-1` | **Critical** if `GlobalState` + client-triggered; **High** if tight loop |

**Rules:**

1. **Assume the client is hostile.** Any `RegisterNetEvent` is callable by a cheat — UI buttons are not a gate.
2. **Never** put “query DB → broadcast `-1`” on an unauthenticated, unlimited client event. Prefer: validate → mutate memory/cache → delta to `source` or controlled world sync from **trusted server CRUD** (admin with auth, or internal timer) — not from a public spam-able event.
3. **Read-only** client events that need data: serve from **view cache** / `cacheaside`, not live SQL; still rate-limit.
4. **World `-1` deltas** after a real state change are fine when the trigger is server-authoritative (e.g. admin CRUD after §5.1 auth). Flag when the **entry point** is a naked client event.
5. **`GlobalState` / replicated bags** are network-expensive — apply the same hostility model as E-b (§1.6.2).
6. Cross-check with §1.6.1–§1.6.2 (who receives / bag replication) and §4.6 / §5.1 (SafeEvent + permission).

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

**Audit output:** for each E-a…E-d hit, one Findings row with event name, `file:line`, and the amplification path (`DB`, `-1`, `Load*Cache`). Do not leave E-* only in a matrix.

### Learned rule: V-j matrix hit requires standalone Findings row (robberys, 2026-06-20)

- When V-j is marked **Found** in the View Cache Matrix (even conditional/disabled), add a dedicated row in the appropriate Findings table with its own ID, Severity, `file:line`, and Recommendation.
- Do not leave V-j documented only in the matrix and correction plan — without a Findings row it does not count in the Summary and causes a summary-count mismatch.

**Why:** §2.4 states "each distinct issue still gets its own row in the Findings table." §2.5 Summary count rule sums Findings table rows only — matrix rows do not count. A conditional or disabled V-j still needs a formal row so the Summary is accurate.

Example:
```lua
-- WRONG: V-j marked Found in matrix, mentioned in plan, but no Findings row
-- View Cache Matrix: | V-j | Found (conditional) | server.lua:118 | Medium |
-- Summary: Medium = 5  ← wrong (only 4 rows in Findings tables)

-- CORRECT: add to Performance findings table
-- | Vj1 | Medium | server.lua:118 | robberys:noShootActivate | TriggerClientEvent(-1, polygon ~100pts) when noShootEnabled=true | Use cerberus scopeRadius or send only to nearby players |
-- Summary: Medium = 5  ← now matches 5 Findings rows
```

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

### 2.5 Report quality gates (Pass 6–7)

Pass 6 = pre-save checklist. Pass 7 = gates that commonly invalidate otherwise good audits (including **Summary count rule**).

#### Pass 6 — Pre-report self-check

Before saving the report, confirm:

- [ ] All `fxmanifest` Lua files listed in **Files reviewed**
- [ ] View cache matrix: every applicable row checked (V-a–V-j)
- [ ] **Event flow (Pass 2b):** every client-callable server event checked for E-a…E-e (DB / `-1` amp / full reload / SafeEvent / StateBag churn)
- [ ] Broadcast targets: `manager:*` / admin events use `source`, not `-1` (§1.6.1)
- [ ] StateBags: no `GlobalState` / replicated writes in hot loops; bags stay small (§1.6.2)
- [ ] Large `-1` or full-cache sync uses cerberus, not manual chunks
- [ ] Every `build*` caller grep'd with `file:line`
- [ ] Globals table complete for server + client scope
- [ ] Manager events matrix complete (or N/A stated)
- [ ] No finding references wrong handler/symbol
- [ ] Phase plan severity matches findings tables
- [ ] Each High/Critical finding has a **before/after code snippet**
- [ ] **Summary counts** match Findings row totals per severity (Pass 7 **Summary count rule**)

#### Pass 7 — Report quality gates (common agent mistakes)

Fix these before saving — they caused **valid audits to lose trust**:

| Gate | Rule |
|------|------|
| **Files reviewed** | Only paths from `fxmanifest` (`server_scripts`, `client_scripts`, `shared_scripts`) + NUI if audited. **Never** list files not in manifest (e.g. `config/config.lua` when absent). |
| **Summary counts** | Tally **every row** in Findings tables — see **Summary count rule** below. Matrix rows (V-a–V-j) do **not** map 1:1 to Summary. |
| **V-b completeness** | Grep `build*List\(` and `Get*Summary*` — **all** call sites in detail, not only the first. |
| **V-d accuracy** | Name **each** sync call in the CRUD handler; count paths, do not round to "triple". |
| **Cooldown count** | Grep `CanUse*Manager` (or similar) — exact count in prose. |
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

### Learned rule: vRP.Players loop + TriggerClientEvent per player must use cerberus (robberys, 2026-06-20)

- Replace `for _, src in pairs(vRP.Players()) do TriggerClientEvent(..., src, payload) Wait(N) end` with `exports["cerberus"]:SendFullSync(-1, event, payload, options)` (full rebuild) or `SendDeltaSync(-1, event, payload)` (unit update).
- Do not recommend "single event -1" or "state bag handler" as generic alternatives when cerberus is in the project — always specify the cerberus export directly in the fix.

**Why:** A manual loop over all players with `TriggerClientEvent` + `Wait` blocks the server thread and creates O(n) network events per operation. Cerberus handles load balancing, chunking, and priority internally. Recommending vague alternatives delays implementation and misses the optimization.

Example:
```lua
-- WRONG: loop + TriggerClientEvent per player + Wait (blocks server thread, O(n) events)
for Passport, v in pairs(vRP.Players()) do
    TriggerClientEvent("robberys:updateBlips", v, payload)
    Wait(30)
end

-- CORRECT: cerberus SendFullSync for full rebuild (initial load, state change)
exports["cerberus"]:SendFullSync(-1, "robberys:updateBlips", payload, {
    key = "robberys:blips:full"
})

-- CORRECT: cerberus SendDeltaSync for incremental update (one robbery started/ended)
exports["cerberus"]:SendDeltaSync(-1, "robberys:updateBlips", deltaPayload)
```

### 4.5 Load balance — what to avoid

- Manual chunking in inventory/routes/NUI resources
- Full sync for every small change
- Putting queue/priority logic in the consumer client
