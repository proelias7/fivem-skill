# Padrões e Convenções — vRP Creative Network

## Convenções de Nomenclatura

### Funções

| Contexto | Padrão | Exemplo |
|----------|--------|---------|
| Funções server-side (Proxy) | `PascalCase` no objeto `vRP` | `vRP.GetBank(source)` |
| Funções Tunnel (server→client) | `PascalCase` no objeto `tvRP` | `tvRP.ClosestPed(Radius)` |
| Funções Tunnel (client→server) | `PascalCase` no objeto `vRPS`/`vRPC` | `vRPS.Passport(source)` |
| Funções locais | `PascalCase` ou `camelCase` | `ClearInvRespawn()` |
| Callbacks NUI | `camelCase` | `RegisterNUICallback("fechar", ...)` |

### Variáveis

| Contexto | Padrão | Exemplo |
|----------|--------|---------|
| Variáveis de jogador | `PascalCase` | `Passport`, `Source`, `Datatable` |
| Variáveis locais | `PascalCase` | `Amount`, `Inventory`, `Weight` |
| Configurações | `PascalCase` | `BackpackWeightDefault`, `SpawnCoords` |
| Tabelas globais | `PascalCase` | `Characters`, `Sources`, `Groups` |
| Constantes | `UPPER_SNAKE_CASE` | `COOLDOWN_TIME` |

### Arquivos

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Módulos server | `lowercase.lua` | `money.lua`, `inventory.lua` |
| Scripts client | `lowercase.lua` | `base.lua`, `gui.lua` |
| Configurações | `PascalCase.lua` | `Global.lua`, `Groups.lua` |
| HTML/CSS/JS | `lowercase` | `index.html`, `style.css`, `script.js` |

### Queries Preparadas

Formato: `"tabela/Ação"` — PascalCase na ação.

```lua
vRP.Prepare("characters/Person", "SELECT * FROM characters WHERE id = @id")
vRP.Prepare("vehicles/addVehicles", "INSERT INTO vehicles ...")
vRP.Prepare("entitydata/GetData", "SELECT * FROM entitydata WHERE dkey = @dkey")
```

## Estrutura de Pastas

```
meu-resource/
├── fxmanifest.lua        # Manifesto (obrigatório)
├── config/               # Configurações compartilhadas
│   └── config.lua
├── client/               # Scripts client-side
│   └── main.lua
├── server/               # Scripts server-side
│   └── main.lua
└── html/                 # NUI (se necessário)
    ├── index.html
    ├── style.css
    └── script.js
```

Para resources maiores:

```
meu-resource/
├── fxmanifest.lua
├── config/
│   ├── config.lua
│   └── items.lua
├── client/
│   ├── main.lua
│   ├── nui.lua           # Controle de NUI separado
│   └── utils.lua         # Utilitários client
├── server/
│   ├── main.lua
│   ├── commands.lua       # Comandos separados
│   └── prepare.lua        # Queries preparadas
└── html/
    ├── index.html
    ├── style.css
    └── script.js
```

## Padrões de Código

### 1. Sempre Validar Passport

```lua
-- CORRETO
RegisterServerEvent("meu:evento")
AddEventHandler("meu:evento", function(data)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end
    -- lógica segura
end)

-- ERRADO: não valida passport
AddEventHandler("meu:evento", function(data)
    -- código sem verificar se o jogador existe
end)
```

### 2. Sempre Capturar Source Corretamente

```lua
-- CORRETO: capturar source na primeira linha
AddEventHandler("meu:evento", function()
    local source = source
    -- ...
end)

-- Para Tunnel callbacks:
function cln.MinhaFuncao(data)
    local source = source  -- sempre na primeira linha
    local Passport = vRP.Passport(source)
    if not Passport then return end
    -- ...
end
```

### 3. Usar parseInt para Valores Numéricos

```lua
-- CORRETO
local amount = parseInt(args[1])
if amount > 0 then
    vRP.GiveBank(Passport, amount)
end

-- ERRADO: tonumber pode retornar nil ou negativo
local amount = tonumber(args[1])
vRP.GiveBank(Passport, amount) -- pode crashar
```

### 4. Verificar Existência Antes de Acessar

```lua
-- CORRETO
if Characters[source] then
    local bank = Characters[source]["bank"]
end

-- CORRETO com Datatable
local Datatable = vRP.Datatable(Passport)
if Datatable then
    Datatable.Pos = { x = x, y = y, z = z }
end
```

### 5. Otimizar Threads Client-side

```lua
-- CORRETO: sleep dinâmico baseado em distância
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
            sleep = 0  -- DrawMarker precisa de tick-rate
            DrawMarker(...)
        end

        Wait(sleep)
    end
end)

-- ERRADO: loop sempre rodando a 0ms
CreateThread(function()
    while true do
        DrawMarker(...)  -- mesmo longe, roda todo frame
        Wait(0)
    end
end)
```

### 6. Separar Lógica Client e Server

```lua
-- ERRADO: lógica de negócio no client
-- client/main.lua
RegisterNUICallback("comprar", function(data, cb)
    -- NÃO processe lógica de compra no client!
    cb("ok")
end)

-- CORRETO: client apenas envia, server processa
-- client/main.lua
RegisterNUICallback("comprar", function(data, cb)
    SRC.Comprar(data.item, data.quantidade)  -- envia para server via Tunnel
    cb("ok")
end)

-- server/main.lua
function cln.Comprar(item, quantidade)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end
    -- toda lógica aqui (validação, pagamento, entrega)
end
```

## Padrões de Segurança

### 1. Nunca Confiar no Client

```lua
-- ERRADO: aceitar preço do client
function cln.Comprar(item, preco)
    local source = source
    vRP.RemoveBank(Passport, preco) -- client pode mandar preço 0
end

-- CORRETO: usar preço do server
function cln.Comprar(item)
    local source = source
    local Passport = vRP.Passport(source)
    local preco = Config.Precos[item]
    if not preco then return end
    if vRP.PaymentFull(Passport, preco) then
        vRP.GenerateItem(Passport, item, 1, true)
    end
end
```

### 2. Validar Todos os Inputs

```lua
function cln.Transferir(targetPassport, amount)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end

    targetPassport = parseInt(targetPassport)
    amount = parseInt(amount)

    if amount <= 0 then return end
    if targetPassport <= 0 then return end
    if targetPassport == Passport then return end  -- não transferir para si mesmo
    if not vRP.Source(targetPassport) then return end  -- target online

    -- agora é seguro prosseguir
end
```

### 3. SafeEvent (Server-side) para Ações com Vantagem

```lua
-- Todo evento que dá dinheiro/item/vantagem DEVE usar SafeEvent
-- API: exports["cerberus"]:SafeEvent(source, eventName, options)
if exports["cerberus"]:SafeEvent(source, "loja:comprar", {
    time = 10,
    position = true,
    positionDist = 2
}) then
    return
end
```

### 4. SetCooldown (Client-side) para Ações Normais

```lua
-- Ações repetitivas no CLIENT usam SetCooldown (tempo em milissegundos)
-- API: exports["cerberus"]:SetCooldown(name, timeMs, hits?)
if exports["cerberus"]:SetCooldown("menu:abrir", 2000) then
    return  -- bloqueado + notifica automaticamente
end

-- Modo hit-based: permite 3 tentativas antes de bloquear
if exports["cerberus"]:SetCooldown("usar:item", 3000, 3) then
    return
end
```

### 5. Usar RegisterServerEvent para Eventos

```lua
RegisterServerEvent("meu:evento")
AddEventHandler("meu:evento", function(data)
    local source = source
    -- ...
end)
```

> Para segurança detalhada (Cerberus SafeEvent, SetCooldown, anti-exploit), veja [best-practices.md](best-practices.md)

## Padrões de Performance

### 1. Tunnel vs Eventos

```lua
-- CORRETO: sem retorno → Evento (mais leve)
TriggerServerEvent("airdrop:start")

-- CORRETO: precisa retorno → Tunnel
local inventario = vSERVER.getUserInventory()

-- ERRADO: Tunnel sem usar retorno
vSERVER.startEvent()
```

### 2. Chamadas no Mesmo Ambiente = Função Direta

```lua
-- ERRADO
TriggerEvent("garages:tryDelete", vehNet, vehPlate)

-- CORRETO
tryDelete(vehNet, vehPlate)
```

### 3. Cache em Memória

```lua
-- CORRETO: usar Characters[] em vez de query
if Characters[source] then
    local bank = Characters[source]["bank"]
end

-- Para consultas repetidas: usar cacheaside
local data = exports.cacheaside:Get("namespace", key, {
    query = { "SELECT ...", { params } },
    default = {}
})
```

### 4. Sem Chamadas Remotas em Loops

```lua
-- ERRADO
while true do
    vSERVER.atualizarPosicao()
    Wait(100)
end

-- CORRETO: enviar apenas quando muda
local ultimaPosicao = nil
while true do
    local pos = GetEntityCoords(ped)
    if not ultimaPosicao or #(pos - ultimaPosicao) > 10.0 then
        TriggerServerEvent("player:posicao", pos)
        ultimaPosicao = pos
    end
    Wait(100)
end
```

### 5. Tabelas de Lookup > Cadeias if/elseif

```lua
-- ERRADO
if tipo == "bronze" then return 100
elseif tipo == "prata" then return 250 end

-- CORRETO (O(1))
local premios = { bronze = 100, prata = 250, ouro = 500 }
return premios[tipo] or 0
```

### 6. Proteger Contra nil em Concatenação

```lua
-- ERRADO: crash se nil
"Nome: " .. Identity.name

-- CORRETO
"Nome: " .. (Identity.name or "Desconhecido")
```

> Para performance e otimização detalhada, veja [best-practices.md](best-practices.md)

## Padrões de fxmanifest.lua

```lua
fx_version "cerulean"  -- ou "bodacious" como a vRP usa
game "gta5"
lua54 "yes"            -- SEMPRE usar Lua 5.4

-- Ordem recomendada:
-- 1. shared_scripts (configs + utils)
-- 2. client_scripts
-- 3. server_scripts
-- 4. ui_page + files (NUI)

shared_scripts {
    "@vrp/lib/Utils.lua",  -- sempre incluir para usar module(), parseInt, etc.
    "config/*.lua",
}

client_scripts {
    "client/*.lua",
}

server_scripts {
    "server/*.lua",
}
```

## Anti-Padrões a Evitar

| Anti-Padrão | Problema | Solução |
|-------------|----------|---------|
| `Wait(0)` sem condição de distância | Consome CPU desnecessariamente | Sleep dinâmico |
| Lógica de negócio no client | Pode ser explorado | Mover para server |
| Query dentro de loop | Lento, sobrecarrega DB | Cache ou batch |
| Não capturar `source` na primeira linha | Source pode mudar | `local source = source` |
| Não validar Passport | Crash ou exploit | Sempre verificar |
| Usar `tonumber` sem fallback | Retorna nil | Usar `parseInt()` |
| Confiar em dados do client | Segurança comprometida | Validar no server |
| Registrar eventos sem `RegisterServerEvent` | Vulnerável a spoofing | Sempre registrar |
| Não limpar timers/threads | Memory leak | Gerenciar lifecycle |
