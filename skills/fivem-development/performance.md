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

#### N+1 remote call — loop client → server por item

```lua
-- WRONG: 1 chamada Tunnel + 1 query por preset (N+1)
for _, preset in ipairs(presets) do
    Wait(120)
    local shot = func.getScreenshot(preset.id)
    SendNUIMessage({ action = "screenshot", id = preset.id, data = shot })
end

-- CORRECT: uma chamada batch (ou já incluir o campo no payload da lista)
local shots = func.getScreenshots(presetIds)  -- server: WHERE id IN (...)
for id, shot in pairs(shots) do
    SendNUIMessage({ action = "screenshot", id = id, data = shot })
end
```

**Before any position sync (N5):** with OneSync the server reads `GetEntityCoords(GetPlayerPed(src))` and other clients read coords natively — an event that only reports position is usually unnecessary.

**Audit grep:** loop no client que chama `func.*` / `ServerCallback` / `TriggerServerEvent` por item de uma lista recebida na mesma sessão. Fix: endpoint batch (`ids[]` → `WHERE id IN (...)`) ou incluir o campo no payload da lista; veja também §2.1.1 (client-side cache).

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

#### Respostas Tunnel/callback (`tunnel_res`) seguem o mesmo budget

O retorno de uma chamada Tunnel/callback viaja pelo mesmo canal de rede — o cerberus o reporta como `OUT:<resource>:tunnel_res`. **Os limites acima valem para respostas também**: uma resposta de 290 KB é 35× o budget de um evento e pode derrubar jogadores.

Regras para endpoints de leitura:

1. **Lista retorna só metadados** — `load*`/`list*` retorna campos leves (id, nome, data). Campos pesados (screenshot LONGTEXT, JSON de roupa, imagens) ficam fora da lista.
2. **Detalhe pesado sob demanda** — por item selecionado (`getDetail(id)`), ou em **batch** se a UI precisa de todos (`getDetails(ids[])`); nunca N+1 (§1.4).
3. **Resposta > ~64 KB → repensar** — dividir, cachear no client (§2.1.1), ou entregar via cerberus `SendFullSync` quando for bootstrap grande.

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

**Rule (D1):** a per-user lookup (slots, ranks, permissions) read by 2+ endpoints goes through `cacheaside:Get` and is invalidated (`Set`/`Delete`) in the endpoint that mutates it — never re-queried per call. Case: wardrobe queried `extra_slots` in `loadPresets`, `refresh` and `saveOutfit` (3× E-a); fix = one cached read, `Set` on slot purchase.

### 2.1.1 Client-side cache — reduzir round-trips ao server

Dados de UI que mudam pouco (presets, configuração do próprio jogador, listas pessoais) não precisam ser rebuscados no server a cada abertura/refresh. Cacheie no **client** e invalide apenas quando o próprio jogador alterar.

**Padrões:**

| Padrão | Regra |
|--------|-------|
| **Fetch on open** | Ao abrir a UI, buscar **uma vez** (metadados + detalhes em batch). Guardar em tabela local do client. |
| **Save-through** | Ao editar: atualiza a cópia local **e** persiste no server na mesma ação. UI nunca fica à frente/atrás. |
| **Invalidar no CRUD** | create/update/delete bem-sucedido → atualiza ou remove a entrada no cache local (não rebusca a lista inteira). |
| **Detalhe em batch** | Precisa de N detalhes (ex. screenshots) → **1 chamada** `getDetails(ids[])`, não N chamadas (§1.4 N+1). |
| **Gerar no client** | Se o dado pode ser produzido localmente (ex. foto do próprio ped via `screenshot-basic`), prefira gerar no client a buscar bytes do server. |

```lua
-- client.lua
local presetsCache = nil

local function openUi()
    if not presetsCache then
        local list, maxSlots = func.loadPresets()       -- metadados leves
        local shots = func.getScreenshots(idsOf(list))  -- batch pesado
        presetsCache = merge(list, shots)
    end
    SendNUIMessage({ action = "open", presets = presetsCache })
end

-- save-through: server retorna o registro criado; atualiza cache local
RegisterNUICallback("save", function(data, cb)
    local ok, preset = func.saveOutfit(data.name, getCurrentClothing())
    if ok then
        presetsCache[preset.id] = preset   -- sem novo loadPresets()
    end
    cb({ success = ok, preset = preset })
end)
```

**Anti-padrões a flagar em audit:**

| Anti-padrão | Problema | Solução |
|-------------|----------|---------|
| Refresh rebusca tudo do server a cada interação | Queries + rede repetidas sem necessidade | Cache local + invalidação no CRUD |
| N+1 para enriquecer cada item (§1.4) | N queries + N respostas por abertura | Batch `getDetails(ids[])` |
| Lista carrega campos pesados (LONGTEXT/base64) | Resposta `tunnel_res` gigante (§1.6) | Lista = metadados; detalhe sob demanda |
| Dado gerável no client buscado do server | Round-trip + armazenamento desnecessários | Gerar localmente (screenshot do ped) |

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

### 2.3–2.5 Audit passes

The audit checklist (view-cache steps, Pass 0–7, matrices V-a…V-j, E-a…E-g, N-a…N-d, report gates) lives in [audit-passes.md](audit-passes.md) — read it only for `/fxmind audit`. Section numbers are unchanged.

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

> **Rule (N1/N4):** never loop `vRP.Players()` with `TriggerClientEvent` + `Wait` (blocks the server thread, O(n) events). Full rebuild → `SendFullSync(-1, event, payload, { key = ... })`; unit update → `SendDeltaSync(-1, event, delta)`. When cerberus is in the project, name the export in the fix — not a vague "use -1" or a statebag (statebags carry small flags, not payload tables).

```lua
-- WRONG
for _, src in pairs(vRP.Players()) do TriggerClientEvent("robberys:updateBlips", src, payload) Wait(30) end
-- CORRECT
exports["cerberus"]:SendDeltaSync(-1, "robberys:updateBlips", delta)
```

### 4.5 Load balance — what to avoid

- Manual chunking in inventory/routes/NUI resources
- Full sync for every small change
- Putting queue/priority logic in the consumer client
