# ESX Best Practices

## 1. Shared Object Retrieval

**Do:**
Use the export method which is synchronous and safer.
```lua
local ESX = exports["es_extended"]:getSharedObject()
```

**Don't:**
Use the legacy event loop unless you specifically need to support very old ESX versions (pre-1.2).
```lua
-- Avoid this if possible
TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)
```

## 2. Server-Side Player Check

**Do:**
Always verify if `xPlayer` exists before using it.
```lua
local xPlayer = ESX.GetPlayerFromId(source)
if not xPlayer then return end

xPlayer.addMoney(100)
```

**Don't:**
Assume `xPlayer` is valid just because `source` exists. Players might be loading or disconnected.

## 3. Client-Side Player Data

**Do:**
Cache `ESX.PlayerData` and update it via events.
```lua
RegisterNetEvent('esx:playerLoaded')
AddEventHandler('esx:playerLoaded', function(xPlayer)
    ESX.PlayerData = xPlayer
    ESX.PlayerLoaded = true
end)

RegisterNetEvent('esx:setJob')
AddEventHandler('esx:setJob', function(job)
    ESX.PlayerData.job = job
end)
```

**Don't:**
Call `ESX.GetPlayerData()` inside loops.

## 4. Secure Net Events

**Do:**
Use `ESX.RegisterServerCallback` for sensitive data retrieval or `ESX.SecureNetEvent` if available. Validate all inputs.

**Don't:**
Trust client-sent values for money or items without validation.

## 5. Database Interaction

**Do:**
Use `oxmysql` (or `mysql-async` wrapper) with parameterized queries.
```lua
MySQL.query('SELECT * FROM users WHERE identifier = ?', { identifier })
```

**Don't:**
Concatenate strings into SQL queries (SQL Injection risk).

## 6. Optimization

**Do:**
Use dynamic sleep in threads.
```lua
local sleep = 1000
if dist < 10 then sleep = 0 end
Wait(sleep)
```

**Don't:**
Run `Wait(0)` loops constantly when not needed.
