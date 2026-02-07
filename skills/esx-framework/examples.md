# ESX Code Examples

## 1. Basic Resource Structure

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
Config.Locale = 'en'
```

### client/main.lua
```lua
local ESX = exports["es_extended"]:getSharedObject()

RegisterNetEvent('esx:playerLoaded')
AddEventHandler('esx:playerLoaded', function(xPlayer)
    ESX.PlayerData = xPlayer
end)

RegisterNetEvent('esx:setJob')
AddEventHandler('esx:setJob', function(job)
    ESX.PlayerData.job = job
end)
```

### server/main.lua
```lua
local ESX = exports["es_extended"]:getSharedObject()

-- Server logic
```

## 2. Command with Permission Check (Server-side)

```lua
ESX.RegisterCommand('givemoney', 'admin', function(xPlayer, args, showError)
    args.playerId.addAccountMoney(args.account, args.amount)
    args.playerId.showNotification('You received ~g~$' .. args.amount .. '~w~.')
    xPlayer.showNotification('Gave ~g~$' .. args.amount .. '~w~ to ' .. args.playerId.getName())
end, true, {help = 'Give money', arguments = {
    {name = 'playerId', help = 'The player id', type = 'player'},
    {name = 'account', help = 'Valid account name', type = 'string'},
    {name = 'amount', help = 'Amount', type = 'number'}
}})
```

## 3. Server Callback (Fetch Data)

### Server-side
```lua
ESX.RegisterServerCallback('my-resource:server:GetData', function(source, cb, args)
    local xPlayer = ESX.GetPlayerFromId(source)
    if xPlayer then
        cb(xPlayer.getAccount('bank').money)
    else
        cb(0)
    end
end)
```

### Client-side
```lua
RegisterCommand('checkbank', function()
    ESX.TriggerServerCallback('my-resource:server:GetData', function(bank)
        ESX.ShowNotification('Bank Balance: ~g~$'..bank)
    end)
end)
```

## 4. Useable Item (Server-side)

```lua
ESX.RegisterUsableItem('bandage', function(source)
    local xPlayer = ESX.GetPlayerFromId(source)
    xPlayer.removeInventoryItem('bandage', 1)
    
    TriggerClientEvent('esx_ambulancejob:heal', source, 'small')
    xPlayer.showNotification('Used a bandage.')
end)
```

## 5. Job Loop (Marker Interaction)

### client/main.lua
```lua
CreateThread(function()
    while true do
        local sleep = 1000
        
        if ESX.PlayerData.job and ESX.PlayerData.job.name == 'police' then
            local ped = PlayerPedId()
            local coords = GetEntityCoords(ped)
            local dist = #(coords - vector3(441.0, -981.0, 30.0)) -- Police Station

            if dist < 10.0 then
                sleep = 0
                DrawMarker(2, 441.0, -981.0, 30.0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 50, 50, 200, 100, false, true, 2, nil, nil, false)
                
                if dist < 1.5 then
                    ESX.ShowHelpNotification('Press ~INPUT_CONTEXT~ to open menu')
                    if IsControlJustReleased(0, 38) then
                        OpenPoliceMenu()
                    end
                end
            end
        end
        Wait(sleep)
    end
end)
```

## 6. Using Ox Lib (Context Menu)

If utilizing `ox_lib` with ESX:

```lua
-- client/main.lua
lib.registerContext({
    id = 'police_menu',
    title = 'Police Menu',
    options = {
        {
            title = 'Clock In',
            description = 'Start Duty',
            onSelect = function()
                TriggerServerEvent('esx:setJob', 'police', 0)
            end
        }
    }
})

function OpenPoliceMenu()
    lib.showContext('police_menu')
end
```
