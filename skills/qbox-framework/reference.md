# Qbox Framework Reference

## Resource Structure

Standard Qbox resource structure:

```
my-resource/
├── fxmanifest.lua
├── config.lua         # Lua-based minimal config
├── client/
│   ├── main.lua       # Client-side logic
│   └── events.lua     # Client events
├── server/
│   ├── main.lua       # Server-side logic
│   └── callbacks.lua  # Callbacks
├── locales/           # Ox_lib uses .json by default
│   └── en.json
└── html/              # NUI (optional)
    ├── index.html
    └── script.js
```

## Get Core Object (Bridge/Legacy)

Qbox supports the traditional Core Object for compatibility:

```lua
local QBCore = exports['qb-core']:GetCoreObject()
```

## Exports-Based API (Native Qbox)

### Server Exports

| Export | Example | Description |
|--------|---------|-------------|
| **GetPlayer** | `exports.qbx_core:GetPlayer(source)` | Returns Player Table |
| **GetPlayerByCitizenId** | `exports.qbx_core:GetPlayerByCitizenId(cid)` | Returns Player Table |
| **GetOfflinePlayer** | `exports.qbx_core:GetOfflinePlayer(cid)` | Fetches offline data |
| **Notify** | `exports.qbx_core:Notify(source, msg, type)` | Server -> Client Notify (uses ox_lib) |
| **UpsertPlayerData** | `exports.qbx_core:UpsertPlayerData(cid, data)` | Update/Insert data |

### Client Exports

| Export | Example | Description |
|--------|---------|-------------|
| **GetPlayerData** | `exports.qbx_core:GetPlayerData()` | Returns local player data |
| **Notify** | `exports.qbx_core:Notify(msg, type)` | Client Notify (uses ox_lib) |

## Player Functions (Server `Player` Object)

Once you retrieve `local player = exports.qbx_core:GetPlayer(source)`:

| Function | Example | Description |
|----------|---------|-------------|
| **Functions.AddMoney** | `player.Functions.AddMoney('cash', 100)` | Add currency |
| **Functions.RemoveMoney** | `player.Functions.RemoveMoney('bank', 50)` | Remove currency |
| **Functions.SetJob** | `player.Functions.SetJob('police', 1)` | Set job/grade |
| **Functions.SetGang** | `player.Functions.SetGang('lostmc', 2)` | Set gang/grade |
| **Functions.AddItem** | `player.Functions.AddItem('water', 1)` | Handled by **ox_inventory** (usually) |
| **Functions.RemoveItem** | `player.Functions.RemoveItem('bread', 1)` | Handled by **ox_inventory** (usually) |
| **Functions.SetMetaData** | `player.Functions.SetMetaData('isdead', true)` | Update boolean/string meta |

## Ox Integration

Qbox is designed to work seamlessly with Overextended resources.

### Ox Lib (UI/Callbacks)
- **lib.callback:** Optimized callback system.
- **lib.zones:** Optimized polyzones.
- **lib.registerContext:** Context menus.
- **lib.notify:** Notification system.

### Ox Inventory (Items)
- Items are defined in `ox_inventory/data/items.lua`.
- Inventory functions: `exports.ox_inventory:AddItem(source, item, count)`.

## Database (oxmysql)

Qbox exclusively uses `oxmysql`.

```lua
-- Fetch (SELECT)
local result = MySQL.query.await('SELECT * FROM players WHERE citizenid = ?', { citizenid })

-- Insert
local id = MySQL.insert.await('INSERT INTO vehicles (plate, citizenid) VALUES (?, ?)', { plate, citizenid })
```

## Events

### Client Events
- `App:Client:OnPlayerLoaded`: Triggered when character is selected/spawned.
- `QBCore:Client:OnJobUpdate`: Legacy event for job updates (bridge).
- `qbx_core:client:playerLoggedOut`: Triggered on logout.

### Server Events
- `QBCore:Server:PlayerLoaded`: Triggered when player joins (bridge).
- `qbx_core:server:playerLoaded`: Native event.
