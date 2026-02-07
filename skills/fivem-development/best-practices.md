# Best Practices — vRP Creative Network

**Author:** Elias Araújo
**Focus:** Performance, Optimization, and Security

---

## 1. Client/Server Communication

### 1.1 Tunnel vs Events — Golden Rule

> **Tunnel** = when you NEED a return
> **Event** = when you DO NOT need a return

**Performance Hierarchy (from lightest to heaviest):**

| Method | Performance | When to use |
|--------|-------------|-------------|
| `TriggerServerEvent` | Lightest | Action without return (preferred) |
| `vSERVER._function()` | Medium | Fire-and-forget via Tunnel (function already exists) |
| `vSERVER.function()` | Heaviest | When return is needed |

```lua
-- CORRECT: return needed → Tunnel
local inventory = vSERVER.getUserInventory()

-- CORRECT: NO return needed → Event
TriggerServerEvent("airdrop:start")

-- AVOID: Tunnel without using return (generates unnecessary overhead)
vSERVER.startEvent()
```

**Why is Tunnel heavier?** Each call generates:
- Argument serialization
- Promise creation (future)
- Callback allocation
- Timeout control (30s)

**Problems with Tunnel without return:**
1. **Deadlocks** — vRP waits for a response that never comes
2. **Overhead** — high cost for simple action
3. **Saturation** — accumulated callbacks degrade the main thread

### 1.2 `_` Prefix (Fire-and-Forget)

```lua
-- WITH underscore: do not prepare callback
vSERVER._startEvent()

-- WITHOUT underscore: prepares callback and waits for return
vSERVER.startEvent()
```

Even with `_`, the Tunnel still performs serialization and RPC processing. **Native event is always lighter.**

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
MyTunnel.tryDelete = tryDelete                       -- tunnel
```

| Method | Environment | Performance |
|--------|----------|-------------|
| `function()` | Same | Instant |
| `TriggerEvent()` | Same | Goes through queue |
| `TriggerServerEvent()` | Client→Server | Network + queue |
| `Tunnel` | Client↔Server | Network + RPC |

### 1.4 Avoid Remote Calls in Loops

```lua
-- WRONG: Tunnel in high frequency loop
while true do
    vSERVER.updatePosition()
    Wait(100)
end

-- CORRECT: larger interval
while true do
    TriggerServerEvent("player:position", GetEntityCoords(ped))
    Wait(5000)
end

-- BETTER: send only when necessary
local lastPosition = nil
while true do
    local pos = GetEntityCoords(ped)
    if lastPosition == nil or #(pos - lastPosition) > 10.0 then
        TriggerServerEvent("player:position", pos)
        lastPosition = pos
    end
    Wait(100)
end

-- ALTERNATIVE: data batch
local positions = {}
while true do
    table.insert(positions, GetEntityCoords(ped))
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
        if IsPedArmed(ped, 6) then
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

### 1.7 Signs of Tunnel Problems

If you see errors like `index (rp/lib/Tunnel.lua:334)`:
- **Cause:** Tunnel being used without return or in loop
- **Symptoms:** Internal loops, stuck callbacks
- **Solution:** Change to events

---

## 2. Data Cache

### 2.1 cacheaside — In-Memory Cache with TTL

Database queries are expensive operations. Use cache for repeatedly queried data.

```lua
-- WRONG: query every time
exports("checkRelation", function(Passport)
    local Consult = vRP.Query("findRelationship", { Passport = Passport })
end)

-- CORRECT: using cacheaside
exports("checkRelation", function(Passport)
    local Consult = exports.cacheaside:Get("relationship:findRelationship", Passport, {
        query = { "SELECT * FROM relationship WHERE Passport = ?", { Passport } },
        default = {}
    })
    if Consult[1] and Consult[1]["status"] == 3 then
        return true, Consult[1]["OtherPassport"]
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
-- Delete (next query fetches from DB)
exports.cacheaside:Delete("relationship:findRelationship", Passport)

-- Update directly (avoids new query)
exports.cacheaside:Set("relationship:findRelationship", Passport, newValue, 300)
```

---

## 3. Code Structure

### 3.1 `or` Chains → Permission Table

```lua
-- WRONG: or chain
if vRP.HasPermission(Passport, "Cor")
or vRP.HasPermission(Passport, "Police32")
or vRP.HasPermission(Passport, "Diamante")
-- ... 15 more lines ...
then end

-- CORRECT: table + function
local weaponColorPerms = {
    "Cor", "Police32", "Police16", "Soul", "Diamante",
    "Boost", "Admin", "Rubi", "DoadorFacT201"
}

local function hasPermission(Passport, list)
    for _, perm in ipairs(list) do
        if vRP.HasPermission(Passport, perm) then
            return true
        end
    end
    return false
end

if hasPermission(Passport, weaponColorPerms) then
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
-- WRONG: crash if Identity is nil
"Name: " .. Identity.name .. " " .. Identity.name2

-- CORRECT: check and protect
local Identity = vRP.Identity(Passport)
if not Identity then
    TriggerClientEvent('Notify', source, 'negado', 'Identity not found')
    return
end

-- Or use fallback
local name = (Identity.name or "") .. " " .. (Identity.name2 or "")
```

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
function cRP.paymentMethod(locate)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end

    -- Blocks if called more than 1x every 10s
    if exports["cerberus"]:SafeEvent(source, "register:paymentMethod", {
        data = "Robbery: " .. tostring(locate),
        time = 10,
        position = true,
        positionDist = 2
    }) then
        return
    end

    local randPrice = math.random(15000, 16000)
    vRP._GenerateItem(Passport, "dollars2", randPrice, true)
end
```

**Example with Fine Control (no ban, with notification):**
```lua
-- For sensitive actions but that should not ban automatically
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
-- Monitors silently, only logs when reaching 5 suspicions
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
-- Blocks for 3 seconds after first call
if exports["cerberus"]:SetCooldown("open:inventory", 3000) then
    return
end

-- MODE 2: Hit-based (blocks after N attempts in period)
-- Allows 3 attempts, then blocks for 5 seconds
if exports["cerberus"]:SetCooldown("use:item", 5000, 3) then
    return
end
```

**Complete client example:**
```lua
-- client/main.lua
RegisterNUICallback("buy", function(data, cb)
    -- Rate limit: max 1 purchase every 2 seconds
    if exports["cerberus"]:SetCooldown("shop:buy", 2000) then
        cb("blocked")
        return
    end

    SRC.Buy(data.item)
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
| **Passport** | Obtained internally | Not necessary |
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
> **Rule (DB access from client):** Any direct database interaction triggered by a client event or Tunnel call MUST be protected by `SafeEvent` with `noBan = true` to prevent flood/crash scenarios.
