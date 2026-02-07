# Patterns and Conventions — vRP Creative Network

## Naming Conventions

### Functions

| Context | Pattern | Example |
|----------|--------|---------|
| Server-side functions (Proxy) | `PascalCase` in `vRP` object | `vRP.GetBank(source)` |
| Tunnel functions (server→client) | `PascalCase` in `tvRP` object | `tvRP.ClosestPed(Radius)` |
| Tunnel functions (client→server) | `PascalCase` in `vRPS`/`vRPC` object | `vRPS.Passport(source)` |
| Local functions | `PascalCase` or `camelCase` | `ClearInvRespawn()` |
| NUI Callbacks | `camelCase` | `RegisterNUICallback("close", ...)` |

### Variables

| Context | Pattern | Example |
|----------|--------|---------|
| Player variables | `PascalCase` | `Passport`, `Source`, `Datatable` |
| Local variables | `PascalCase` | `Amount`, `Inventory`, `Weight` |
| Configurations | `PascalCase` | `BackpackWeightDefault`, `SpawnCoords` |
| Global tables | `PascalCase` | `Characters`, `Sources`, `Groups` |
| Constants | `UPPER_SNAKE_CASE` | `COOLDOWN_TIME` |

### Files

| Type | Pattern | Example |
|------|--------|---------|
| Server modules | `lowercase.lua` | `money.lua`, `inventory.lua` |
| Client scripts | `lowercase.lua` | `base.lua`, `gui.lua` |
| Configurations | `PascalCase.lua` | `Global.lua`, `Groups.lua` |
| HTML/CSS/JS | `lowercase` | `index.html`, `style.css`, `script.js` |

### Prepared Queries

Format: `"table/Action"` — PascalCase in action.

```lua
vRP.Prepare("characters/Person", "SELECT * FROM characters WHERE id = @id")
vRP.Prepare("vehicles/addVehicles", "INSERT INTO vehicles ...")
vRP.Prepare("entitydata/GetData", "SELECT * FROM entitydata WHERE dkey = @dkey")
```

## Folder Structure

```
my-resource/
├── fxmanifest.lua        # Manifest (mandatory)
├── config/               # Shared configurations
│   └── config.lua
├── client/               # Client-side scripts
│   └── main.lua
├── server/               # Server-side scripts
│   └── main.lua
└── html/                 # NUI (if necessary)
    ├── index.html
    ├── style.css
    └── script.js
```

For larger resources:

```
my-resource/
├── fxmanifest.lua
├── config/
│   ├── config.lua
│   └── items.lua
├── client/
│   ├── main.lua
│   ├── nui.lua           # Separate NUI control
│   └── utils.lua         # Client utilities
├── server/
│   ├── main.lua
│   ├── commands.lua      # Separate commands
│   └── prepare.lua       # Prepared queries
└── html/
    ├── index.html
    ├── style.css
    └── script.js
```

## Code Patterns

### 1. Always Validate Passport

```lua
-- CORRECT
RegisterServerEvent("my:event")
AddEventHandler("my:event", function(data)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end
    -- safe logic
end)

-- WRONG: does not validate passport
AddEventHandler("my:event", function(data)
    -- code without checking if player exists
end)
```

### 2. Always Capture Source Correctly

```lua
-- CORRECT: capture source on the first line
AddEventHandler("my:event", function()
    local source = source
    -- ...
end)

-- For Tunnel callbacks:
function cln.MyFunction(data)
    local source = source  -- always on first line
    local Passport = vRP.Passport(source)
    if not Passport then return end
    -- ...
end
```

### 3. Use parseInt for Numeric Values

```lua
-- CORRECT
local amount = parseInt(args[1])
if amount > 0 then
    vRP.GiveBank(Passport, amount)
end

-- WRONG: tonumber can return nil or negative
local amount = tonumber(args[1])
vRP.GiveBank(Passport, amount) -- can crash
```

### 4. Verify Existence Before Accessing

```lua
-- CORRECT
if Characters[source] then
    local bank = Characters[source]["bank"]
end

-- CORRECT with Datatable
local Datatable = vRP.Datatable(Passport)
if Datatable then
    Datatable.Pos = { x = x, y = y, z = z }
end
```

### 5. Optimize Client-side Threads

```lua
-- CORRECT: dynamic sleep based on distance
CreateThread(function()
    while true do
        local sleep = 1000
        local ped = PlayerPedId()
        local coords = GetEntityCoords(ped)
        local dist = #(coords - targetCoords)

        if dist < 50.0 then
            sleep = 500
        end
        if dist < 20.0 then
            sleep = 0  -- DrawMarker needs tick-rate
            DrawMarker(...)
        end

        Wait(sleep)
    end
end)

-- WRONG: loop always running at 0ms
CreateThread(function()
    while true do
        DrawMarker(...)  -- even far away, runs every frame
        Wait(0)
    end
end)
```

### 6. Separate Client and Server Logic

```lua
-- WRONG: business logic on client
-- client/main.lua
RegisterNUICallback("buy", function(data, cb)
    -- DO NOT process buying logic on client!
    cb("ok")
end)

-- CORRECT: client only sends, server processes
-- client/main.lua
RegisterNUICallback("buy", function(data, cb)
    SRC.Buy(data.item, data.amount)  -- sends to server via Tunnel
    cb("ok")
end)

-- server/main.lua
function cln.Buy(item, amount)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end
    -- all logic here (validation, payment, delivery)
end
```

## Security Patterns

### 1. Never Trust the Client

```lua
-- WRONG: accept price from client
function cln.Buy(item, price)
    local source = source
    vRP.RemoveBank(Passport, price) -- client can send price 0
end

-- CORRECT: use server price
function cln.Buy(item)
    local source = source
    local Passport = vRP.Passport(source)
    local price = Config.Prices[item]
    if not price then return end
    if vRP.PaymentFull(Passport, price) then
        vRP.GenerateItem(Passport, item, 1, true)
    end
end
```

### 2. Validate All Inputs

```lua
function cln.Transfer(targetPassport, amount)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end

    targetPassport = parseInt(targetPassport)
    amount = parseInt(amount)

    if amount <= 0 then return end
    if targetPassport <= 0 then return end
    if targetPassport == Passport then return end  -- do not transfer to self
    if not vRP.Source(targetPassport) then return end  -- target online

    -- now safe to proceed
end
```

### 3. SafeEvent (Server-side) for Advantage Actions

```lua
-- Every event that gives money/item/advantage MUST use SafeEvent
-- API: exports["cerberus"]:SafeEvent(source, eventName, options)
if exports["cerberus"]:SafeEvent(source, "shop:buy", {
    time = 10,
    position = true,
    positionDist = 2
}) then
    return
end
```

### 4. SetCooldown (Client-side) for Normal Actions

```lua
-- Repetitive actions on CLIENT use SetCooldown (time in milliseconds)
-- API: exports["cerberus"]:SetCooldown(name, timeMs, hits?)
if exports["cerberus"]:SetCooldown("menu:open", 2000) then
    return  -- blocked + automatic notification
end

-- Hit-based mode: allows 3 attempts before blocking
if exports["cerberus"]:SetCooldown("use:item", 3000, 3) then
    return
end
```

### 5. Use RegisterServerEvent for Events

```lua
RegisterServerEvent("my:event")
AddEventHandler("my:event", function(data)
    local source = source
    -- ...
end)
```

> For detailed security (Cerberus SafeEvent, SetCooldown, anti-exploit), see [best-practices.md](best-practices.md)

## Performance Patterns

### 1. Tunnel vs Events

```lua
-- CORRECT: no return → Event (lighter)
TriggerServerEvent("airdrop:start")

-- CORRECT: needs return → Tunnel
local inventory = vSERVER.getUserInventory()

-- WRONG: Tunnel without using return
vSERVER.startEvent()
```

### 2. Calls in Same Environment = Direct Function

```lua
-- WRONG
TriggerEvent("garages:tryDelete", vehNet, vehPlate)

-- CORRECT
tryDelete(vehNet, vehPlate)
```

### 3. In-Memory Cache

```lua
-- CORRECT: use Characters[] instead of query
if Characters[source] then
    local bank = Characters[source]["bank"]
end

-- For repeated queries: use cacheaside
local data = exports.cacheaside:Get("namespace", key, {
    query = { "SELECT ...", { params } },
    default = {}
})
```

### 4. No Remote Calls in Loops

```lua
-- WRONG
while true do
    vSERVER.updatePosition()
    Wait(100)
end

-- CORRECT: send only when changed
local lastPosition = nil
while true do
    local pos = GetEntityCoords(ped)
    if not lastPosition or #(pos - lastPosition) > 10.0 then
        TriggerServerEvent("player:position", pos)
        lastPosition = pos
    end
    Wait(100)
end
```

### 5. Lookup Tables > if/elseif Chains

```lua
-- WRONG
if type == "bronze" then return 100
elseif type == "silver" then return 250 end

-- CORRECT (O(1))
local rewards = { bronze = 100, silver = 250, gold = 500 }
return rewards[type] or 0
```

### 6. Protect Against nil in Concatenation

```lua
-- WRONG: crash if nil
"Name: " .. Identity.name

-- CORRECT
"Name: " .. (Identity.name or "Unknown")
```

> For detailed performance and optimization, see [best-practices.md](best-practices.md)

## fxmanifest.lua Patterns

```lua
fx_version "cerulean"  -- or "bodacious" as vRP uses
game "gta5"
lua54 "yes"            -- ALWAYS use Lua 5.4

-- Recommended order:
-- 1. shared_scripts (configs + utils)
-- 2. client_scripts
-- 3. server_scripts
-- 4. ui_page + files (NUI)

shared_scripts {
    "@vrp/lib/Utils.lua",  -- always include to use module(), parseInt, etc.
    "config/*.lua",
}

client_scripts {
    "client/*.lua",
}

server_scripts {
    "server/*.lua",
}
```

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|-------------|----------|---------|
| `Wait(0)` without distance condition | Wastes CPU unnecessarily | Dynamic sleep |
| Business logic on client | Can be exploited | Move to server |
| Query inside loop | Slow, overloads DB | Cache or batch |
| Not capturing `source` on first line | Source can change | `local source = source` |
| Not validating Passport | Crash or exploit | Always verify |
| Using `tonumber` without fallback | Returns nil | Use `parseInt()` |
| Trusting client data | Security compromised | Validate on server |
| Registering events without `RegisterServerEvent` | Vulnerable to spoofing | Always register |
| Not clearing timers/threads | Memory leak | Manage lifecycle |
