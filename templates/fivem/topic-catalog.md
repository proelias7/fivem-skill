# Catálogo de tópicos — FiveM (hints de busca)

Use ao rodar `/fivem learn <topic>`. Tópicos livres também funcionam — infira paths a partir do pedido e de `reference.mdc`.

| Tópico | Triggers (palavras-chave) | Onde buscar (grep / paths) |
|--------|---------------------------|----------------------------|
| `craft` | craft, receita, combo, config.craft | `**/craft/config/config.lua`, `config.craft`, `config.receita`, `craft/config/webhook.lua` |
| `item` | itemlist, item usável, useItem, generateItem | `**/itemlist.lua`, `inventory:useItem`, `inventory/**/core.lua` |
| `pelucia` | pelúcia, createObjectspl, prop na mão | `itemlist.lua`, `inventory/**/core.lua`, bloco PELUCIAS |
| `raspadinha` | scratch, ScratchTypes, InitScratch, raspadinha | `**/scratchcard/**/config.lua`, `InitScratch`, `GenerateReward` |
| `loja` | shop, store, products, webhook | `**/store/config/config.lua`, `config.shops`, `webhook` |
| `nui` | NUI, RegisterNUICallback, pnpm, vite | `**/src/ui/project`, `RegisterNUICallback`, `fxmanifest` ui_page |
| `grupos` | hasGroup, hasPermission, SharedPermission | `**/groups.lua`, `vRP.hasGroup`, `vRP.hasPermission` |
| `inventario` | chest, baú, trunk, sanitizeChest | `**/inventory/**`, `tryChest`, `requestChest` |
| `webhook` | discord, sandWebhook, webhook.lua | `**/webhook.lua`, `exports["webhook"]`, `config.shops` webhook field |

## Slug livre

Exemplos: `learn dona-capivara`, `learn rise-actions`

- Normalizar slug: minúsculas, hífens, sem espaços
- Arquivo: `<agent>/fivem/memory/<slug>.md`
