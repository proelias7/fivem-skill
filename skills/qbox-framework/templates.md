# Qbox Resource Templates

## 1. Minimal Resource (fxmanifest + client + server)

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
```

### client/main.lua
```lua
local QBCore = exports['qbx_core']:GetCoreObject()

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    -- Init logic
    print("Player Loaded!")
end)
```

### server/main.lua
```lua
local QBCore = exports['qbx_core']:GetCoreObject()

-- Server logic
```

## 2. Ox Lib Callback (Server -> Client)

### client/main.lua
```lua
RegisterCommand('testcallback', function()
    lib.callback('my-resource:server:GetData', false, function(data)
        if data then
            print('Received:', data.name)
        else
            lib.notify({ type = 'error', description = 'No data found' })
        end
    end)
end)
```

### server/main.lua
```lua
local QBCore = exports['qbx_core']:GetCoreObject()

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

## 3. UI Integration (Ox Lib Context Menu)

Using `ox_lib` context menus instead of custom NUI is preferred for simple interactions.

### client/main.lua
```lua
lib.registerContext({
    id = 'police_menu',
    title = 'Police Menu',
    options = {
        {
            title = 'Clock In',
            description = 'Start Your Shift',
            icon = 'clock',
            onSelect = function()
                TriggerServerEvent('police:server:ClockIn')
            end
        },
        {
            title = 'Clock Out',
            description = 'End Your Shift',
            icon = 'clock',
            onSelect = function()
                TriggerServerEvent('police:server:ClockOut')
            end
        }
    }
})

RegisterCommand('policemenu', function()
    lib.showContext('police_menu')
end)
```
