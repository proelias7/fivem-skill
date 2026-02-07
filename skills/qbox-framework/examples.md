# Qbox Code Examples

## 1. Basic Resource Structure

### fxmanifest.lua
```lua
fx_version 'cerulean'
game 'gta5'

lua54 'yes'

shared_scripts {
    '@qbx_core/shared/locale.lua',
    'locales/en.lua',
    'config.lua'
}

client_scripts {
    'client/main.lua'
}

server_scripts {
    'server/main.lua'
}

dependencies {
    'qbx_core',
    'ox_lib'
}
```

### config.lua
```lua
Config = {}
Config.Job = 'police'
```

### client/main.lua
```lua
local QBCore = exports['qbx_core']:GetCoreObject()

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    -- Initialize your resource here
    lib.notify({
        title = 'Connected',
        description = 'Resources loaded successfully!',
        type = 'success'
    })
end)
```

### server/main.lua
```lua
local QBCore = exports['qbx_core']:GetCoreObject()

-- Server logic here
```

## 2. Command with Ox Lib (Server-side)

```lua
lib.addCommand('givemoney', {
    help = 'Give money to a player',
    params = {
        { name = 'target', type = 'playerId', help = 'Target ID' },
        { name = 'amount', type = 'number', help = 'Amount' },
    },
    restricted = 'group.admin'
}, function(source, args)
    local target = exports.qbx_core:GetPlayer(args.target)
    if not target then
        return lib.notify(source, { type = 'error', description = 'Player not found' })
    end

    target.Functions.AddMoney('cash', args.amount)
    lib.notify(source, { type = 'success', description = ('Gave $%d to %s'):format(args.amount, target.PlayerData.charinfo.firstname) })
end)
```

## 3. Server Callback (Ox Lib)

### Server-side (`server/callbacks.lua`)
```lua
lib.callback.register('my-resource:server:GetData', function(source)
    local player = exports.qbx_core:GetPlayer(source)
    if player then
        return {
            name = player.PlayerData.charinfo.firstname,
            cash = player.PlayerData.money.cash
        }
    end
    return nil
end)
```

### Client-side (`client/main.lua`)
```lua
RegisterCommand('getmydata', function()
    local data = lib.callback.await('my-resource:server:GetData', false)
    if data then
        print('Name:', data.name, 'Cash:', data.cash)
    end
end)
```

## 4. Ox Inventory Integration (Adding Items)

Using `ox_inventory` exports is preferred over `Player.Functions.AddItem`.

```lua
local success, response = exports.ox_inventory:AddItem(source, 'water', 1)
if success then
    lib.notify(source, { type = 'success', description = 'Added water!' })
else
    lib.notify(source, { type = 'error', description = 'Inventory full!' })
end
```

## 5. Optimized Loops (Ox Lib Points)

Instead of `CreateThread` + `Wait` + `DrawMarker`:

### client/main.lua
```lua
local point = lib.points.new({
    coords = vector3(441.0, -981.0, 30.0),
    distance = 5,
    drew = false,
})

function point:onEnter()
    lib.showTextUI('[E] Open Police Menu')
end

function point:onExit()
    lib.hideTextUI()
end

function point:nearby()
    DrawMarker(2, self.coords.x, self.coords.y, self.coords.z, 0.0, 0.0, 0.0, 0.0, 180.0, 0.0, 1.0, 1.0, 1.0, 200, 20, 20, 50, false, true, 2, nil, nil, false)

    if self.currentDistance < 1 and IsControlJustReleased(0, 38) then
        TriggerEvent('police:client:OpenMenu')
    end
end
```
