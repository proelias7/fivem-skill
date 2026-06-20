# Catálogo de tópicos — FiveM (hints de busca)

Use ao rodar `/fivem learn <topic>`. Tópicos livres também funcionam — infira paths a partir do pedido e de `reference.mdc`.

Aliases nos triggers ajudam o agente a reconhecer singular/plural e sinônimos (ex.: `grupo` aprendido → catálogo `grupos` não vira órfão duplicado).

| Tópico | Triggers (palavras-chave) | Onde buscar (grep / paths) |
|--------|---------------------------|----------------------------|
| `craft` | craft, receita, combo, config.craft, crafting | `**/craft/config/config.lua`, `config.craft`, `config.receita`, `craft/config/webhook.lua` |
| `item` | item, itens, items, itemlist, item usável, useItem, generateItem | `**/itemlist.lua`, `inventory:useItem`, `inventory/**/core.lua` |
| `pelucia` | pelúcia, pelucia, createObjectspl, prop na mão | `itemlist.lua`, `inventory/**/core.lua`, bloco PELUCIAS |
| `raspadinha` | scratch, ScratchTypes, InitScratch, raspadinha | `**/scratchcard/**/config.lua`, `InitScratch`, `GenerateReward` |
| `loja` | loja, shop, store, products, webhook | `**/store/config/config.lua`, `config.shops`, `webhook` |
| `nui` | NUI, nui, RegisterNUICallback, pnpm, vite | `**/src/ui/project`, `RegisterNUICallback`, `fxmanifest` ui_page |
| `grupos` | grupo, grupos, permissão, permission, hasGroup, hasPermission, SharedPermission | `**/groups.lua`, `vRP.hasGroup`, `vRP.hasPermission` |
| `inventario` | inventario, inventário, chest, baú, trunk, sanitizeChest | `**/inventory/**`, `tryChest`, `requestChest` |
| `webhook` | webhook, discord, sandWebhook | `**/webhook.lua`, `exports["webhook"]`, `config.shops` webhook field |

## Slug livre

Exemplos: `learn dona-capivara`, `learn rise-actions`

- Normalizar slug: minúsculas, hífens, sem espaços
- Arquivo: `<agent>/fivem/memory/<slug>.md`
