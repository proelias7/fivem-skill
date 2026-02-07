# Code Examples — vRP Creative Network

## 1. Basic Resource Setup (Server-side)

```lua
local Proxy = module("vrp", "lib/Proxy")
local Tunnel = module("vrp", "lib/Tunnel")

vRP = Proxy.getInterface("vRP")
vRPC = Tunnel.getInterface("vRP")

-- Your local functions
local myResource = {}
local myTunnel = {}

Proxy.addInterface("my_resource", myResource)
Tunnel.bindInterface("my_resource", myTunnel)
```

## 2. Basic Resource Setup (Client-side)

```lua
local Tunnel = module("vrp", "lib/Tunnel")
local Proxy = module("vrp", "lib/Proxy")

vRPS = Tunnel.getInterface("vRP")

local myTunnel = {}
Tunnel.bindInterface("my_resource", myTunnel)
```

## 3. Command with Permission Check

```lua
RegisterCommand("giveitem", function(source, args)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end

    -- Check if admin
    if not vRP.HasPermission(tostring(Passport), "Admin") then
        TriggerClientEvent("Notify", source, "negado", "No permission.", false, 5000)
        return
    end

    local targetPassport = parseInt(args[1])
    local item = args[2]
    local amount = parseInt(args[3])

    if targetPassport > 0 and item and amount > 0 then
        local targetSource = vRP.Source(targetPassport)
        if targetSource then
            vRP.GenerateItem(targetPassport, item, amount, true)
            TriggerClientEvent("Notify", source, "success", "Item delivered.", false, 5000)
        end
    end
end)
```

## 4. Simple Shop System

```lua
local Proxy = module("vrp", "lib/Proxy")
vRP = Proxy.getInterface("vRP")

local Products = {
    { item = "water",       price = 50,   name = "Water" },
    { item = "cerealbar",   price = 100,  name = "Cereal Bar" },
    { item = "medkit",      price = 500,  name = "Medical Kit" },
}

RegisterServerEvent("shop:buy")
AddEventHandler("shop:buy", function(index)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end

    local product = Products[index]
    if not product then return end

    -- Check item limit
    if vRP.MaxItens(Passport, product.item, 1) then
        TriggerClientEvent("Notify", source, "important", "Limit reached.", false, 5000)
        return
    end

    -- Check weight
    if vRP.InventoryWeight(Passport) + itemWeight(product.item) > vRP.GetWeight(Passport) then
        TriggerClientEvent("Notify", source, "important", "Inventory full.", false, 5000)
        return
    end

    -- Try to pay
    if vRP.PaymentFull(Passport, product.price) then
        vRP.GenerateItem(Passport, product.item, 1, true)
        TriggerClientEvent("Notify", source, "success", "Bought <b>" .. product.name .. "</b>.", false, 5000)
    else
        TriggerClientEvent("Notify", source, "negado", "Insufficient money.", false, 5000)
    end
end)
```

## 5. Client-side Blip and Marker

```lua
-- Create blip on map
local blip = AddBlipForCoord(-1038.0, -2739.0, 20.0)
SetBlipSprite(blip, 52)
SetBlipScale(blip, 0.8)
SetBlipColour(blip, 2)
SetBlipAsShortRange(blip, true)
BeginTextCommandSetBlipName("STRING")
AddTextComponentString("My Shop")
EndTextCommandSetBlipName(blip)

-- Thread with marker and interaction
local shopCoords = vector3(-1038.0, -2739.0, 20.0)

CreateThread(function()
    while true do
        local sleep = 1000
        local ped = PlayerPedId()
        local coords = GetEntityCoords(ped)
        local dist = #(coords - shopCoords)

        if dist < 20.0 then
            sleep = 0
            DrawMarker(1, shopCoords.x, shopCoords.y, shopCoords.z - 1.0, 0, 0, 0, 0, 0, 0, 1.0, 1.0, 0.5, 0, 255, 0, 100, false, false, 2, false)

            if dist < 1.5 then
                -- Show help text
                BeginTextCommandDisplayHelp("STRING")
                AddTextComponentSubstringPlayerName("Press ~INPUT_CONTEXT~ to open store")
                EndTextCommandDisplayHelp(0, false, true, -1)

                if IsControlJustReleased(0, 38) then -- E key
                    TriggerEvent("shop:open")
                end
            end
        end

        Wait(sleep)
    end
end)
```

## 6. Basic NUI

### fxmanifest.lua

```lua
fx_version "cerulean"
game "gta5"
lua54 "yes"

shared_scripts {
    "@vrp/lib/Utils.lua",
}

client_scripts {
    "client/*.lua",
}

server_scripts {
    "server/*.lua",
}

ui_page "html/index.html"

files {
    "html/index.html",
    "html/style.css",
    "html/script.js",
}
```

### html/index.html

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="container" style="display:none;">
        <h1>My Interface</h1>
        <button id="close">Close</button>
    </div>
    <script src="script.js"></script>
</body>
</html>
```

### html/script.js

```javascript
window.addEventListener("message", function(event) {
    if (event.data.action === "open") {
        document.getElementById("container").style.display = "flex";
    }
    if (event.data.action === "close") {
        document.getElementById("container").style.display = "none";
    }
});

document.getElementById("close").addEventListener("click", function() {
    fetch("https://" + GetParentResourceName() + "/close", {
        method: "POST",
        body: JSON.stringify({})
    });
    document.getElementById("container").style.display = "none";
});

// Close with ESC
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        fetch("https://" + GetParentResourceName() + "/close", {
            method: "POST",
            body: JSON.stringify({})
        });
        document.getElementById("container").style.display = "none";
    }
});
```

### client/main.lua

```lua
local isOpen = false

function OpenNUI(data)
    if not isOpen then
        isOpen = true
        SetNuiFocus(true, true)
        SendNUIMessage({ action = "open", data = data })
    end
end

function CloseNUI()
    if isOpen then
        isOpen = false
        SetNuiFocus(false, false)
        SendNUIMessage({ action = "close" })
    end
end

RegisterNUICallback("close", function(data, cb)
    CloseNUI()
    cb("ok")
end)
```

## 7. Service Point (Job Toggle)

```lua
-- Server-side
RegisterServerEvent("job:toggle")
AddEventHandler("job:toggle", function()
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end

    if vRP.HasGroup(tostring(Passport), "Police") then
        vRP.ServiceToggle(source, Passport, "Police")
    else
        TriggerClientEvent("Notify", source, "negado", "You are not part of the police.", false, 5000)
    end
end)
```

## 8. Log Webhook

```lua
-- Using webhook resource
exports["webhook"]:Send("sales-logs", "Sale Made", {
    { name = "**Seller:**", value = tostring(sellerPassport) },
    { name = "**Buyer:**", value = tostring(buyerPassport) },
    { name = "**Item:**", value = itemName },
    { name = "**Value:**", value = "$ " .. parseFormat(value) },
    { name = "**Date:**", value = os.date("%d/%m/%Y %H:%M:%S") },
})
```

## 9. Progressbar with Taskbar

```lua
-- Server-side: use taskbar
local function Collect(source, Passport)
    -- Starts progress bar (returns true when complete)
    if vRP.Task(source, 100, 1) then
        vRP.GenerateItem(Passport, "wood", 5, true)
        TriggerClientEvent("Notify", source, "success", "Collected <b>5x Wood</b>.", false, 5000)
    end
end
```

## 10. Request (Player Confirmation)

```lua
-- Server-side: asks player for confirmation
local accepted = vRP.Request(source, "Confirm", "Do you want to sell this item?")
if accepted then
    -- Player accepted
    vRP.TakeItem(Passport, "diamonds", 1, true)
    vRP.GiveBank(Passport, 5000)
else
    -- Player refused
    TriggerClientEvent("Notify", source, "important", "Sale cancelled.", false, 5000)
end
```

## 11. Custom Player Data Saving

```lua
-- Save
local myData = { level = 5, xp = 1500, quests = { "quest1", "quest2" } }
vRP.setUData(Passport, "my_resource:data", json.encode(myData))

-- Load
local data = vRP.UserData(Passport, "my_resource:data")
if data and data.level then
    print("Level: " .. data.level)
end
```

## 12. Server-side Proximity Check

```lua
-- Using Tunnel to call ClosestPed on client
local closestSource = vRPC.ClosestPed(source, 3.0) -- 3 meters radius
if closestSource then
    local closestPassport = vRP.Passport(closestSource)
    -- Do something with closest player
end
```

## 13. NPC Ped Creation

```lua
-- Server-side via Tunnel
local success, netId = tvRP.CreatePed(source, "a_m_m_business_01", x, y, z, heading, 4)
if success then
    -- netId can be used for reference
end

-- Client-side direct
local model = GetHashKey("a_m_m_business_01")
RequestModel(model)
while not HasModelLoaded(model) do Wait(1) end
local ped = CreatePed(4, model, x, y, z, heading, false, true)
SetEntityInvincible(ped, true)
FreezeEntityPosition(ped, true)
SetBlockingOfNonTemporaryEvents(ped, true)
```
