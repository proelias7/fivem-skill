# QBCore Best Practices

## 1. Core Object Optimization

**Do:**
Retrieve the Core Object once at the top of your script.
```lua
local QBCore = exports['qb-core']:GetCoreObject()
```

**Don't:**
Retrieve it inside loops or frequently called functions.
```lua
CreateThread(function()
    while true do
        local QBCore = exports['qb-core']:GetCoreObject() -- BAD!
        -- ...
    end
end)
```

## 2. Player Data and Caching

**Do:**
Fetch player data only when needed or on specific events.
```lua
RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    -- Initialize data
end)

RegisterNetEvent('QBCore:Client:OnJobUpdate', function(JobInfo)
    -- Update job info
end)
```

**Don't:**
Assume player data is always available on client start. Use `OnPlayerLoaded` event.

## 3. Server-side Validation

**Do:**
Always validate data sent from client, especially in callbacks or events that give items/money.
```lua
QBCore.Functions.CreateCallback('shop:buyItem', function(source, cb, item, amount)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then return cb(false) end
    
    local price = Config.Items[item].price * amount
    if Player.PlayerData.money.cash >= price then
        Player.Functions.RemoveMoney('cash', price)
        Player.Functions.AddItem(item, amount)
        cb(true)
    else
        cb(false)
    end
end)
```

**Don't:**
Trust the client to calculate the price.
```lua
-- BAD: Client sends total price
RegisterNetEvent('shop:buyItem', function(item, totalCost)
    Player.Functions.RemoveMoney('cash', totalCost) -- Client can send 0!
end)
```

## 4. Loop Optimization (Distance Check)

**Do:**
Use dynamic sleep times based on player distance to markers/entities.
```lua
CreateThread(function()
    while true do
        local sleep = 1000
        local dist = #(pos - targetPos)
        if dist < 10.0 then
            sleep = 0
            -- DrawMarker/Text
        end
        Wait(sleep)
    end
end)
```

**Don't:**
Run `Wait(0)` loops constantly when the player is far away.

## 5. Use Key Mappings

**Do:**
Use `RegisterKeyMapping` for player controls instead of checking `IsControlJustPressed` in a loop (where possible).
```lua
RegisterKeyMapping('open_inventory', 'Open Inventory', 'keyboard', 'TAB')
RegisterCommand('open_inventory', function()
    TriggerEvent('inventory:client:OpenInventory')
end)
```

**Don't:**
Check keys inside every tick loop unless necessary for continuous actions (like movement).

## 6. Item Usage

**Do:**
Use `QBCore.Functions.CreateUseableItem` server-side for items that perform actions.
```lua
QBCore.Functions.CreateUseableItem('repairkit', function(source, item)
    TriggerClientEvent('vehicle:client:Repair', source)
end)
```

**Don't:**
Create client threads that check if a player is using an item.

## 7. Configuration Security

**Do:**
Keep sensitive configuration (API keys, Webhooks) in a separate `server/config.lua` or `server/main.lua` and never expose them to the client.

**Don't:**
Put webhooks in `shared/config.lua` or `client/config.lua`.

## 8. Export Usage

**Do:**
Use exports for cross-resource communication when available.
```lua
exports['qb-target']:AddBoxZone(...)
```

**Don't:**
Try to rewrite logic that already exists in other resources (like `qb-inventory` or `qb-target`).
