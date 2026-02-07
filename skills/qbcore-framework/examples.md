# QBCore Code Examples

## 1. Basic Resource Structure

### fxmanifest.lua
```lua
fx_version 'cerulean'
game 'gta5'

lua54 'yes'

shared_scripts {
    '@qb-core/shared/locale.lua',
    'locales/*.lua',
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

Config.Job = 'police'
Config.Distance = 3.0
```

### client/main.lua
```lua
local QBCore = exports['qb-core']:GetCoreObject()

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    -- Initialize your resource here (e.g. create blips)
end)

RegisterNetEvent('QBCore:Client:OnJobUpdate', function(JobInfo)
    PlayerJob = JobInfo
    -- Update job related UI/logic
end)
```

### server/main.lua
```lua
local QBCore = exports['qb-core']:GetCoreObject()

-- Server logic here
```

## 2. Command with Permission Check (Server-side)

```lua
QBCore.Commands.Add('givecash', 'Give cash to a player (Admin)', {{name='id', help='Player ID'}, {name='amount', help='Amount'}}, true, function(source, args)
    local target = tonumber(args[1])
    local amount = tonumber(args[2])
    local Player = QBCore.Functions.GetPlayer(target)

    if Player then
        Player.Functions.AddMoney('cash', amount)
        TriggerClientEvent('QBCore:Notify', source, 'Gave $'..amount..' to '..Player.PlayerData.charinfo.firstname, 'success')
        TriggerClientEvent('QBCore:Notify', target, 'You received $'..amount, 'success')
    else
        TriggerClientEvent('QBCore:Notify', source, 'Player not found', 'error')
    end
end, 'admin')
```

## 3. Server Callback (Fetch Data)

### Server-side
```lua
QBCore.Functions.CreateCallback('my-resource:server:GetBalance', function(source, cb)
    local Player = QBCore.Functions.GetPlayer(source)
    if Player then
        cb(Player.PlayerData.money.bank)
    else
        cb(0)
    end
end)
```

### Client-side
```lua
RegisterKeyMapping('checkbalance', 'Check Bank Balance', 'keyboard', 'B')

RegisterCommand('checkbalance', function()
    QBCore.Functions.TriggerCallback('my-resource:server:GetBalance', function(balance)
        QBCore.Functions.Notify('Bank Balance: $'..balance, 'primary')
    end)
end)
```

## 4. Useable Item (Server-side)

```lua
QBCore.Functions.CreateUseableItem('bandage', function(source, item)
    local Player = QBCore.Functions.GetPlayer(source)
    if Player.Functions.RemoveItem('bandage', 1) then
        TriggerClientEvent('hospital:client:Heal', source)
        TriggerClientEvent('inventory:client:ItemBox', source, QBCore.Shared.Items['bandage'], 'remove')
    end
end)
```

## 5. Job Loop (Marker Interaction)

### client/main.lua
```lua
local QBCore = exports['qb-core']:GetCoreObject()
local PlayerJob = {}

AddEventHandler('onResourceStart', function(resourceName)
    if GetCurrentResourceName() ~= resourceName then return end
    local PlayerData = QBCore.Functions.GetPlayerData()
    PlayerJob = PlayerData.job
end)

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    local PlayerData = QBCore.Functions.GetPlayerData()
    PlayerJob = PlayerData.job
end)

RegisterNetEvent('QBCore:Client:OnJobUpdate', function(JobInfo)
    PlayerJob = JobInfo
end)

CreateThread(function()
    while true do
        local sleep = 1000
        if LocalPlayer.state.isLoggedIn and PlayerJob.name == 'police' then
            local ped = PlayerPedId()
            local pos = GetEntityCoords(ped)
            local dist = #(pos - vector3(441.0, -981.0, 30.0)) -- Police Station

            if dist < 10.0 then
                sleep = 0
                DrawMarker(2, 441.0, -981.0, 30.0, 0, 0, 0, 0, 0, 0, 0.3, 0.3, 0.2, 0, 0, 255, 200, false, false, 2, true, nil, nil, false)
                if dist < 1.5 then
                    QBCore.Functions.DrawText3D(441.0, -981.0, 30.5, '[E] Open Menu')
                    if IsControlJustPressed(0, 38) then -- E key
                        TriggerEvent('police:client:OpenMenu')
                    end
                end
            end
        end
        Wait(sleep)
    end
end)
```

## 6. Database Operations (oxmysql)

### Insert Data
```lua
local success = MySQL.insert.await('INSERT INTO `player_vehicles` (license, citizenid, vehicle, hash) VALUES (?, ?, ?, ?)', {
    Player.PlayerData.license,
    Player.PlayerData.citizenid,
    'adder',
    GetHashKey('adder')
})
if success then
    print('Vehicle added to DB')
end
```

### Fetch Data
```lua
local result = MySQL.query.await('SELECT * FROM `player_vehicles` WHERE citizenid = ?', { Player.PlayerData.citizenid })
if result and #result > 0 then
    for _, v in pairs(result) do
        print('Vehicle Plate:', v.plate)
    end
end
```
