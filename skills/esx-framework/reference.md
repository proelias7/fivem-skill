# ESX Framework Reference

## Framework Structure

Standard ESX resource structure:

```
my-resource/
├── fxmanifest.lua
├── config.lua         # Lua-based minimal config
├── client/
│   ├── main.lua       # Client-side logic
├── server/
│   ├── main.lua       # Server-side logic
├── locales/           # Translations
│   └── en.lua
└── html/              # NUI (optional)
    ├── index.html
    └── script.js
```

## Core Object Retrieval

To interact with ESX, you need the Shared Object.

**Client & Server (New Way):**
```lua
local ESX = exports["es_extended"]:getSharedObject()
```

**Client & Server (Legacy Event):**
```lua
local ESX = nil
CreateThread(function()
    while not ESX do
        TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)
        Wait(50)
    end
end)
```

## Player Functions (Server-side)

### Get xPlayer Object
```lua
local xPlayer = ESX.GetPlayerFromId(source)
-- Returns: xPlayer (table) or nil
```

### Get xPlayer by Identifier
```lua
local xPlayer = ESX.GetPlayerFromIdentifier(identifier)
-- Returns: xPlayer (table) or nil
```

### xPlayer Methods (xPlayer.*)
Once you have the `xPlayer` object:

| Function | Example | Description |
|----------|---------|-------------|
| **addMoney** | `xPlayer.addMoney(100)` | Add cash (account 'money') |
| **removeMoney** | `xPlayer.removeMoney(50)` | Remove cash |
| **addAccountMoney** | `xPlayer.addAccountMoney('bank', 500)` | Add money to account |
| **removeAccountMoney** | `xPlayer.removeAccountMoney('dirty_money', 200)` | Remove account money |
| **setJob** | `xPlayer.setJob('police', 3)` | Set job and grade |
| **addInventoryItem** | `xPlayer.addInventoryItem('bread', 1)` | Add item |
| **removeInventoryItem** | `xPlayer.removeInventoryItem('water', 1)` | Remove item |
| **getInventoryItem** | `xPlayer.getInventoryItem('phone')` | Helper to check item amount |
| **showNotification** | `xPlayer.showNotification('Hello!')` | Send notification |

## Callbacks (Data Fetching)

Callbacks allow server -> client data response.

### Server-side (Register)
```lua
ESX.RegisterServerCallback('my-resource:server:GetData', function(source, cb, args)
    local xPlayer = ESX.GetPlayerFromId(source)
    if xPlayer then
        cb(xPlayer.getMoney())
    else
        cb(0)
    end
end)
```

### Client-side (Trigger)
```lua
ESX.TriggerServerCallback('my-resource:server:GetData', function(money)
    if money then
        print('My cash:', money)
    end
end, optionalArgs)
```

## Database (oxmysql)

ESX Legacy uses `oxmysql` by default.

```lua
-- Fetch (SELECT)
MySQL.query('SELECT * FROM users WHERE identifier = ?', { identifier }, function(result)
    if result then
        -- Handle result
    end
end)

-- Insert
MySQL.insert('INSERT INTO owned_vehicles (owner, plate) VALUES (?, ?)', { identifier, plate })
```

## Events

### Client Events
- `esx:playerLoaded`: Triggered when player spawns and xPlayer is ready.
    ```lua
    RegisterNetEvent('esx:playerLoaded')
    AddEventHandler('esx:playerLoaded', function(xPlayer)
        ESX.PlayerData = xPlayer
        ESX.PlayerLoaded = true
    end)
    ```
- `esx:setJob`: Triggered on job change.
    ```lua
    RegisterNetEvent('esx:setJob')
    AddEventHandler('esx:setJob', function(job)
        ESX.PlayerData.job = job
    end)
    ```

### Server Events
- `esx:playerLoaded`: Triggered when player fully joins.

## Items (Useable)

Register items server-side.

```lua
ESX.RegisterUsableItem('medkit', function(source)
    local xPlayer = ESX.GetPlayerFromId(source)
    xPlayer.removeInventoryItem('medkit', 1)
    TriggerClientEvent('esx_ambulancejob:heal', source, 'big')
end)
```
