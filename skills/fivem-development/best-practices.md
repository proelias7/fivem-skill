# Boas Práticas — vRP Creative Network

**Autor:** Elias Araújo
**Foco:** Performance, Otimização e Segurança

---

## 1. Comunicação Client/Server

### 1.1 Tunnel vs Eventos — Regra de Ouro

> **Tunnel** = quando precisa de retorno
> **Evento** = quando NÃO precisa de retorno

**Hierarquia de performance (do mais leve ao mais pesado):**

| Método | Performance | Quando usar |
|--------|-------------|-------------|
| `TriggerServerEvent` | Mais leve | Ação sem retorno (preferido) |
| `vSERVER._funcao()` | Médio | Fire-and-forget via Tunnel (função já existe) |
| `vSERVER.funcao()` | Mais pesado | Quando precisa de retorno |

```lua
-- CORRETO: precisa de retorno → Tunnel
local inventario = vSERVER.getUserInventory()

-- CORRETO: NÃO precisa de retorno → Evento
TriggerServerEvent("airdrop:start")

-- EVITAR: Tunnel sem usar retorno (gera overhead desnecessário)
vSERVER.startEvent()
```

**Por que o Tunnel é mais pesado?** Cada chamada gera:
- Serialização de argumentos
- Criação de promessa (future)
- Alocação de callback
- Controle de timeout (30s)

**Problemas do Tunnel sem retorno:**
1. **Deadlocks** — vRP espera resposta que nunca virá
2. **Overhead** — custo alto para ação simples
3. **Saturação** — callbacks acumulados degradam a thread principal

### 1.2 Prefixo `_` (Fire-and-Forget)

```lua
-- COM underscore: não prepara callback
vSERVER._startEvent()

-- SEM underscore: prepara callback e espera retorno
vSERVER.startEvent()
```

Mesmo com `_`, o Tunnel ainda faz serialização e processamento RPC. **Evento nativo é sempre mais leve.**

### 1.3 Chamadas no Mesmo Ambiente

Usar eventos para chamar funções no mesmo ambiente (server→server) é desperdício.

```lua
-- ERRADO: evento no mesmo ambiente
TriggerEvent("garages:tryDelete", vehNet, vehPlate)

-- CORRETO: chamada direta de função
local function tryDelete(vehNet, vehPlate)
    -- lógica
end
tryDelete(vehNet, vehPlate)

-- Expor para outros contextos se necessário:
RegisterServerEvent("garages:tryDelete", tryDelete)  -- client→server
MeuTunnel.tryDelete = tryDelete                       -- tunnel
```

| Método | Ambiente | Performance |
|--------|----------|-------------|
| `funcao()` | Mesmo | Instantâneo |
| `TriggerEvent()` | Mesmo | Passa pela fila |
| `TriggerServerEvent()` | Client→Server | Rede + fila |
| `Tunnel` | Client↔Server | Rede + RPC |

### 1.4 Evite Chamadas Remotas em Loops

```lua
-- ERRADO: Tunnel em loop de alta frequência
while true do
    vSERVER.atualizarPosicao()
    Wait(100)
end

-- CORRETO: intervalo maior
while true do
    TriggerServerEvent("player:posicao", GetEntityCoords(ped))
    Wait(5000)
end

-- MELHOR: enviar apenas quando necessário
local ultimaPosicao = nil
while true do
    local pos = GetEntityCoords(ped)
    if ultimaPosicao == nil or #(pos - ultimaPosicao) > 10.0 then
        TriggerServerEvent("player:posicao", pos)
        ultimaPosicao = pos
    end
    Wait(100)
end

-- ALTERNATIVA: batch de dados
local posicoes = {}
while true do
    table.insert(posicoes, GetEntityCoords(ped))
    if #posicoes >= 10 then
        TriggerServerEvent("player:posicoes_batch", posicoes)
        posicoes = {}
    end
    Wait(100)
end
```

### 1.5 Sleep Dinâmico Obrigatório

**NUNCA use `Wait(0)` fixo.** Ajuste o sleep baseado no estado atual.

```lua
-- ERRADO
CreateThread(function()
    while true do
        Wait(0)  -- RODA 60x/s, SEMPRE
        if IsPedArmed(ped, 6) then
            DisableControlAction(1, 140, true)
        end
    end
end)

-- CORRETO
CreateThread(function()
    while true do
        local sleep = 1500
        local ped = PlayerPedId()
        if IsPedArmed(ped, 6) then
            sleep = 0  -- Armado: precisa rodar todo frame
            DisableControlAction(1, 140, true)
            DisableControlAction(1, 141, true)
            DisableControlAction(1, 142, true)
        end
        Wait(sleep)
    end
end)
```

**Tabela de Sleep Recomendado:**

| Situação | Sleep |
|----------|-------|
| Verificação constante (DisableControl, DrawText) | `0` |
| Player armado/em veículo | `0-10` |
| Verificação de estado (vida, posição) | `100-500` |
| Verificação ocasional (zona, clima) | `1000-2000` |
| Verificação rara (configs, permissões) | `5000+` |

### 1.6 Payloads em Eventos

Limites do FiveM:

| Tipo | Limite |
|------|--------|
| Evento único | ~16 KB (recomendado < 8 KB) |
| Buffer de rede por tick | ~64 KB |
| Tabela aninhada | Máximo 16 níveis |

```lua
-- ERRADO: enviar inventário completo quando muda 1 item
TriggerClientEvent("inventory:full", source, inventarioCompleto)

-- CORRETO: enviar apenas a mudança
TriggerClientEvent("inventory:addItem", source, { item = "agua", quantidade = 1 })

-- Para dados grandes: dividir em chunks
local function enviarEmChunks(source, data, chunkSize)
    local chunks = {}
    local current = {}
    local count = 0
    for k, v in pairs(data) do
        current[k] = v
        count = count + 1
        if count >= chunkSize then
            table.insert(chunks, current)
            current = {}
            count = 0
        end
    end
    if count > 0 then table.insert(chunks, current) end
    for i, chunk in ipairs(chunks) do
        TriggerClientEvent("sync:chunk", source, chunk, i, #chunks)
        Wait(100)
    end
end
```

**Sinais de problema:** `Network overflow` no console, players desconectando, lag spikes.

### 1.7 Sinais de Problema com Tunnel

Se você ver erros como `index (rp/lib/Tunnel.lua:334)`:
- **Causa:** Tunnel sendo usado sem retorno ou em loop
- **Sintomas:** Loops internos, callbacks travados
- **Solução:** Trocar por eventos

---

## 2. Cache de Dados

### 2.1 cacheaside — Cache em Memória com TTL

Consultas ao banco são operações caras. Use cache para dados consultados repetidamente.

```lua
-- ERRADO: query toda vez
exports("checkRelation", function(Passport)
    local Consult = vRP.Query("findRelationship", { Passport = Passport })
end)

-- CORRETO: usando cacheaside
exports("checkRelation", function(Passport)
    local Consult = exports.cacheaside:Get("relationship:findRelationship", Passport, {
        query = { "SELECT * FROM relationship WHERE Passport = ?", { Passport } },
        default = {}
    })
    if Consult[1] and Consult[1]["status"] == 3 then
        return true, Consult[1]["OtherPassport"]
    end
    return false
end)
```

**API do cacheaside:**

| Função | Descrição |
|--------|-----------|
| `Get(namespace, key, opts)` | Busca do cache ou executa query |
| `Set(namespace, key, value, ttl)` | Salva valor no cache |
| `Delete(namespace, key)` | Remove item específico |
| `FlushNamespace(namespace)` | Limpa todo o namespace |

**Opções do Get:**
```lua
exports.cacheaside:Get("namespace", "chave", {
    query = { "SQL", { params } },  -- query se cache miss
    ttl = 300,                       -- TTL em segundos
    default = {},                    -- valor padrão
    forceRefresh = false,            -- força buscar do banco
    logger = true                    -- ativa logs
})
```

**Quando usar cache:**

| Situação | Usar Cache? |
|----------|-------------|
| Dados que mudam raramente (configs, ranks) | Sim |
| Consultas repetidas em curto período | Sim |
| Dados em tempo real (posição, vida) | Não |
| Dados que mudam a cada ação do player | Não |

**Invalidando cache:**
```lua
-- Deletar (próxima consulta busca do banco)
exports.cacheaside:Delete("relationship:findRelationship", Passport)

-- Atualizar direto (evita nova query)
exports.cacheaside:Set("relationship:findRelationship", Passport, novoValor, 300)
```

---

## 3. Estrutura de Código

### 3.1 Cadeias de `or` → Tabela de Permissões

```lua
-- ERRADO: cadeia de or
if vRP.HasPermission(Passport, "Cor")
or vRP.HasPermission(Passport, "Police32")
or vRP.HasPermission(Passport, "Diamante")
-- ... mais 15 linhas ...
then end

-- CORRETO: tabela + função
local permissoesCorArma = {
    "Cor", "Police32", "Police16", "Soul", "Diamante",
    "Boost", "Admin", "Rubi", "DoadorFacT201"
}

local function temPermissao(Passport, lista)
    for _, perm in ipairs(lista) do
        if vRP.HasPermission(Passport, perm) then
            return true
        end
    end
    return false
end

if temPermissao(Passport, permissoesCorArma) then
    -- ação
end
```

### 3.2 if/else → Tabelas de Lookup

```lua
-- ERRADO
if tipo == "bronze" then return 100
elseif tipo == "prata" then return 250
elseif tipo == "ouro" then return 500
end

-- CORRETO (O(1) vs sequencial)
local premios = { bronze = 100, prata = 250, ouro = 500 }
local valor = premios[tipo] or 0
```

Use tabelas quando: mais de 3 condições, tipos dinâmicos (itens, ranks, veículos).

### 3.3 Nunca `if` Vazio

```lua
-- ERRADO
if success then
    -- vazio
else
    TriggerClientEvent('Notify', source, 'negado', 'Erro')
end

-- CORRETO
if not success then
    TriggerClientEvent('Notify', source, 'negado', 'Erro')
end
```

### 3.4 Proteger Contra nil

```lua
-- ERRADO: crash se Identity for nil
"Nome: " .. Identity.name .. " " .. Identity.name2

-- CORRETO: verificar e proteger
local Identity = vRP.Identity(Passport)
if not Identity then
    TriggerClientEvent('Notify', source, 'negado', 'Identity não encontrada')
    return
end

-- Ou usar fallback
local nome = (Identity.name or "") .. " " .. (Identity.name2 or "")
```

---

## 4. Segurança (Cerberus v2.0)

O Cerberus oferece 3 camadas de proteção: **SafeEvent** (server-side), **SetCooldown** (client-side) e **Analytics** (monitoramento).

### 4.1 SafeEvent (Server-side — Anti-Exploit)

Protege ações que dão vantagem ao jogador (dinheiro, itens, XP). Detecta e bane exploiters automaticamente.

**Assinatura:**
```lua
exports["cerberus"]:SafeEvent(source, eventName, options)
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `source` | number | ID do jogador |
| `eventName` | string | Nome único da ação protegida |
| `options` | table\|nil | Tabela de opções (todos opcionais) |

**Opções disponíveis:**

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `data` | any | nil | Dados extras para log |
| `time` | number | config (30) | Intervalo mínimo em segundos |
| `noBan` | boolean | false | Se `true`, não bane automaticamente |
| `position` | boolean | false | Verifica distância entre ações |
| `positionDist` | number | 100 | Distância mínima entre ações (metros) |
| `notification` | boolean | false | Notifica o jogador quando bloqueia |
| `blockThreshold` | number | config (1) | Suspeitas por evento antes de bloquear |
| `logThreshold` | number | config (1) | Suspeitas antes de exibir logs no console |
| `silentLog` | boolean | false | Registra internamente sem exibir no console |
| `interPorDetect` | number | config (15) | Janela de tempo para contar suspeitas |
| `suspectCount` | number | config (4) | Total de suspeitas para ban automático |

**Retorno:** `true` = ação bloqueada, `false` = permitida.

**Exemplo básico:**
```lua
function cRP.paymentMethod(locate)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end

    -- Bloqueia se chamado mais de 1x a cada 10s
    if exports["cerberus"]:SafeEvent(source, "register:paymentMethod", {
        data = "Roubo: " .. tostring(locate),
        time = 10,
        position = true,
        positionDist = 2
    }) then
        return
    end

    local randPrice = math.random(15000, 16000)
    vRP.GenerateItem(Passport, "dollars2", randPrice, true)
end
```

**Exemplo com controle fino (sem ban, com notificação):**
```lua
-- Para ações sensíveis mas que não devem banir automaticamente
if exports["cerberus"]:SafeEvent(source, "requestInventory", {
    time = 2,
    noBan = true,
    notification = true,
    blockThreshold = 3
}) then
    return
end
```

**Exemplo modo silencioso (rastreia mas não loga até threshold):**
```lua
-- Monitora silenciosamente, só loga quando atingir 5 suspeitas
if exports["cerberus"]:SafeEvent(source, "shop:buyItem", {
    time = 5,
    silentLog = true,
    logThreshold = 5,
    blockThreshold = 2
}) then
    return
end
```

**Fluxo de detecção:**
1. Primeira chamada → Registra timestamp e posição
2. Chamada seguinte → Compara intervalo com `time`
3. Intervalo menor que `time` → Incrementa contador de suspeitas **por evento**
4. `position=true` + não moveu `positionDist` → Ban imediato (se `noBan=false`)
5. Suspeitas do evento >= `blockThreshold` → Bloqueia a ação (retorna `true`)
6. Suspeitas totais >= `suspectCount` dentro de `interPorDetect` → Ban automático
7. Se passou `time` desde última chamada → Reset de contadores
8. Thread de limpeza remove eventos inativos há mais de 60s

### 4.2 SetCooldown (Client-side — Rate-Limit)

Limita spam de ações normais no client. **IMPORTANTE: roda no CLIENT, não no server.**

**Assinatura:**
```lua
exports["cerberus"]:SetCooldown(name, time, hits)
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `name` | string | Nome único do cooldown |
| `time` | number | Duração em **milissegundos** |
| `hits` | number\|nil | Tentativas antes de bloquear (modo hit-based) |

**Retorno:** `true` = bloqueado, `false` = permitido.

**Dois modos de operação:**

```lua
-- MODO 1: Time-based (bloqueia por tempo)
-- Bloqueia por 3 segundos após primeira chamada
if exports["cerberus"]:SetCooldown("abrir:inventario", 3000) then
    return
end

-- MODO 2: Hit-based (bloqueia após N tentativas no período)
-- Permite 3 tentativas, depois bloqueia por 5 segundos
if exports["cerberus"]:SetCooldown("usar:item", 5000, 3) then
    return
end
```

**Exemplo completo no client:**
```lua
-- client/main.lua
RegisterNUICallback("comprar", function(data, cb)
    -- Rate limit: máximo 1 compra a cada 2 segundos
    if exports["cerberus"]:SetCooldown("loja:comprar", 2000) then
        cb("blocked")
        return
    end

    SRC.Comprar(data.item)
    cb("ok")
end)
```

**Notificação automática:** O SetCooldown já exibe automaticamente para o jogador uma mensagem "Aguarde X segundos..." quando bloqueia.

### 4.3 SafeEvent vs SetCooldown

| Característica | SafeEvent | SetCooldown |
|----------------|-----------|-------------|
| **Lado** | Server-side | Client-side |
| **Propósito** | Anti-exploit (detecta cheaters) | Rate-limit (limita spam) |
| **Ação ao detectar** | Bloqueia e/ou bane | Bloqueia temporariamente |
| **Tempo** | Segundos | Milissegundos |
| **Passport** | Obtido internamente | Não necessário |
| **Logs** | Registra internamente | Não registra |

**Quando usar qual:**

| Situação | Usar | Exemplo |
|----------|------|---------|
| Roubar caixa/NPC | `SafeEvent` | `time=10, position=true` |
| Receber pagamento de job | `SafeEvent` | `time=30` |
| Coletar drop de dinheiro | `SafeEvent` | `time=5, position=true` |
| Abrir inventário/menu | `SetCooldown` | `time=2000` |
| Usar item (comida, kit) | `SetCooldown` | `time=3000` |
| Spawnar veículo | `SetCooldown` | `time=5000` |
| Interação NUI repetitiva | `SetCooldown` | `time=1000, hits=3` |
| Chat/comandos | Proteção nativa | — |

> **Regra:** Todo evento server-side que dá dinheiro/item/vantagem DEVE usar `SafeEvent`. Ações client-side repetitivas usam `SetCooldown`.
