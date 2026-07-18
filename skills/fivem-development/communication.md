# FiveM Best Practices — Communication

**Author:** Elias Araújo  
**Part of:** [best-practices.md](best-practices.md) index (one skill: `fivem-development`)  
**Section numbers** (`§1.6.1`, `§2.4`, …) are stable — keep them when linking from audits/corrections.

---

## 1. Client/Server Communication

### 1.1 Callback vs Events — Golden Rule

> **Callback/Tunnel** = when you NEED a return
> **Event** = when you DO NOT need a return

**Senior Lua house style:** keep code **monolithic and clean**. Prefer Tunnel/`return` for queries. Prefer a single event for fire-and-forget. Do **not** invent event roundtrips, thin wrappers, or React-style file trees.

**Performance Hierarchy (from lightest to heaviest):**

| Method | Performance | When to use |
|--------|-------------|-------------|
| `TriggerServerEvent` | Lightest | Action without return (preferred) |
| `ServerCallback._function()` | Medium | Fire-and-forget via callback (function already exists) |
| `ServerCallback.function()` / Tunnel | Heavier | When return is needed |

### Decision Flowchart

| Need | Use |
|------|-----|
| Return value from server | **Tunnel** (or project callback) with `return` — **one** call |
| Fire-and-forget (no return) | Event (`TriggerServerEvent`) — lightest |
| Same environment call | Direct function call — no overhead |
| Multiple data in one operation | Single Tunnel call that returns all data |

```lua
-- CORRECT: return needed → Tunnel (single round-trip, readable)
function src.GetShopStock(shopId)
    return ShopCache[shopId]
end
-- client: local stock = vSERVER.GetShopStock(id)

-- CORRECT: NO return needed → Event
TriggerServerEvent("airdrop:start")

-- FORBIDDEN: event chain to "return" data (agent anti-pattern)
-- client TriggerServerEvent("x:get") → server TriggerClientEvent("x:receive", source, data)
-- → use Tunnel/callback with return instead

-- AVOID: callback/Tunnel without using return (unnecessary overhead)
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

**Problems with event roundtrips for queries:**
1. **Harder to read** — logic split across two handlers
2. **Race / ordering** — no natural return stack
3. **Extra surface** — more events to auth and name
4. **Worse than Tunnel** when you already have vRP Tunnel in the resource

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

> **§1.4–§1.6.1 (loops, dynamic sleep, payloads, broadcast targets)** live in [performance.md](performance.md) — load that file for tick/network cost rules.

### 1.7 Signs of Callback/Tunnel Problems

If you see errors related to Tunnel/callback timeouts:
- **Cause:** Callback being used without return or in loop
- **Symptoms:** Internal loops, stuck callbacks
- **Solution:** Change to events

---
