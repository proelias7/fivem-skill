# FiveM Best Practices — Style & Clean Lua

**Author:** Elias Araújo  
**Part of:** [best-practices.md](best-practices.md) index (one skill: `fivem-development`)  
**Section numbers** (`§1.6.1`, `§2.4`, …) are stable — keep them when linking from audits/corrections.

---

## 3. Code Structure — Style

Tables over if-chains, nil safety, comments, checklist, anti-patterns. Layout/globals → [architecture.md](architecture.md).

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

### 3.9 Agent Checklist (Before Finishing Code)

Before delivering Lua for a FiveM resource, verify:

- [ ] Could this stay in one `server.lua` and one `client.lua`?
- [ ] Is every extra file justified by size **and** a clear domain boundary?
- [ ] Were comments removed that only repeat what the code says?
- [ ] Are state tables and constants grouped at the top?
- [ ] Is every `local function` used at **2+ call sites**? Single-use logic stays inline (§3.11)
- [ ] Are helpers ordered callee → caller (generic before specific) before handlers/threads? (§3.11)
- [ ] Did a bugfix stay a **minimal diff** — no file rewrite, no overwrite of user-approved patterns? (§3.11)

### 3.10 Anti-Pattern Snapshot

Typical **AI over-engineering** mistakes — **do not generate code like this:**

- **Many server files** for one resource (`discord.lua`, `cache.lua`, `panel_a.lua`, `panel_b.lua`, plus a huge `server.lua`)
- **Many client files** for one resource (`client.lua`, `hud.lua`, `spectate.lua`, …)
- **Globals everywhere** instead of locals — flag only when symbol is not read by another file in same scope (§3.6)
- **Comment noise** — banner blocks and `---` on every helper
- **Single-use helpers** — `processX` / `isY` / `buildZ` extracted then called once; inline in the loop/handler (§3.11)
- **File rewrite on bugfix** — reordering/refactoring the whole file and overwriting user-approved patterns (async build, simpler logic)
- **Caller before callee** — `local function` used before it is declared
- **State mixed with handlers** — variables and helpers declared mid-file
- **Rebuild client payload on every send** — `TriggerClientEvent(..., buildItem(id, rawCache))` instead of a pre-built view cache
- **Client sends derived data** (names, prices, permissions) — server should resolve from minimal IDs (§5.2)
- **Multiple network calls for one operation** — use single tunnel call with return instead of event + callback (§1.1)
- **Event + callback pattern** — `TriggerServerEvent` + `RegisterNetEvent("receiveX")` = unnecessary when tunnel returns data directly

When in doubt: **one server file, one client file, locals at top, fewer comments, extract a helper only when it is reused.**

### 3.11 Local functions — extract only on reuse

**Extract a `local function` only when it has 2+ call sites.** One call site → keep the body inline in the `CreateThread` / event handler / loop. Do not invent `processX`, `cleanupY`, `isZ`, `buildW` for a single use.

**Order:** declare helpers **callee before caller** (generic → specific) so a `local function` exists before anything that calls it. Then `AddEventHandler` / `RegisterNetEvent` / `CreateThread`.

**Bugfixes are surgical.** Do not reorder or rewrite the user's file to "clean it up". Preserve patterns already approved (e.g. async `build*`, simpler inline logic). Match surrounding style.

```lua
-- WRONG: five single-use helpers + caller before callee
local function processPropsNear()
    cleanupHitMemory()
    for _, ent in ipairs(GetGamePool("CObject")) do
        if isFallenProp(ent) then scheduleRemoval(ent) end
    end
end

local function isFallenProp(ent)
    return GetEntityHeightAboveGround(ent) < 0.2
end

CreateThread(function()
    while true do
        Wait(1000)
        processPropsNear()
    end
end)

-- CORRECT: unique logic inline; only extract what is called twice+
local function removeProp(ent)
    -- used from the tick and from an event → extract
    SetEntityAsMissionEntity(ent, true, true)
    DeleteEntity(ent)
end

CreateThread(function()
    while true do
        Wait(1000)
        for _, ent in ipairs(GetGamePool("CObject")) do
            if GetEntityHeightAboveGround(ent) < 0.2 then
                removeProp(ent)
            end
        end
    end
end)
```

```lua
-- WRONG: rewrite the file while fixing a bug (loses async build / user order)
-- CORRECT: change only the failing lines; leave approved async/simple structure
```

---
