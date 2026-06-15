---
name: vrp-framework
description: Develops resources for FiveM using vRP Creative Network with Lua. Covers Proxy/Tunnel system, Passport/Source/Datatable, inventory, money, groups, identity, database (oxmysql), events, and vRPEX compatibility. Use when the user works with vRP, Creative Network, vRPEX, Proxy, Tunnel, Passport, or any vRP server-side/client-side API.
---

# vRP Framework — Creative Network

## Framework Architecture

vRP Creative Network is based on **Lua 5.4** with communication via **Proxy** (server-to-server) and **Tunnel** (client-server).

## Support for Creative v5 and vRPEX (older variations)

Older versions maintain the same logic and best practices but change function and file names.

- **Creative v5:** core in `camelCase`, `modules/group.lua`, configs in `config/*.lua`.
- **vRPEX:** classic core (`getUserId`, `getUserSource`, `getUsers`, etc.) and configs in `cfg/*.lua`.

See the full mapping in [reference.md](reference.md).

### Key Concepts

| Concept | Description |
|---|---|
| **Passport** | Unique character ID (equivalent to `user_id` in other vRPs) |
| **Source** | Player connection ID on the server (changes on every reconnection) |
| **Datatable** | In-memory table with character data (inventory, position, skin, etc.) |
| **Characters** | Global server-side table indexed by `source` with character data |
| **Sources** | Global table `Sources[Passport] = source` for reverse lookup |

### Identification Flow

```lua
-- Server-side: get Passport from source
local Passport = vRP.Passport(source)

-- Server-side: get source from Passport
local source = vRP.Source(Passport)

-- Server-side: get character Datatable
local Datatable = vRP.Datatable(Passport)

-- Server-side: get inventory
local Inventory = vRP.Inventory(Passport)
```

### Proxy/Tunnel System

```lua
-- In any SERVER-SIDE resource, get access to vRP:
local Proxy = module("vrp", "lib/Proxy")
vRP = Proxy.getInterface("vRP")

-- In any CLIENT-SIDE resource:
local Tunnel = module("vrp", "lib/Tunnel")
local Proxy = module("vrp", "lib/Proxy")
vRPS = Tunnel.getInterface("vRP")  -- call server functions

-- Expose your resource functions (server):
myResource = {}
Proxy.addInterface("myResource", myResource)
Tunnel.bindInterface("myResource", myResource)
```

### Fire-and-forget Rule

Prefix Tunnel calls with `_` to not wait for a response:

```lua
-- Await response (blocking)
local result = vRP.Generateitem(Passport,"water",1)

-- Fire-and-forget (non-blocking)
vRP._Generateitem(Passport,"water",1)
```

## Main API (Server-side)

### Player/Identity

| Function | Parameters | Return | Description |
|--------|------------|---------|-----------|
| `vRP.Passport(source)` | source | Passport\|false | Gets player Passport |
| `vRP.Source(Passport)` | Passport | source\|nil | Gets source from Passport |
| `vRP.Datatable(Passport)` | Passport | table\|false | Character in-memory data |
| `vRP.Inventory(Passport)` | Passport | table | Character inventory |
| `vRP.Identity(Passport)` | Passport | table\|false | Character data (name, name2, bank, phone, etc.) |
| `vRP.FullName(source)` | source | string\|false | Character full name |
| `vRP.Players()` | — | table | Returns `Sources` (Passport→source) |
| `vRP.Kick(source, Reason)` | source, string | — | Kicks the player |
| `vRP.Teleport(source, x, y, z)` | source, coords | — | Teleports the player |
| `vRP.GetEntityCoords(source)` | source | vector3 | Player coordinates |
| `vRP.ModelPlayer(source)` | source | string | Ped model (mp_m/mp_f) |

### Money

| Function | Parameters | Return | Description |
|--------|------------|---------|-----------|
| `vRP.GetBank(source)` | source | number | Bank balance |
| `vRP.GiveBank(Passport, Amount)` | Passport, number | — | Adds money to bank |
| `vRP.RemoveBank(Passport, Amount)` | Passport, number | — | Removes money from bank |
| `vRP.PaymentBank(Passport, Amount)` | Passport, number | bool | Pays with bank (checks balance) |
| `vRP.PaymentMoney(Passport, Amount)` | Passport, number | bool | Pays with cash |
| `vRP.PaymentFull(Passport, Amount)` | Passport, number | bool | Tries cash, then bank |
| `vRP.PaymentDirty(Passport, Amount)` | Passport, number | bool | Pays with dirty money |
| `vRP.WithdrawCash(Passport, Amount)` | Passport, number | bool | Bank withdrawal |
| `vRP.PaymentGems(Passport, Amount)` | Passport, number | bool | Pays with gems |
| `vRP.GetCoins(Passport)` | Passport | number | Gets coins |
| `vRP.AddCoins(Passport, Amount)` | Passport, number | bool | Adds coins |
| `vRP.RemCoins(Passport, Amount)` | Passport, number | bool | Removes coins |

### Inventory

| Function | Parameters | Return | Description |
|--------|------------|---------|-----------|
| `vRP.GiveItem(Passport, Item, Amount, Notify, Slot)` | ... | — | Gives item (no durability) |
| `vRP.GenerateItem(Passport, Item, Amount, Notify, Slot)` | ... | — | Gives item (with durability/charges) |
| `vRP.TakeItem(Passport, Item, Amount, Notify, Slot)` | ... | bool | Removes item (returns success) |
| `vRP.RemoveItem(Passport, Item, Amount, Notify)` | ... | — | Removes item (no return) |
| `vRP.ItemAmount(Passport, Item)` | Passport, string | number | Item amount |
| `vRP.ConsultItem(Passport, Item, Amount)` | ... | bool | Checks if has amount |
| `vRP.InventoryWeight(Passport)` | Passport | number | Current weight |
| `vRP.GetWeight(Passport)` | Passport | number | Max weight |
| `vRP.SetWeight(Passport, Amount)` | Passport, number | — | Adds to max weight |
| `vRP.MaxItens(Passport, Item, Amount)` | ... | bool | Checks item max limit |
| `vRP.ClearInventory(Passport)` | Passport | — | Clears inventory |

### Groups/Permissions

| Function | Parameters | Return | Description |
|--------|------------|---------|-----------|
| `vRP.HasPermission(Passport, Permission, Level)` | ... | bool | Checks direct permission |
| `vRP.HasGroup(Passport, Permission, Level)` | ... | bool | Checks group (includes parents) |
| `vRP.HasService(Passport, Permission)` | ... | bool | Checks if in service |
| `vRP.SetPermission(Passport, Permission, Level, Mode)` | ... | — | Sets permission |
| `vRP.RemovePermission(Passport, Permission)` | ... | — | Removes permission |
| `vRP.ServiceToggle(Source, Passport, Permission, Silenced)` | ... | — | Toggles service |
| `vRP.NumPermission(Permission, Level)` | ... | table, number | Players in service |
| `vRP.CheckGroup(Passport, Type)` | ... | bool | Checks group by type |
| `vRP.HasAction(Passport)` | Passport | bool | Checks police action |
| `vRP.SetAction(Passport, Status)` | ... | — | Sets action status |

### Survival

| Function | Parameters | Description |
|--------|------------|-----------|
| `vRP.UpgradeHunger(Passport, Amount)` | ... | Increases hunger |
| `vRP.DowngradeHunger(Passport, Amount)` | ... | Decreases hunger |
| `vRP.UpgradeThirst(Passport, Amount)` | ... | Increases thirst |
| `vRP.DowngradeThirst(Passport, Amount)` | ... | Decreases thirst |
| `vRP.UpgradeInfection(Passport, Amount)` | ... | Increases infection |
| `vRP.DowngradeInfection(Passport, Amount)` | ... | Decreases infection |
| `vRP.Revive(source, Health)` | ... | Revives player |

### Database

```lua
-- Register prepared query
vRP.Prepare("name/query", "SELECT * FROM table WHERE id = @id")

-- Execute query
local result = vRP.Query("name/query", { id = 123 })
```

Uses **oxmysql** internally. Parameters with `@name`.

### Persistent Data

```lua
-- Server Data (entitydata — global data)
local data = vRP.GetSrvData("UniqueKey")
vRP.SetSrvData("UniqueKey", { field = "value" })

-- Player Data (playerdata — data per player)
local data = vRP.UserData(Passport, "key")
vRP.setUData(Passport, "key", json.encode(data))
```

### Global Utilities

| Function | Description |
|--------|-----------|
| `parseInt(value)` | Converts to integer (min. 0) |
| `parseFormat(value)` | Formats number with thousand separator |
| `splitString(str, symbol)` | Splits string by separator |
| `SplitOne(name)` | First element of split |
| `sanitizeString(str, chars, allow)` | Filters characters |
| `CompleteTimers(seconds)` | Formats full time in HTML |
| `MinimalTimers(seconds)` | Formats summarized time |
| `CountTable(table)` | Counts items in table |
| `async(func)` | Executes asynchronous function |

## Client-Server Communication

### Notification Events

```lua
-- Server-side: simple notification
TriggerClientEvent("Notify", source, "success", "Message.", false, 5000)
-- Types: "success", "important", "negado" (denied)

-- Server-side: item notification
TriggerClientEvent("NotifyItens", source, { "+", "itemIndex", "amount", "Item Name" })
-- "+" for gain, "-" for loss
```

### Important Events

| Event | Side | Description |
|--------|------|-----------|
| `"Connect"` | Server | Player chose character `(Passport, Source)` |
| `"Disconnect"` | Server | Player disconnected `(Passport, Source)` |
| `"CharacterChosen"` | Server | Character chosen `(Passport, source)` |
| `"vRP:Active"` | Client | Player activated `(source, Passport, Name)` |

## vRPex Compatibility

The vRP Creative Network has compatibility aliases with classic vRP:

| vRPex (old) | Creative Network (current) |
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

**ALWAYS use the native Creative Network names** (right column), not the aliases.

## Additional References

- For complete and detailed API: [reference.md](reference.md)
- For code examples: [examples.md](examples.md)
- For resource templates: [templates.md](templates.md)
- For patterns and conventions: [patterns.md](patterns.md)
- For general FiveM best practices (performance, security, cache): use skill `fivem-development`
- For NUI interface construction (React + Vite): use skill `fivem-react-nui`
