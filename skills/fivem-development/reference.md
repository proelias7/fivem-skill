# Referência Completa — vRP Creative Network

## Estrutura do Framework

```
vrp/
├── client/           # Scripts client-side
│   ├── base.lua      # Proxy/Tunnel client, ClosestPed, GetPlayers
│   ├── gui.lua       # Animações, comandos (andar, agachar, apontar, etc.)
│   ├── iplloader.lua # Carregamento de IPLs
│   ├── noclip.lua    # Sistema de noclip (admin)
│   ├── objects.lua   # Gerenciamento de objetos attachados
│   ├── playanim.lua  # Sistema de animações
│   ├── player.lua    # Lógica do jogador client-side
│   └── vehicles.lua  # Funções de veículos client-side
├── config/
│   ├── Global.lua    # Configurações globais (spawn, pesos, tempos, etc.)
│   ├── Groups.lua    # Definição de grupos/permissões
│   ├── Item.lua      # Definição de itens (peso, durabilidade, etc.)
│   ├── Native.lua    # Configurações de natives
│   ├── Vehicle.lua   # Configurações de veículos
│   └── Webhooks.lua  # URLs de webhooks
├── frameworks/
│   └── vrpex.lua     # Aliases de compatibilidade com vRP clássica
├── lib/
│   ├── Proxy.lua     # Sistema Proxy (comunicação inter-resource server)
│   ├── Tools.lua     # Utilitários auxiliares
│   ├── Tunnel.lua    # Sistema Tunnel (comunicação client↔server)
│   └── Utils.lua     # Funções utilitárias globais (parseInt, splitString, async, etc.)
├── modules/          # Módulos server-side
│   ├── base.lua      # Core: conexão, ban, passport, datatable, inventário
│   ├── cooldown.lua  # Sistema de cooldowns
│   ├── drugs.lua     # Sistema de drogas
│   ├── fiveguard.lua # Integração FiveGuard anti-cheat
│   ├── funtionslib.lua # Funções auxiliares
│   ├── groups.lua    # Sistema de grupos/permissões/serviços
│   ├── identity.lua  # Identidade, prisão, badges, geração de placa/telefone
│   ├── inventory.lua # Inventário, itens, baús, server data
│   ├── misc.lua      # Funções diversas
│   ├── money.lua     # Sistema monetário (bank, coins, gems, multas)
│   ├── party.lua     # Sistema de grupo/party
│   ├── player.lua    # Jogador: survival, objetos, teleport, bucket
│   ├── prepare.lua   # Queries SQL preparadas
│   ├── queue.lua     # Sistema de fila
│   ├── rolepass.lua  # Sistema de rolepass
│   ├── salary.lua    # Sistema de salário
│   ├── street.lua    # Limpeza de dados
│   ├── vehicles.lua  # Funções de veículos server-side
│   └── vrp.lua       # Ponto de entrada: inicializa Proxy/Tunnel
└── fxmanifest.lua    # Manifesto do resource
```

## Natives FiveM — Fonte Oficial

- Docs: https://docs.fivem.net/natives/
- Repositório oficial (espelho): https://github.com/proelias7/fivem-natives

## Creative v5 (versão anterior) — diferenças do core

O Creative v5 mantém a arquitetura, mas o core usa **nomenclatura em `camelCase`**.

### Arquivos com nomes diferentes

- `modules/group.lua` (v5) ↔ `modules/groups.lua` (Creative Network)
- `config/groups.lua`/`itemlist.lua`/`natives.lua`/`vehicles.lua` (v5) ↔ `Groups.lua`/`Item.lua`/`Native.lua`/`Vehicle.lua`

### Mapa de funções (core v5 → Creative Network)

| Creative v5 | Creative Network |
|-------------|------------------|
| `getUserId(source)` | `Passport(source)` |
| `userSource(user_id)` | `Source(Passport)` |
| `userList()` | `Players()` |
| `getDatatable(user_id)` | `Datatable(Passport)` |
| `userInventory(user_id)` | `Inventory(Passport)` |
| `clearInventory(user_id)` | `ClearInventory(Passport)` |
| `kick(source, reason)` | `Kick(source, reason)` |
| `prepare(name, query)` | `Prepare(name, query)` |
| `query(name, params)` | `Query(name, params)` |
| `execute(name, params)` | `Query(name, params)` |

## vRPEX (variação mais antiga) — diferenças do core

O vRPEX mantém a mesma base, mas usa **nomenclatura clássica** no core e configs em `cfg/`.

### Arquivos com nomes diferentes

- `cfg/*.lua` (vRPEX) ↔ `config/*.lua` (Creative Network)
- `server/*`/`client/*` (vRPEX) ↔ `modules/*`/`client/*` (Creative Network)

### Mapa de funções (vRPEX → Creative Network)

| vRPEX | Creative Network |
|-------|------------------|
| `getUserId(source)` | `Passport(source)` |
| `getUserSource(user_id)` | `Source(Passport)` |
| `getUsers()` | `Players()` |
| `getUserIdentity(user_id)` | `Identity(Passport)` |
| `getUserDataTable(user_id)` | `Datatable(Passport)` |
| `getInventory(user_id)` | `Inventory(Passport)` |
| `getInventoryWeight(user_id)` | `InventoryWeight(Passport)` |
| `getMaxBackpack(user_id)` | `GetWeight(Passport)` |
| `giveInventoryItem(user_id, item, amount, notify, slot)` | `GiveItem(Passport, item, amount, notify, slot)` |
| `tryGetInventoryItem(user_id, item, amount, notify, slot)` | `TakeItem(Passport, item, amount, notify, slot)` |
| `getBankMoney(user_id)` | `GetBank(source)` |
| `tryFullPayment(user_id, amount)` | `PaymentFull(Passport, amount)` |
| `addUserGroup(user_id, group)` | `SetPermission(Passport, group, level)` |
| `removeUserGroup(user_id, group)` | `RemovePermission(Passport, group)` |
| `getUsersByGroup(group)` | `NumPermission(group)` |
| `hasPermission(user_id, perm)` | `HasPermission(Passport, perm)` |

## Tabelas Globais Importantes

### Characters (server-side)

```lua
Characters[source] = {
    id = 123,           -- Passport
    name = "João",
    name2 = "Silva",
    phone = "123-456",
    bank = 50000,
    coins = 100,
    license = "steam:xxxxx",
    prison = 0,
    fines = 0,
    spending = 0,
    badges = "{}",
    sex = "Masculino",
    blood = "A+",
    ["table"] = {       -- Datatable (dados em memória)
        Pos = { x = 0, y = 0, z = 0 },
        Skin = "mp_m_freemode_01",
        Inventory = {},
        Health = 200,
        Armour = 0,
        Hunger = 100,
        Thirst = 100,
        Infection = 0,
        Weight = 30
    }
}
```

### Sources (server-side)

```lua
Sources[Passport] = source  -- Lookup reverso: Passport → source
```

### Inventory (estrutura de slot)

```lua
Datatable.Inventory = {
    ["1"] = { item = "WEAPON_PISTOL", amount = 1 },   -- Slots 1-5 = hotbar (armas visíveis)
    ["6"] = { item = "dollars", amount = 5000 },
    ["7"] = { item = "water", amount = 3 },
    ["8"] = { item = "medkit-1706745600", amount = 1 } -- Item com durabilidade (timestamp)
}
```

**Regras do inventário:**
- Slots 1–5: hotbar (armas criadas visualmente no jogador)
- Items com durabilidade: `"item-timestamp"` (ex: `"medkit-1706745600"`)
- Items com charges: `"item-charges"` (ex: `"repairkit01-5"`)
- `vRP.GiveItem` = sem processar durabilidade
- `vRP.GenerateItem` = processa durabilidade/charges automaticamente

## Queries Preparadas (Tabelas do DB)

### characters

```sql
-- Campos: id, license, name, name2, sex, phone, blood, bank, coins, 
--         prison, fines, taxs, spending, badges, deleted, gunlicense,
--         tracking, likes, unlikes, medicplan, chars
```

### accounts

```sql
-- Campos: id, license, discord, gems, rolepass, premium, whitelist, chars
```

### vehicles

```sql
-- Campos: Passport, vehicle, plate, work, tax, rental, arrest, engine,
--         body, health, fuel, doors, windows, tyres, brakes, nitro, drift, mode, dismantle
```

### playerdata

```sql
-- Campos: Passport, dkey, dvalue (JSON)
-- Dados por jogador, chave-valor
```

### entitydata

```sql
-- Campos: dkey, dvalue (JSON)
-- Dados globais do servidor (baús, permissões, etc.)
-- Chaves especiais: "Permissions:NomeGrupo", "Chest:NomeBau"
```

### propertys

```sql
-- Campos: Name, Interior, Passport, Serial, Vault, Fridge, Tax, Garage, Item
```

## Funções de Item (config/Item.lua)

Estas funções vêm da configuração de itens:

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `itemName(item)` | string | Nome do item |
| `itemWeight(item)` | number | Peso do item |
| `itemType(item)` | string | Tipo: "Armamento", "Throwing", etc. |
| `itemBody(item)` | bool | Se o item tem corpo (exibível) |
| `itemIndex(item)` | string | Índice/ícone do item |
| `itemMaxAmount(item)` | number | Quantidade máxima permitida |
| `itemDurability(item)` | number\|nil | Durabilidade em dias |
| `itemCharges(item)` | number\|nil | Cargas do item |
| `itemRepair(item)` | string\|nil | Item de reparo necessário |
| `itemScape(item)` | bool | Se o item tem exceção de quantidade |

## Sistema de Baús (Chests)

```lua
-- Buscar dados de um baú (usa entitydata/GetSrvData)
local chestData = vRP.GetSrvData("Chest:NomeDoBau")

-- Pegar item do baú para inventário
vRP.TakeChest(Passport, "Chest:NomeDoBau", Amount, SlotBau, SlotInventario)

-- Guardar item no baú
vRP.StoreChest(Passport, "Chest:NomeDoBau", Amount, PesoMaximo, SlotInventario, SlotBau)

-- Mover item dentro do baú
vRP.UpdateChest(Passport, "Chest:NomeDoBau", SlotOrigem, SlotDestino, Amount)

-- Adicionar dinheiro direto no baú
vRP.DirectChest("NomeDoBau", Slot, Amount)
```

## Sistema de Multas e Impostos

```lua
-- Multas
vRP.GiveFine(Passport, Amount)      -- Adiciona multa
vRP.RemoveFine(Passport, Amount)    -- Remove multa
vRP.GetFine(source)                 -- Obtém total de multas

-- Prisão
vRP.InitPrison(Passport, Amount)    -- Inicia prisão (serviços)
vRP.UpdatePrison(Passport, Amount)  -- Reduz serviços da prisão
```

## Tunnel Rate Limiting

O sistema Tunnel possui proteções:
- **150 chamadas/segundo** por identificador
- **Warning** em payloads > 64KB
- **Limite** de 256KB por payload
- **Timeout** de 30 segundos
- Anti-flood automático

## LocalPlayer States (client-side)

```lua
LocalPlayer["state"]["Active"]     -- Jogador ativo (personagem escolhido)
LocalPlayer["state"]["Passport"]   -- Passport do jogador
LocalPlayer["state"]["Name"]       -- Nome do jogador
LocalPlayer["state"]["Admin"]      -- Em serviço admin
LocalPlayer["state"]["Police"]     -- Em serviço policial
LocalPlayer["state"]["Route"]      -- Routing bucket atual
LocalPlayer["state"]["Handcuff"]   -- Algemado
LocalPlayer["state"]["Cancel"]     -- Ação cancelada
LocalPlayer["state"]["Commands"]   -- Usando comandos
LocalPlayer["state"]["Invisible"]  -- Invisível
LocalPlayer["state"]["Invincible"] -- Invencível
LocalPlayer["state"]["usingPhone"] -- Usando telefone
LocalPlayer["state"]["Buttons"]    -- Botões bloqueados
LocalPlayer["state"]["Race"]       -- Em corrida
LocalPlayer["state"]["Target"]     -- Target ativo
```

## Funções Client-side (tvRP)

```lua
-- Obtém jogadores próximos
local players = tvRP.ClosestPeds(Radius)

-- Obtém jogador mais próximo
local serverId = tvRP.ClosestPed(Radius)

-- Define GPS
tvRP.setGPS(x, y)

-- Cria objetos attachados
tvRP.CreateObjects(Dict, Anim, Prop, Flag, Hands, Pos1-6)

-- Destroi objetos/animações
tvRP.Destroy(Mode)  -- "one", "two", ou nil (ambos)

-- Som
tvRP.PlaySound(Dict, Name)
```

## Dependências Externas

| Resource | Uso |
|----------|-----|
| `oxmysql` | Banco de dados MySQL |
| `webhook` | `exports["webhook"]:Send(canal, titulo, campos)` |
| `inventory` | UI de inventário, armas |
| `request` | Sistema de requests (aceitar/recusar) |
| `taskbar` | Barra de progresso |
| `survival` | Sistema de vida/morte |
| `cerberus` | Anti-exploit e rate-limiting (v2.0) |
| `cacheaside` | Cache em memória com TTL para queries |

### Repositórios Oficiais

```bash
git clone git@github.com:proelias7/cacheaside.git
git clone git@github.com:proelias7/cerberus.git
```

No `server.cfg`, adicione antes dos scripts que dependem:

```cfg
ensure cacheaside
ensure cerberus
```

## Cerberus v2.0 — API Rápida

### SafeEvent (server-side)

```lua
-- Retorna true se bloqueou, false se permitiu
exports["cerberus"]:SafeEvent(source, "nomeEvento", {
    time = 10,            -- intervalo mínimo (segundos)
    noBan = false,        -- não banir automaticamente
    position = true,      -- verificar distância
    positionDist = 2,     -- distância mínima (metros)
    notification = true,  -- notificar jogador ao bloquear
    blockThreshold = 3,   -- suspeitas antes de bloquear
    silentLog = false,    -- log silencioso
    data = "info extra"   -- dados para log
})
```

### SetCooldown (client-side)

```lua
-- Retorna true se bloqueou, false se permitiu
-- Time-based
exports["cerberus"]:SetCooldown("nome", 3000) -- 3 segundos

-- Hit-based (permite N tentativas antes de bloquear)
exports["cerberus"]:SetCooldown("nome", 5000, 3) -- 3 hits, depois bloqueia 5s
```
