# ESX Resource Templates

## 1. Minimal Resource (Client + Server)

### fxmanifest.lua
```lua
fx_version 'cerulean'
game 'gta5'

lua54 'yes'

shared_scripts {
    '@es_extended/imports.lua',
    'config.lua',
    'locales/en.lua',
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
```

### client/main.lua
```lua
local ESX = exports["es_extended"]:getSharedObject()

RegisterNetEvent('esx:playerLoaded')
AddEventHandler('esx:playerLoaded', function(xPlayer)
    ESX.PlayerData = xPlayer
    ESX.PlayerLoaded = true
end)

RegisterNetEvent('esx:setJob')
AddEventHandler('esx:setJob', function(job)
    ESX.PlayerData.job = job
end)

CreateThread(function()
    while not ESX.PlayerData.job do Wait(10) end
    -- Init logic
end)
```

### server/main.lua
```lua
local ESX = exports["es_extended"]:getSharedObject()

-- Server logic
```

## 2. Callback Resource (Server -> Client)

### client/main.lua
```lua
RegisterCommand('checkcash', function()
    ESX.TriggerServerCallback('my-resource:server:GetCash', function(cash)
        print('You have:', cash)
    end)
end)
```

### server/main.lua
```lua
ESX.RegisterServerCallback('my-resource:server:GetCash', function(source, cb)
    local xPlayer = ESX.GetPlayerFromId(source)
    if xPlayer then
        cb(xPlayer.getMoney())
    else
        cb(0)
    end
end)
```

## 3. NUI Integration (React/HTML)

### fxmanifest.lua
```lua
ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js'
}
```

### client/main.lua
```lua
RegisterNUICallback('close', function(data, cb)
    SetNuiFocus(false, false)
    cb('ok')
end)

RegisterCommand('opennui', function()
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'open',
        data = { name = ESX.PlayerData.firstName }
    })
end)
```

### html/script.js
```javascript
window.addEventListener('message', function(event) {
    if (event.data.action === 'open') {
        document.body.style.display = 'block';
    }
});

document.addEventListener('keyup', function(e) {
    if (e.key === 'Escape') {
        fetch(`https://${GetParentResourceName()}/close`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        document.body.style.display = 'none';
    }
});
```
