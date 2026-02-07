# QBCore Framework Reference

## Framework Structure

Standard QBCore resource structure:

```
my-resource/
├── fxmanifest.lua
├── config.lua         # Configuration
├── client/
│   ├── main.lua       # Client-side logic
│   └── events.lua     # Client events (optional)
├── server/
│   ├── main.lua       # Server-side logic
│   └── callbacks.lua  # Server callbacks (optional)
├── locale/            # Optional Translations
│   └── en.lua
└── html/              # NUI (optional)
    ├── index.html
    └── script.js
```

## Core Object Retrieval

To interact with the framework, **always** retrieve the Core Object at the start of your script.

```lua
local QBCore = exports['qb-core']:GetCoreObject()
```

## Player Functions (Server-side)

### Get Player Object
```lua
local Player = QBCore.Functions.GetPlayer(source)
-- Returns: Player (table) or nil
```

### Get Player by CitizenID
```lua
local Player = QBCore.Functions.GetPlayerByCitizenId(citizenid)
-- Returns: Player (table) or nil
```

### Player Methods (Player.*)
Once you have the `Player` object:

| Function | Example | Description |
|----------|---------|-------------|
| **AddMoney** | `Player.Functions.AddMoney('cash', 100)` | Add money (cash/bank/crypto) |
| **RemoveMoney** | `Player.Functions.RemoveMoney('bank', 50)` | Remove money |
| **SetJob** | `Player.Functions.SetJob('police', 1)` | Set job and grade |
| **SetGang** | `Player.Functions.SetGang('ballas', 2)` | Set gang and grade |
| **AddItem** | `Player.Functions.AddItem('water', 1)` | Add item to inventory |
| **RemoveItem** | `Player.Functions.RemoveItem('bread', 1)` | Remove item |
| **GetItemByName** | `Player.Functions.GetItemByName('phone')` | Check if player has item |
| **SetMetaData** | `Player.Functions.SetMetaData('hunger', 100)` | Update metadata |

## Database (oxmysql)

QBCore uses `oxmysql` for database operations.

```lua
-- Fetch (SELECT)
local result = MySQL.query.await('SELECT * FROM players WHERE citizenid = ?', { citizenid })

-- Insert
local id = MySQL.insert.await('INSERT INTO vehicles (plate, citizenid) VALUES (?, ?)', { plate, citizenid })

-- Update
local affectedRows = MySQL.update.await('UPDATE players SET money = ? WHERE citizenid = ?', { json.encode(money), citizenid })

-- Scalar (Single value)
local count = MySQL.scalar.await('SELECT COUNT(*) FROM players', {})
```

## Callbacks (Data Fetching)

Callbacks allow the server to send data back to the client request.

### Server-side (Create)
```lua
QBCore.Functions.CreateCallback('my-resource:server:GetData', function(source, cb, args)
    local Player = QBCore.Functions.GetPlayer(source)
    if Player then
        cb(Player.PlayerData.money.cash)
    else
        cb(nil)
    end
end)
```

### Client-side (Trigger)
```lua
QBCore.Functions.TriggerCallback('my-resource:server:GetData', function(cash)
    if cash then
        print('My cash:', cash)
    end
end, optionalArgs)
```

## Items (Useable)

Register items that execute code when used.

### Server-side
```lua
QBCore.Functions.CreateUseableItem('medkit', function(source, item)
    local Player = QBCore.Functions.GetPlayer(source)
    if Player.Functions.RemoveItem('medkit', 1) then
        TriggerClientEvent('hospital:client:Heal', source)
    end
end)
```

## Commands

Use QBCore command system instead of native `RegisterCommand` for better integration (permissions, help text).

### Server-side
```lua
QBCore.Commands.Add('heal', 'Heal a player (Admin Only)', {{name='id', help='Player ID'}}, false, function(source, args)
    local target = tonumber(args[1])
    if target then
        TriggerClientEvent('hospital:client:Heal', target)
    else
        TriggerClientEvent('hospital:client:Heal', source)
    end
end, 'admin') -- Permission group
```

## Key Events

### Client
- `QBCore:Client:OnPlayerLoaded`: Triggered when player spawns and data is loaded. Use this to initialize data.
- `QBCore:Client:OnJobUpdate`: Triggered when job changes. Update UI/Permissions.
- `QBCore:Notify`: Use `QBCore.Functions.Notify('Message', 'type')` instead of triggering directly if possible.

### Server
- `QBCore:Server:PlayerLoaded`: Triggered when a player fully joins.

## Notification Types

- `success`: Green checkmark.
- `error`: Red cross.
- `primary`: Blue info.
- `police`: Police theme.

```lua
QBCore.Functions.Notify('Job Done!', 'success', 5000)
```
