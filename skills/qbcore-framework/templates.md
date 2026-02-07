# QBCore Resource Templates

## 1. Basic Resource (fxmanifest + client + server)

### fxmanifest.lua
```lua
fx_version 'cerulean'
game 'gta5'

lua54 'yes'

shared_scripts {
    '@qb-core/shared/locale.lua',
    'locales/en.lua',
    'config.lua'
}

client_scripts {
    'client/main.lua'
}

server_scripts {
    'server/main.lua'
}
```

### config.lua
```lua
Config = {}

Config.Debug = false
```

### client/main.lua
```lua
local QBCore = exports['qb-core']:GetCoreObject()

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    -- Init logic
end)
```

### server/main.lua
```lua
local QBCore = exports['qb-core']:GetCoreObject()

-- Server logic
```

## 2. Callback Pattern (Server-side Logic)

### client/main.lua
```lua
local QBCore = exports['qb-core']:GetCoreObject()

RegisterCommand('testcallback', function()
    QBCore.Functions.TriggerCallback('my-resource:server:GetData', function(data)
        if data then
            print('Received:', data)
        else
            QBCore.Functions.Notify('No data found', 'error')
        end
    end)
end)
```

### server/main.lua
```lua
local QBCore = exports['qb-core']:GetCoreObject()

QBCore.Functions.CreateCallback('my-resource:server:GetData', function(source, cb)
    local Player = QBCore.Functions.GetPlayer(source)
    
    if Player then
        local data = {
            name = Player.PlayerData.charinfo.firstname,
            cash = Player.PlayerData.money.cash
        }
        cb(data)
    else
        cb(nil)
    end
end)
```

## 3. NUI Integration (React/HTML)

### fxmanifest.lua
```lua
-- Add ui_page
ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js'
}
```

### client/main.lua (NUI Callbacks)
```lua
RegisterNUICallback('close', function(data, cb)
    SetNuiFocus(false, false)
    cb('ok')
end)

RegisterCommand('opennui', function()
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'open',
        data = { title = 'Hello QBCore' }
    })
end)
```

### html/script.js
```javascript
window.addEventListener('message', function(event) {
    if (event.data.action === 'open') {
        document.body.style.display = 'block';
        // Handle data
    }
});

// Close with ESC
document.onkeyup = function(data) {
    if (data.which == 27) {
        fetch(`https://${GetParentResourceName()}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8', },
            body: JSON.stringify({})
        });
        document.body.style.display = 'none';
    }
};
```
