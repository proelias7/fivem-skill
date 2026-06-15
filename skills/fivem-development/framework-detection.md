# Framework Auto-Detection

> Automatically detect the active framework from project files

## Detection Priority

### 1. Check fxmanifest.lua Dependencies

```lua
-- vRP
dependency 'vrp'

-- QBox
dependency 'qbx_core'
shared_script '@qbx_core/import.lua'

-- QBCore
dependency 'qb-core'
shared_script '@qb-core/shared/locale.lua'

-- ESX Legacy
dependency 'es_extended'
dependency 'esx_core'
shared_script '@es_extended/imports.lua'
```

### 2. Check Code Patterns

```lua
-- vRP patterns
local Proxy = module("vrp", "lib/Proxy")
vRP = Proxy.getInterface("vRP")
vRP.Passport(source)

-- QBox patterns
exports.qbx_core:GetCoreObject()
lib.callback

-- QBCore patterns
exports['qb-core']:GetCoreObject()
QBCore.Functions
QBCore.Player

-- ESX patterns
exports.es_extended:getSharedObject()
ESX.GetPlayerData()
xPlayer:getMoney()
```

### 3. Check Resource State

```lua
local function DetectFramework()
    local vrp = GetResourceState('vrp')
    local qbx = GetResourceState('qbx_core')
    local qb = GetResourceState('qb-core')
    local esx = GetResourceState('es_extended')

    if vrp == 'started' or vrp == 'starting' then
        return 'vrp'
    elseif qbx == 'started' or qbx == 'starting' then
        return 'qbox'
    elseif qb == 'started' or qb == 'starting' then
        return 'qbcore'
    elseif esx == 'started' or esx == 'starting' then
        return 'esx'
    end

    return nil
end
```

---

## Framework Compatibility Notes

### QBox ↔ QBCore

- QBox maintains **backwards compatibility** with QBCore
- QBCore resources often work on QBox without changes
- QBox uses `qbx_core` resource name vs `qb-core`
- QBox prefers ox_lib for utilities

### ESX vs QB Family

- Different event naming conventions
- Different player object structure
- ESX uses `xPlayer`, QB uses `Player.Functions`
- Money handling differs significantly

### vRP vs Others

- Uses Passport (character ID) instead of source for most operations
- Proxy/Tunnel communication instead of exports/callbacks
- See skill `vrp-framework` for full API

---

## Multi-Framework Bridge Pattern

```lua
-- bridge.lua — Framework abstraction layer
local Bridge = {}
local Proxy = module("vrp", "lib/Proxy")

local function DetectFramework()
    local vrp = GetResourceState('vrp')
    local qbx = GetResourceState('qbx_core')
    local qb = GetResourceState('qb-core')
    local esx = GetResourceState('es_extended')

    if vrp == 'started' or vrp == 'starting' then
        return 'vrp', Proxy.getInterface("vRP")
    elseif qbx == 'started' or qbx == 'starting' then
        return 'qbox', exports.qbx_core:GetCoreObject()
    elseif qb == 'started' or qb == 'starting' then
        return 'qbcore', exports['qb-core']:GetCoreObject()
    elseif esx == 'started' or esx == 'starting' then
        return 'esx', exports.es_extended:getSharedObject()
    end
    return nil, nil
end

local frameworkType, core = DetectFramework()
Bridge.Type = frameworkType
Bridge.Core = core

function Bridge.GetPlayerMoney(source)
    if Bridge.Type == 'vrp' then
        local Passport = Bridge.Core.Passport(source)
        if not Passport then return 0 end
        return Bridge.Core.GetBank(source) or 0
    elseif Bridge.Type == 'qbox' or Bridge.Type == 'qbcore' then
        local Player = Bridge.Core.Functions.GetPlayer(source)
        if not Player then return 0 end
        return Player.Functions.GetMoney('cash')
    elseif Bridge.Type == 'esx' then
        local xPlayer = Bridge.Core.GetPlayerFromId(source)
        if not xPlayer then return 0 end
        return xPlayer.getMoney()
    end
    return 0
end

function Bridge.AddMoney(source, amount)
    if Bridge.Type == 'vrp' then
        local Passport = Bridge.Core.Passport(source)
        if not Passport then return end
        Bridge.Core.GiveBank(Passport, amount)
    elseif Bridge.Type == 'qbox' or Bridge.Type == 'qbcore' then
        local Player = Bridge.Core.Functions.GetPlayer(source)
        if not Player then return end
        Player.Functions.AddMoney('cash', amount)
    elseif Bridge.Type == 'esx' then
        local xPlayer = Bridge.Core.GetPlayerFromId(source)
        if not xPlayer then return end
        xPlayer.addMoney(amount)
    end
end

return Bridge
```

---

## Grep Commands for Detection

```bash
# Find framework dependencies
grep -r "dependency.*vrp\|dependency.*qbx_core\|dependency.*qb-core\|dependency.*es_extended" .

# Find framework imports
grep -r "GetCoreObject\|getSharedObject\|Proxy.getInterface" .

# Find framework events
grep -r "QBCore\.\|ESX\.\|vRP\.\|qbx" .
```

---

## Framework Skills Reference

| Detected Framework | Skill to Read |
|--------------------|---------------|
| `vrp` | `vrp-framework` |
| `qbcore` | `qbcore-framework` |
| `qbox` | `qbox-framework` |
| `esx` | `esx-framework` |
