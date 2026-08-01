# FiveM Best Practices — Security

**Author:** Elias Araújo  
**Part of:** [best-practices.md](best-practices.md) index (one skill: `fivem-development`)  
**Section numbers** (`§1.6.1`, `§2.4`, …) are stable — keep them when linking from audits/corrections.

---

## Cerberus security modules

Enable in `config/config.lua`:

```lua
config.modules = {
    banned = false,
    safeEvent = true,
    analytics = true,
}
```

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
- **Event-flow DoS:** treat every client→server net event as spam-able — if the handler hits SQL, fans out `TriggerClientEvent(-1)`, or writes `GlobalState` / replicated StateBags, require SafeEvent/cooldown + cache (checklist: [performance.md](performance.md) **Pass 2b** E-a…E-e, §1.6.2)

> **Rule:** Every server event that grants money, items, XP, vehicles, or bypasses restrictions must validate on the server before applying the reward.

### 5.1 Client-Callable Endpoints — Server Auth (Audit)

**General rule:** every client-callable server endpoint — `RegisterNetEvent`, `Tunnel.bindInterface` function, or NUI→server chain — requires, on the server: **identity** (Passport/user_id), **rate-limit** (`SafeEvent` §4.6) proportional to cost, and **input validation** (§5.3) when it mutates. UI buttons are not a gate; assume the client is hostile (performance.md Pass 2b).

**Admin/manager endpoints (`manager:*`, `admin:*`)** are a special class: beyond rate-limit + validation, they require **real staff permission**. Client-only UI gating is **not** security.

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

### 5.2 Server-Side Data Resolution — Never Trust Client for Derivable Data

The client should only send **minimal identifiers**, not derived values. The server resolves identities, names, permissions, and other data that can be looked up.

```lua
-- WRONG: client sends killer name (can be spoofed)
TriggerServerEvent("survival:playerDied", killerName, coords)

-- CORRECT: client sends killer server ID, server resolves name
TriggerServerEvent("survival:playerDied", KillerSource, coords)

-- Server-side resolution
RegisterNetEvent("survival:playerDied")
AddEventHandler("survival:playerDied", function(KillerSource, deathCoords)
    local source = source
    local user_id = vRP.Passport(source)
    if not user_id then return end

    local killerName = "Unknown"
    if KillerSource and KillerSource > 0 then
        local killerPassport = vRP.Passport(KillerSource)
        if killerPassport then
            local identity = vRP.Identity(killerPassport)
            if identity then
                killerName = identity.name .. " " .. identity.name2 .. " [" .. killerPassport .. "]"
            end
        end
    end

    -- Now use server-resolved killerName
end)
```

**Pattern:** Client sends minimal data (source ID, coordinates). Server resolves everything else (names, permissions, prices, distances).

**Anti-patterns to flag:**

| Client sends | Problem | Server should resolve |
|-------------|---------|----------------------|
| `killerName` | Spoofable | `vRP.Identity(vRP.Passport(killerSource))` |
| `price` | Exploitable | `Config.Prices[item]` |
| `permission` | Bypassable | `vRP.HasGroup(passport, perm)` |
| `distance` | Manipulable | Calculate server-side from coordinates |

### 5.3 Input Validation Checklist (every mutation)

Every endpoint that writes to DB/state must validate client input on the server **before** the write. Missing validation on a mutation = **High** (combine with Pass 2b E-d).

| Check | Rule | Severity if missing |
|-------|------|---------------------|
| **Type/shape** | `type(x)` matches expectation; tables have expected keys only | High |
| **Whitelist keys** | component/prop/field ids against a `Config` allowlist (e.g. `Config.Components`) | High |
| **Numeric ranges** | drawable/texture/amount within sane bounds (reject negative/huge) | Medium |
| **String cap** | `#str` bounded (name ≤ 32, base64 ≤ N KB). Unbounded string → LONGTEXT DB = **High** | High |
| **Format prefix** | e.g. screenshot must match `^data:image/` | Medium |
| **Empty/blank** | reject empty name/id where a value is required | Low |
| **Server-verifiable context** | when the action depends on location/state, verify server-side what you can: coords vs `Config.Locations`, ownership (`AND user_id = ?`). Client-reported UI state is a **hint, not a gate** — the real brake is SafeEvent | Medium |

```lua
-- WRONG: trust NUI maxlength + unbounded base64 straight into LONGTEXT
function func.saveScreenshot(presetId, data)
    exports["oxmysql"]:executeSync("UPDATE ... SET screenshot = ? ...", { data, ... })
end

-- CORRECT
function func.saveScreenshot(presetId, data)
    local source = source
    if exports["cerberus"]:SafeEvent(source, "wardrobe:saveScreenshot", { time = 5, noBan = true }) then return false end
    local user_id = vRP.Passport(source)
    if not user_id then return false end
    if type(data) ~= "string" or #data > 500000 or not data:match("^data:image/") then
        return false
    end
    -- ownership enforced by WHERE id = ? AND user_id = ?
end
```

### Learned rule: Webhook tokens must live in a dedicated webhook resource (robberys, 2026-06-20)

- **Never** hardcode Discord webhook URLs/tokens in server scripts (`server.lua`, `sv_*.lua`), shared scripts, or any file accessible to clients (NUI, shared_scripts).
- Move tokens to a **dedicated server-side webhook resource** — never to `server.cfg`.
- Critical audit rule: token must not be in any file loaded client-side.

**Why:** Tokens in server Lua files are exposed in the git repository. `server.cfg` is also readable in some hosting environments and is not the correct pattern for webhook credentials. A dedicated webhook resource isolates the secret to a single protected server-only scope and allows rotation without touching game logic.

Example:
```lua
-- WRONG: token hardcoded in server.lua (git-exposed)
local Robbery = "https://discord.com/api/webhooks/123456/TOKEN..."  -- server.lua:50

-- WRONG: token moved to server.cfg (not the right place for webhook credentials)
-- set WEBHOOK_ROBBERY "https://discord.com/api/webhooks/123456/TOKEN..."

-- CORRECT: dedicated webhook resource (server-only)
-- In resource "webhook/server.lua":
local token = "https://discord.com/api/webhooks/123456/TOKEN..."
exports("SendWebhook", function(data) PerformHttpRequest(token, ...) end)

-- In robberys/server.lua:
exports["webhook"]:SendWebhook({ content = "..." })
```
