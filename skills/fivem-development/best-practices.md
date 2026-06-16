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
| `Set(namespace, key, value, ttl)` | Saves value to cache |
| `Delete(namespace, key)` | Removes specific item |
| `FlushNamespace(namespace)` | Clears entire namespace |

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

**Avoid** global tables (`MyResourceCache = {}`, `MyResourceLog = {}`) for small helpers. Use locals unless Tunnel or another script file must call the API.

```lua
-- WRONG: global module for a tiny helper
IdentityCache = {}
function IdentityCache.getName(id) ... end

-- CORRECT: local helper in server.lua
local identityNameCache = {}

local function getIdentityName(passport)
    ...
end
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
- **Globals everywhere** instead of locals (`MyResourceCache`, cross-file helper tables)
- **Comment noise** — banner blocks and `---` on every helper
- **State mixed with handlers** — variables and helpers declared mid-file

When in doubt: **one server file, one client file, locals at top, fewer comments, reuse functions.**

---

## 4. Security (Cerberus v2.0)

Cerberus offers 3 protection layers: **SafeEvent** (server-side), **SetCooldown** (client-side), and **Analytics** (monitoring).

### 4.1 SafeEvent (Server-side — Anti-Exploit)

Protects actions that give advantage to the player (money, items, XP). Detects and bans exploiters automatically.

**Signature:**
```lua
exports["cerberus"]:SafeEvent(source, eventName, options)
```

| Parameter | Type | Description |
|-----------|------|-----------|
| `source` | number | Player ID |
| `eventName` | string | Unique name of protected action |
| `options` | table\|nil | Options table (all optional) |

**Available Options:**

| Field | Type | Default | Description |
|-------|------|---------|-----------|
| `data` | any | nil | Extra data for log |
| `time` | number | config (30) | Minimum interval in seconds |
| `noBan` | boolean | false | If `true`, does not ban automatically |
| `position` | boolean | false | Checks distance between actions |
| `positionDist` | number | 100 | Minimum distance between actions (meters) |
| `notification` | boolean | false | Notifies player when blocked |
| `blockThreshold` | number | config (1) | Suspicions per event before blocking |
| `logThreshold` | number | config (1) | Suspicions before showing logs in console |
| `silentLog` | boolean | false | Logs internally without showing in console |
| `interPorDetect` | number | config (15) | Time window to count suspicions |
| `suspectCount` | number | config (4) | Total suspicions for automatic ban |

**Return:** `true` = action blocked, `false` = allowed.

**Basic Example:**
```lua
RegisterServerEvent("register:paymentMethod")
AddEventHandler("register:paymentMethod", function(locate)
    local source = source
    if not source then return end

    if exports["cerberus"]:SafeEvent(source, "register:paymentMethod", {
        data = "Robbery: " .. tostring(locate),
        time = 10,
        position = true,
        positionDist = 2
    }) then
        return
    end

    local randPrice = math.random(15000, 16000)
    GivePlayerMoney(source, randPrice)  -- use your framework's money function
end)
```

**Example with Fine Control (no ban, with notification):**
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

**Silent Mode Example (tracks but doesn't log until threshold):**
```lua
if exports["cerberus"]:SafeEvent(source, "shop:buyItem", {
    time = 5,
    silentLog = true,
    logThreshold = 5,
    blockThreshold = 2
}) then
    return
end
```

**Detection Flow:**
1. First call → Registers timestamp and position
2. Next call → Compares interval with `time`
3. Interval less than `time` → Increments suspicion counter **per event**
4. `position=true` + haven't moved `positionDist` → Immediate ban (if `noBan=false`)
5. Event suspicions >= `blockThreshold` → Blocks action (returns `true`)
6. Total suspicions >= `suspectCount` within `interPorDetect` → Automatic ban
7. If `time` passed since last call → Reset counters
8. Cleanup thread removes events inactive for more than 60s

### 4.2 SetCooldown (Client-side — Rate-Limit)

Limits spam of normal actions on client. **IMPORTANT: runs on CLIENT, not on server.**

**Signature:**
```lua
exports["cerberus"]:SetCooldown(name, time, hits)
```

| Parameter | Type | Description |
|-----------|------|-----------|
| `name` | string | Unique name of cooldown |
| `time` | number | Duration in **milliseconds** |
| `hits` | number\|nil | Attempts before blocking (hit-based mode) |

**Return:** `true` = blocked, `false` = allowed.

**Two modes of operation:**

```lua
-- MODE 1: Time-based (blocks by time)
if exports["cerberus"]:SetCooldown("open:inventory", 3000) then
    return
end

-- MODE 2: Hit-based (blocks after N attempts in period)
if exports["cerberus"]:SetCooldown("use:item", 5000, 3) then
    return
end
```

**Complete client example:**
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

**Automatic Notification:** SetCooldown automatically displays a "Wait X seconds..." message to the player when blocked.

### 4.3 SafeEvent vs SetCooldown

| Feature | SafeEvent | SetCooldown |
|----------------|-----------|-------------|
| **Side** | Server-side | Client-side |
| **Purpose** | Anti-exploit (detects cheaters) | Rate-limit (limits spam) |
| **Action on detect** | Blocks and/or bans | Blocks temporarily |
| **Time** | Seconds | Milliseconds |
| **Logs** | Logs internally | Does not log |

**When to use which:**

| Situation | Use | Example |
|----------|------|---------|
| Rob register/NPC | `SafeEvent` | `time=10, position=true` |
| Receive job payment | `SafeEvent` | `time=30` |
| Collect money drop | `SafeEvent` | `time=5, position=true` |
| Open inventory/menu | `SetCooldown` | `time=2000` |
| Use item (food, kit) | `SetCooldown` | `time=3000` |
| Spawn vehicle | `SetCooldown` | `time=5000` |
| Repetitive NUI interaction | `SetCooldown` | `time=1000, hits=3` |
| Chat/commands | Native protection | — |

> **Rule:** Every server-side event that gives money/item/advantage MUST use `SafeEvent`. Repetitive client-side actions use `SetCooldown`.
>
> **Rule (source = -1):** Any server event that can be triggered with `source = -1` MUST be protected by `SafeEvent` with `noBan = true` to avoid server crashes if a cheat floods it.
>
> **Rule (DB access from client):** Any direct database interaction triggered by a client event or callback MUST be protected by `SafeEvent` with `noBan = true` to prevent flood/crash scenarios.
