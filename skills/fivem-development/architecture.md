# FiveM Best Practices — Architecture

**Author:** Elias Araújo  
**Part of:** [best-practices.md](best-practices.md) index (one skill: `fivem-development`)  
**Section numbers** (`§1.6.1`, `§2.4`, …) are stable — keep them when linking from audits/corrections.

---

## 3. Code Structure — Architecture

Monolith layout, globals vs locals, state placement. Style/tables/comments → [style.md](style.md).

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

**Same-resource sharing (critical — do not over-engineer):**

All files in one `server_scripts { ... }` block share the **same Lua environment** (load order = manifest order). To share a module table across those files:

```lua
-- server/database.lua  (listed before consumers in fxmanifest)
ResgateDatabase = {}          -- GLOBAL (no local)
function ResgateDatabase:new() ... end
-- no return

-- server/functions.lua
local db = ResgateDatabase:new()  -- just use it
```

**Forbidden in the same resource / same side:**

```lua
-- WRONG — fake Node-style import (agent anti-pattern)
local chunk = LoadResourceFile(GetCurrentResourceName(), "server/database.lua")
local ResgateDatabase = assert(load(chunk, "@@..."))()
```

Also forbidden for sibling scripts: inventing `require(...)`, `dofile`, or `local X = {}` + `return X` when another file in the same `server_scripts` list needs `X`. Use a **global** or keep logic in one file with `local function`.

Cross-**resource** sharing → `exports` / events / shared lib — never resource globals across resources.

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
