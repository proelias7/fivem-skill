# Exemplos de Código — vRP Creative Network

## 1. Setup Básico de Resource (Server-side)

```lua
local Proxy = module("vrp", "lib/Proxy")
local Tunnel = module("vrp", "lib/Tunnel")

vRP = Proxy.getInterface("vRP")
vRPC = Tunnel.getInterface("vRP")

-- Suas funções locais
local myResource = {}
local myTunnel = {}

Proxy.addInterface("meu_resource", myResource)
Tunnel.bindInterface("meu_resource", myTunnel)
```

## 2. Setup Básico de Resource (Client-side)

```lua
local Tunnel = module("vrp", "lib/Tunnel")
local Proxy = module("vrp", "lib/Proxy")

vRPS = Tunnel.getInterface("vRP")

local myTunnel = {}
Tunnel.bindInterface("meu_resource", myTunnel)
```

## 3. Comando com Verificação de Permissão

```lua
RegisterCommand("daritem", function(source, args)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end

    -- Verifica se é admin
    if not vRP.HasPermission(tostring(Passport), "Admin") then
        TriggerClientEvent("Notify", source, "negado", "Sem permissão.", false, 5000)
        return
    end

    local targetPassport = parseInt(args[1])
    local item = args[2]
    local amount = parseInt(args[3])

    if targetPassport > 0 and item and amount > 0 then
        local targetSource = vRP.Source(targetPassport)
        if targetSource then
            vRP.GenerateItem(targetPassport, item, amount, true)
            TriggerClientEvent("Notify", source, "success", "Item entregue.", false, 5000)
        end
    end
end)
```

## 4. Sistema de Loja Simples

```lua
local Proxy = module("vrp", "lib/Proxy")
vRP = Proxy.getInterface("vRP")

local Products = {
    { item = "water",       price = 50,   name = "Água" },
    { item = "barracereal", price = 100,  name = "Barra de Cereal" },
    { item = "medkit",      price = 500,  name = "Kit Médico" },
}

RegisterServerEvent("loja:comprar")
AddEventHandler("loja:comprar", function(index)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end

    local product = Products[index]
    if not product then return end

    -- Verifica limite de item
    if vRP.MaxItens(Passport, product.item, 1) then
        TriggerClientEvent("Notify", source, "important", "Limite atingido.", false, 5000)
        return
    end

    -- Verifica peso
    if vRP.InventoryWeight(Passport) + itemWeight(product.item) > vRP.GetWeight(Passport) then
        TriggerClientEvent("Notify", source, "important", "Inventário cheio.", false, 5000)
        return
    end

    -- Tenta pagar
    if vRP.PaymentFull(Passport, product.price) then
        vRP.GenerateItem(Passport, product.item, 1, true)
        TriggerClientEvent("Notify", source, "success", "Comprou <b>" .. product.name .. "</b>.", false, 5000)
    else
        TriggerClientEvent("Notify", source, "negado", "Dinheiro insuficiente.", false, 5000)
    end
end)
```

## 5. Blip e Marker Client-side

```lua
-- Criar blip no mapa
local blip = AddBlipForCoord(-1038.0, -2739.0, 20.0)
SetBlipSprite(blip, 52)
SetBlipScale(blip, 0.8)
SetBlipColour(blip, 2)
SetBlipAsShortRange(blip, true)
BeginTextCommandSetBlipName("STRING")
AddTextComponentString("Minha Loja")
EndTextCommandSetBlipName(blip)

-- Thread com marker e interação
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
                -- Mostra texto de ajuda
                BeginTextCommandDisplayHelp("STRING")
                AddTextComponentSubstringPlayerName("Pressione ~INPUT_CONTEXT~ para abrir a loja")
                EndTextCommandDisplayHelp(0, false, true, -1)

                if IsControlJustReleased(0, 38) then -- Tecla E
                    TriggerEvent("loja:abrir")
                end
            end
        end

        Wait(sleep)
    end
end)
```

## 6. NUI Básica

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
        <h1>Minha Interface</h1>
        <button id="fechar">Fechar</button>
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

document.getElementById("fechar").addEventListener("click", function() {
    fetch("https://" + GetParentResourceName() + "/fechar", {
        method: "POST",
        body: JSON.stringify({})
    });
    document.getElementById("container").style.display = "none";
});

// Fechar com ESC
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        fetch("https://" + GetParentResourceName() + "/fechar", {
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

function AbrirNUI(data)
    if not isOpen then
        isOpen = true
        SetNuiFocus(true, true)
        SendNUIMessage({ action = "open", data = data })
    end
end

function FecharNUI()
    if isOpen then
        isOpen = false
        SetNuiFocus(false, false)
        SendNUIMessage({ action = "close" })
    end
end

RegisterNUICallback("fechar", function(data, cb)
    FecharNUI()
    cb("ok")
end)
```

## 7. Ponto de Serviço (Toggle de Trabalho)

```lua
-- Server-side
RegisterServerEvent("emprego:ponto")
AddEventHandler("emprego:ponto", function()
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end

    if vRP.HasGroup(tostring(Passport), "Police") then
        vRP.ServiceToggle(source, Passport, "Police")
    else
        TriggerClientEvent("Notify", source, "negado", "Você não faz parte da polícia.", false, 5000)
    end
end)
```

## 8. Webhook de Log

```lua
-- Usando o resource webhook
exports["webhook"]:Send("logs-vendas", "Venda Realizada", {
    { name = "**Vendedor:**", value = tostring(vendedorPassport) },
    { name = "**Comprador:**", value = tostring(compradorPassport) },
    { name = "**Item:**", value = itemName },
    { name = "**Valor:**", value = "R$ " .. parseFormat(valor) },
    { name = "**Data:**", value = os.date("%d/%m/%Y %H:%M:%S") },
})
```

## 9. Progressbar com Taskbar

```lua
-- Server-side: usar a taskbar
local function Coletar(source, Passport)
    -- Inicia barra de progresso (retorna true quando completa)
    if vRP.Task(source, 100, 1) then
        vRP.GenerateItem(Passport, "wood", 5, true)
        TriggerClientEvent("Notify", source, "success", "Coletou <b>5x Madeira</b>.", false, 5000)
    end
end
```

## 10. Request (Confirmação do Jogador)

```lua
-- Server-side: pede confirmação ao jogador
local accepted = vRP.Request(source, "Confirmar", "Deseja vender este item?")
if accepted then
    -- Jogador aceitou
    vRP.TakeItem(Passport, "diamonds", 1, true)
    vRP.GiveBank(Passport, 5000)
else
    -- Jogador recusou
    TriggerClientEvent("Notify", source, "important", "Venda cancelada.", false, 5000)
end
```

## 11. Salvar Dados Customizados por Jogador

```lua
-- Salvar
local meusDados = { nivel = 5, xp = 1500, quests = { "quest1", "quest2" } }
vRP.setUData(Passport, "meu_resource:dados", json.encode(meusDados))

-- Carregar
local dados = vRP.UserData(Passport, "meu_resource:dados")
if dados and dados.nivel then
    print("Nível: " .. dados.nivel)
end
```

## 12. Verificação de Proximidade Server-side

```lua
-- Usando Tunnel para chamar ClosestPed no client
local closestSource = vRPC.ClosestPed(source, 3.0) -- raio de 3 metros
if closestSource then
    local closestPassport = vRP.Passport(closestSource)
    -- Fazer algo com o jogador próximo
end
```

## 13. Criação de Ped NPC

```lua
-- Server-side via Tunnel
local success, netId = tvRP.CreatePed(source, "a_m_m_business_01", x, y, z, heading, 4)
if success then
    -- netId pode ser usado para referência
end

-- Client-side direto
local model = GetHashKey("a_m_m_business_01")
RequestModel(model)
while not HasModelLoaded(model) do Wait(1) end
local ped = CreatePed(4, model, x, y, z, heading, false, true)
SetEntityInvincible(ped, true)
FreezeEntityPosition(ped, true)
SetBlockingOfNonTemporaryEvents(ped, true)
```
