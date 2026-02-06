---
name: fivem-development
description: Desenvolve resources para FiveM usando a vRP Creative Network com Lua. Cobre criação de resources, sistema Proxy/Tunnel, inventário, dinheiro, grupos, identidade, NUI, banco de dados (oxmysql), segurança e performance. Use quando o usuário trabalhar com FiveM, vRP, scripts Lua para servidor GTA V, ou mencionar resources, client/server scripts, natives, NUI ou qualquer sistema do framework vRP Creative Network.
---

# FiveM Development — vRP Creative Network

## Arquitetura do Framework

A vRP Creative Network é baseada em **Lua 5.4** com comunicação via **Proxy** (server-to-server) e **Tunnel** (client-server).

## Suporte Creative v5 e vRPEX (variações antigas)

As versões antigas mantêm a mesma lógica e boas práticas, mas mudam nomes de funções e arquivos.

- **Creative v5:** core em `camelCase`, `modules/group.lua`, configs em `config/*.lua`.
- **vRPEX:** core clássico (`getUserId`, `getUserSource`, `getUsers`, etc.) e configs em `cfg/*.lua`.

Veja o mapeamento completo em [reference.md](reference.md).

### Conceitos-chave

| Conceito | Descrição |
|----------|-----------|
| **Passport** | ID único do personagem (equivalente a `user_id` em outras vRPs) |
| **Source** | ID da conexão do jogador no servidor (muda a cada reconexão) |
| **Datatable** | Tabela em memória com dados do personagem (inventário, posição, skin, etc.) |
| **Characters** | Tabela global server-side indexada por `source` com dados do personagem |
| **Sources** | Tabela global `Sources[Passport] = source` para lookup reverso |

### Fluxo de identificação

```lua
-- Server-side: obter Passport a partir do source
local Passport = vRP.Passport(source)

-- Server-side: obter source a partir do Passport
local source = vRP.Source(Passport)

-- Server-side: obter Datatable do personagem
local Datatable = vRP.Datatable(Passport)

-- Server-side: obter inventário
local Inventory = vRP.Inventory(Passport)
```

### Sistema Proxy/Tunnel

```lua
-- Em qualquer resource SERVER-SIDE, obter acesso à vRP:
local Proxy = module("vrp", "lib/Proxy")
vRP = Proxy.getInterface("vRP")

-- Em qualquer resource CLIENT-SIDE:
local Tunnel = module("vrp", "lib/Tunnel")
local Proxy = module("vrp", "lib/Proxy")
vRPS = Tunnel.getInterface("vRP")  -- chamar funções do server

-- Expor funções do seu resource (server):
myResource = {}
Proxy.addInterface("myResource", myResource)
Tunnel.bindInterface("myResource", myResource)
```

### Regra de fire-and-forget

Prefixar chamada Tunnel com `_` para não aguardar resposta:

```lua
-- Aguarda resposta (bloqueante)
local result = vRP.Generateitem(Passport,"water",1)

-- Fire-and-forget (não bloqueia)
vRP._Generateitem(Passport,"water",1)
```

## API Principal (Server-side)

### Jogador/Identidade

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `vRP.Passport(source)` | source | Passport\|false | Obtém Passport do jogador |
| `vRP.Source(Passport)` | Passport | source\|nil | Obtém source do Passport |
| `vRP.Datatable(Passport)` | Passport | table\|false | Dados em memória do personagem |
| `vRP.Inventory(Passport)` | Passport | table | Inventário do personagem |
| `vRP.Identity(Passport)` | Passport | table\|false | Dados do personagem (name, name2, bank, phone, etc.) |
| `vRP.FullName(source)` | source | string\|false | Nome completo do personagem |
| `vRP.Players()` | — | table | Retorna `Sources` (Passport→source) |
| `vRP.Kick(source, Reason)` | source, string | — | Kicka o jogador |
| `vRP.Teleport(source, x, y, z)` | source, coords | — | Teleporta o jogador |
| `vRP.GetEntityCoords(source)` | source | vector3 | Coordenadas do jogador |
| `vRP.ModelPlayer(source)` | source | string | Modelo do ped (mp_m/mp_f) |

### Dinheiro

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `vRP.GetBank(source)` | source | number | Saldo bancário |
| `vRP.GiveBank(Passport, Amount)` | Passport, number | — | Adiciona dinheiro ao banco |
| `vRP.RemoveBank(Passport, Amount)` | Passport, number | — | Remove dinheiro do banco |
| `vRP.PaymentBank(Passport, Amount)` | Passport, number | bool | Paga com banco (verifica saldo) |
| `vRP.PaymentMoney(Passport, Amount)` | Passport, number | bool | Paga com dinheiro em espécie |
| `vRP.PaymentFull(Passport, Amount)` | Passport, number | bool | Tenta espécie, depois banco |
| `vRP.PaymentDirty(Passport, Amount)` | Passport, number | bool | Paga com dinheiro sujo |
| `vRP.WithdrawCash(Passport, Amount)` | Passport, number | bool | Saque bancário |
| `vRP.PaymentGems(Passport, Amount)` | Passport, number | bool | Paga com gemas |
| `vRP.GetCoins(Passport)` | Passport | number | Obtém coins |
| `vRP.AddCoins(Passport, Amount)` | Passport, number | bool | Adiciona coins |
| `vRP.RemCoins(Passport, Amount)` | Passport, number | bool | Remove coins |

### Inventário

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `vRP.GiveItem(Passport, Item, Amount, Notify, Slot)` | ... | — | Dá item (sem durabilidade) |
| `vRP.GenerateItem(Passport, Item, Amount, Notify, Slot)` | ... | — | Dá item (com durabilidade/charges) |
| `vRP.TakeItem(Passport, Item, Amount, Notify, Slot)` | ... | bool | Remove item (retorna sucesso) |
| `vRP.RemoveItem(Passport, Item, Amount, Notify)` | ... | — | Remove item (sem retorno) |
| `vRP.ItemAmount(Passport, Item)` | Passport, string | number | Quantidade do item |
| `vRP.ConsultItem(Passport, Item, Amount)` | ... | bool | Verifica se tem a quantidade |
| `vRP.InventoryWeight(Passport)` | Passport | number | Peso atual |
| `vRP.GetWeight(Passport)` | Passport | number | Peso máximo |
| `vRP.SetWeight(Passport, Amount)` | Passport, number | — | Adiciona ao peso máximo |
| `vRP.MaxItens(Passport, Item, Amount)` | ... | bool | Verifica limite máximo do item |
| `vRP.ClearInventory(Passport)` | Passport | — | Limpa inventário |

### Grupos/Permissões

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `vRP.HasPermission(Passport, Permission, Level)` | ... | bool | Verifica permissão direta |
| `vRP.HasGroup(Passport, Permission, Level)` | ... | bool | Verifica grupo (inclui parents) |
| `vRP.HasService(Passport, Permission)` | ... | bool | Verifica se está em serviço |
| `vRP.SetPermission(Passport, Permission, Level, Mode)` | ... | — | Define permissão |
| `vRP.RemovePermission(Passport, Permission)` | ... | — | Remove permissão |
| `vRP.ServiceToggle(Source, Passport, Permission, Silenced)` | ... | — | Toggle serviço |
| `vRP.NumPermission(Permission, Level)` | ... | table, number | Players no serviço |
| `vRP.CheckGroup(Passport, Type)` | ... | bool | Verifica grupo por tipo |
| `vRP.HasAction(Passport)` | Passport | bool | Verifica ação policial |
| `vRP.SetAction(Passport, Status)` | ... | — | Define status de ação |

### Sobrevivência

| Função | Parâmetros | Descrição |
|--------|------------|-----------|
| `vRP.UpgradeHunger(Passport, Amount)` | ... | Aumenta fome |
| `vRP.DowngradeHunger(Passport, Amount)` | ... | Diminui fome |
| `vRP.UpgradeThirst(Passport, Amount)` | ... | Aumenta sede |
| `vRP.DowngradeThirst(Passport, Amount)` | ... | Diminui sede |
| `vRP.UpgradeInfection(Passport, Amount)` | ... | Aumenta infecção |
| `vRP.DowngradeInfection(Passport, Amount)` | ... | Diminui infecção |
| `vRP.Revive(source, Health)` | ... | Revive jogador |

### Banco de Dados

```lua
-- Registrar query preparada
vRP.Prepare("nome/query", "SELECT * FROM tabela WHERE id = @id")

-- Executar query
local result = vRP.Query("nome/query", { id = 123 })
```

Usa **oxmysql** internamente. Parâmetros com `@nome`.

### Dados Persistentes

```lua
-- Server Data (entitydata — dados globais)
local data = vRP.GetSrvData("ChaveUnica")
vRP.SetSrvData("ChaveUnica", { campo = "valor" })

-- Player Data (playerdata — dados por jogador)
local data = vRP.UserData(Passport, "chave")
vRP.setUData(Passport, "chave", json.encode(dados))
```

### Utilitários Globais

| Função | Descrição |
|--------|-----------|
| `parseInt(value)` | Converte para inteiro (mín. 0) |
| `parseFormat(value)` | Formata número com separador de milhar |
| `splitString(str, symbol)` | Divide string por separador |
| `SplitOne(name)` | Primeiro elemento do split |
| `sanitizeString(str, chars, allow)` | Filtra caracteres |
| `CompleteTimers(seconds)` | Formata tempo completo em HTML |
| `MinimalTimers(seconds)` | Formata tempo resumido |
| `CountTable(table)` | Conta itens na tabela |
| `async(func)` | Executa função assíncrona |

## Comunicação Client-Server

### Eventos de Notificação

```lua
-- Server-side: notificação simples
TriggerClientEvent("Notify", source, "success", "Mensagem.", false, 5000)
-- Tipos: "success", "important", "negado"

-- Server-side: notificação de item
TriggerClientEvent("NotifyItens", source, { "+", "itemIndex", "quantidade", "Nome do Item" })
-- "+" para ganho, "-" para perda
```

### Eventos Importantes

| Evento | Lado | Descrição |
|--------|------|-----------|
| `"Connect"` | Server | Jogador escolheu personagem `(Passport, Source)` |
| `"Disconnect"` | Server | Jogador desconectou `(Passport, Source)` |
| `"CharacterChosen"` | Server | Personagem escolhido `(Passport, source)` |
| `"vRP:Active"` | Client | Jogador ativado `(source, Passport, Nome)` |

## Regras Críticas de Performance (Resumo)

Seguir SEMPRE estas regras ao escrever código:

1. **Tunnel vs Evento:** Use `TriggerServerEvent`/`TriggerClientEvent` quando NÃO precisa de retorno. Use Tunnel apenas quando PRECISA de retorno.
2. **Sleep dinâmico:** NUNCA `Wait(0)` fixo. Ajuste baseado no estado (dist < 20 = `0`, dist < 50 = `500`, senão = `1000`+).
3. **Chamadas no mesmo ambiente:** Chame funções diretamente. NUNCA use `TriggerEvent()` para chamar no mesmo side.
4. **Sem chamadas remotas em loops:** Não use Tunnel/Eventos em loops < 5 segundos. Prefira batch ou delta.
5. **Payloads pequenos:** Envie apenas a mudança, não dados completos. Limite de ~8KB por evento.
6. **Cache:** Use `exports.cacheaside:Get()` para consultas repetidas ao banco. Nunca query no banco em loop.
7. **SafeEvent (server):** Todo evento que dá dinheiro/item/vantagem DEVE passar por `exports["cerberus"]:SafeEvent(source, "nomeEvento", { time = N })`.
8. **SetCooldown (client):** Ações repetitivas no client (abrir menu, usar item) devem usar `exports["cerberus"]:SetCooldown("nome", ms)`.
9. **Tabelas > if/else:** Para 3+ condições, use tabela de lookup (O(1)) ao invés de cadeias if/elseif.
10. **Proteger nil:** Sempre verificar variáveis antes de concatenar. Usar `or ""` como fallback.

## Construção de UI (React + Vite)

Stack: React 18 + TypeScript + Vite + Tailwind CSS + Zustand.

**Regras fundamentais:**
- `base: "./"` no vite.config.ts (OBRIGATÓRIO para FiveM)
- Usar `rem` para TODOS os tamanhos — NUNCA `px` para layout
- Media queries no `html` font-size para escalar com resolução do jogador
- **Tailwind v4 usa OKLCH** e o CEF do FiveM não suporta. **Use Tailwind v3.4.17**.
- PROIBIDO: `backdrop-filter: blur()`, `filter: blur()`, `filter: drop-shadow()` — causam queda de FPS
- PROIBIDO: framer-motion, GSAP, react-spring — libs de animação pesadas
- Usar CSS transitions/keyframes puras para animações
- Módulos independentes (Notify, Progress) fora do VisibilityProvider
- Interface principal dentro do VisibilityProvider com NuiFocus
- `overflow: hidden` e `user-select: none` globais
- `isEnvBrowser()` para mock de dados no dev
- Comunicação: `observe()` para ouvir NUI, `Post.create()` para enviar callbacks

Para guia completo de UI: [ui-guide.md](ui-guide.md)

## Referências Adicionais

- Para guia de construção de UI (React + Vite + FiveM): [ui-guide.md](ui-guide.md)
- Para boas práticas detalhadas (performance, segurança, cache): [best-practices.md](best-practices.md)
- Para API completa e detalhada: [reference.md](reference.md)
- Para exemplos de código: [examples.md](examples.md)
- Para templates de resources: [templates.md](templates.md)
- Para padrões e convenções: [patterns.md](patterns.md)

## Recursos Externos (Download)

Use estes repositórios oficiais quando o projeto mencionar dependências:

- `cacheaside` (cache em memória): `git@github.com:proelias7/cacheaside.git`
- `cerberus` (anti-exploit + cooldowns): `git@github.com:proelias7/cerberus.git`

## Compatibilidade vRPex

A vRP Creative Network possui aliases de compatibilidade com a vRP clássica:

| vRPex (antigo) | Creative Network (atual) |
|----------------|--------------------------|
| `getUserId` | `Passport` |
| `getUserSource` | `Source` |
| `getUserIdentity` | `Identity` |
| `getUserDataTable` | `Datatable` |
| `hasGroup` | `HasGroup` |
| `hasPermission` | `HasPermission` |
| `giveInventoryItem` | `GiveItem` |
| `tryGetInventoryItem` | `TakeItem` |
| `getInventoryItemAmount` | `ItemAmount` |
| `giveMoney` | `GiveBank` |
| `tryFullPayment` | `PaymentFull` |
| `getBankMoney` | `GetBank` |
| `query` / `execute` | `Query` |
| `prepare` | `Prepare` |

**SEMPRE use os nomes nativos da Creative Network** (coluna direita), não os aliases.
