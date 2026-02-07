# Complete Reference — vRP Creative Network

## Framework Structure

```
vrp/
├── client/           # Client-side scripts
│   ├── base.lua      # Proxy/Tunnel client, ClosestPed, GetPlayers
│   ├── gui.lua       # Animations, commands (walk, crouch, point, etc.)
│   ├── iplloader.lua # IPL loading
│   ├── noclip.lua    # Noclip system (admin)
│   ├── objects.lua   # Management of attached objects
│   ├── playanim.lua  # Animation system
│   ├── player.lua    # Player logic client-side
│   └── vehicles.lua  # Vehicle functions client-side
├── config/
│   ├── Global.lua    # Global configurations (spawn, weights, times, etc.)
│   ├── Groups.lua    # Groups/permissions definition
│   ├── Item.lua      # Item definition (weight, durability, etc.)
│   ├── Native.lua    # Native configurations
│   ├── Vehicle.lua   # Vehicle configurations
│   └── Webhooks.lua  # Webhook URLs
├── frameworks/
│   └── vrpex.lua     # Compatibility aliases with classic vRP
├── lib/
│   ├── Proxy.lua     # Proxy system (inter-resource server communication)
│   ├── Tools.lua     # Auxiliary utilities
│   ├── Tunnel.lua    # Tunnel system (client↔server communication)
│   └── Utils.lua     # Global utility functions (parseInt, splitString, async, etc.)
├── modules/          # Server-side modules
│   ├── base.lua      # Core: connection, ban, passport, datatable, inventory
│   ├── cooldown.lua  # Cooldown system
│   ├── drugs.lua     # Drugs system
│   ├── fiveguard.lua # FiveGuard anti-cheat integration
│   ├── funtionslib.lua # Helper functions
│   ├── groups.lua    # Groups/permissions/service system
│   ├── identity.lua  # Identity, prison, badges, plate/phone generation
│   ├── inventory.lua # Inventory, items, chests, server data
│   ├── misc.lua      # Miscellaneous functions
│   ├── money.lua     # Monetary system (bank, coins, gems, fines)
│   ├── party.lua     # Party system
│   ├── player.lua    # Player: survival, objects, teleport, bucket
│   ├── prepare.lua   # Prepared SQL queries
│   ├── queue.lua     # Queue system
│   ├── rolepass.lua  # Rolepass system
│   ├── salary.lua    # Salary system
│   ├── street.lua    # Data cleanup
│   ├── vehicles.lua  # Server-side vehicle functions
│   └── vrp.lua       # Entry point: initializes Proxy/Tunnel
└── fxmanifest.lua    # Resource manifest
```

## FiveM Natives — Official Source

- Docs: https://docs.fivem.net/natives/
- Official Repository (mirror): https://github.com/proelias7/fivem-natives

## Creative v5 (previous version) — core differences

Creative v5 maintains the architecture, but the core uses **`camelCase` naming**.

### Files with different names

- `modules/group.lua` (v5) ↔ `modules/groups.lua` (Creative Network)
- `config/groups.lua`/`itemlist.lua`/`natives.lua`/`vehicles.lua` (v5) ↔ `Groups.lua`/`Item.lua`/`Native.lua`/`Vehicle.lua`

### Function Map (core v5 → Creative Network)

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

## vRPEX (older variation) — core differences

vRPEX maintains the same base, but uses **classic naming** in the core and configs in `cfg/`.

### Files with different names

- `cfg/*.lua` (vRPEX) ↔ `config/*.lua` (Creative Network)
- `server/*`/`client/*` (vRPEX) ↔ `modules/*`/`client/*` (Creative Network)

### Function Map (vRPEX → Creative Network)

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

## Important Global Tables

### Characters (server-side)

```lua
Characters[source] = {
    id = 123,           -- Passport
    name = "John",
    name2 = "Doe",
    phone = "123-456",
    bank = 50000,
    coins = 100,
    license = "steam:xxxxx",
    prison = 0,
    fines = 0,
    spending = 0,
    badges = "{}",
    sex = "Male",
    blood = "A+",
    ["table"] = {       -- Datatable (in-memory data)
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
Sources[Passport] = source  -- Reverse lookup: Passport → source
```

### Inventory (slot structure)

```lua
Datatable.Inventory = {
    ["1"] = { item = "WEAPON_PISTOL", amount = 1 },   -- Slots 1-5 = hotbar (visual weapons)
    ["6"] = { item = "dollars", amount = 5000 },
    ["7"] = { item = "water", amount = 3 },
    ["8"] = { item = "medkit-1706745600", amount = 1 } -- Item with durability (timestamp)
}
```

**Inventory Rules:**
- Slots 1–5: hotbar (weapons visually created on player)
- Items with durability: `"item-timestamp"` (e.g., `"medkit-1706745600"`)
- Items with charges: `"item-charges"` (e.g., `"repairkit01-5"`)
- `vRP.GiveItem` = without processing durability
- `vRP.GenerateItem` = processes durability/charges automatically

## Prepared Queries (DB Tables)

### characters

```sql
-- Fields: id, license, name, name2, sex, phone, blood, bank, coins, 
--         prison, fines, taxs, spending, badges, deleted, gunlicense,
--         tracking, likes, unlikes, medicplan, chars
```

### accounts

```sql
-- Fields: id, license, discord, gems, rolepass, premium, whitelist, chars
```

### vehicles

```sql
-- Fields: Passport, vehicle, plate, work, tax, rental, arrest, engine,
--         body, health, fuel, doors, windows, tyres, brakes, nitro, drift, mode, dismantle
```

### playerdata

```sql
-- Fields: Passport, dkey, dvalue (JSON)
-- Data per player, key-value
```

### entitydata

```sql
-- Fields: dkey, dvalue (JSON)
-- Global server data (chests, permissions, etc.)
-- Special keys: "Permissions:GroupName", "Chest:ChestName"
```

### propertys

```sql
-- Fields: Name, Interior, Passport, Serial, Vault, Fridge, Tax, Garage, Item
```

## Item Functions (config/Item.lua)

These functions come from items configuration:

| Function | Return | Description |
|--------|---------|-----------|
| `itemName(item)` | string | Item name |
| `itemWeight(item)` | number | Item weight |
| `itemType(item)` | string | Type: "Armament", "Throwing", etc. |
| `itemBody(item)` | bool | If item has body (displayable) |
| `itemIndex(item)` | string | Index/icon of item |
| `itemMaxAmount(item)` | number | Maximum allowed amount |
| `itemDurability(item)` | number\|nil | Durability in days |
| `itemCharges(item)` | number\|nil | Charges of item |
| `itemRepair(item)` | string\|nil | Repair item needed |
| `itemScape(item)` | bool | If item has amount exception |

## Chests System

```lua
-- Fetch data from a chest (uses entitydata/GetSrvData)
local chestData = vRP.GetSrvData("Chest:ChestName")

-- Take item from chest to inventory
vRP.TakeChest(Passport, "Chest:ChestName", Amount, ChestSlot, InventorySlot)

-- Store item in chest
vRP.StoreChest(Passport, "Chest:ChestName", Amount, MaxWeight, InventorySlot, ChestSlot)

-- Move item inside chest
vRP.UpdateChest(Passport, "Chest:ChestName", OriginSlot, DestSlot, Amount)

-- Add money directly to chest
vRP.DirectChest("ChestName", Slot, Amount)
```

## Fines and Taxes System

```lua
-- Fines
vRP.GiveFine(Passport, Amount)      -- Adds fine
vRP.RemoveFine(Passport, Amount)    -- Removes fine
vRP.GetFine(source)                 -- Gets total fines

-- Prison
vRP.InitPrison(Passport, Amount)    -- Starts prison (services)
vRP.UpdatePrison(Passport, Amount)  -- Reduces prison services
```

## Tunnel Rate Limiting

Tunnel system has protections:
- **150 calls/second** per identifier
- **Warning** on payloads > 64KB
- **Limit** of 256KB per payload
- **Timeout** of 30 seconds
- Automatic anti-flood

## LocalPlayer States (client-side)

```lua
LocalPlayer["state"]["Active"]     -- Active player (character chosen)
LocalPlayer["state"]["Passport"]   -- Player Passport
LocalPlayer["state"]["Name"]       -- Player Name
LocalPlayer["state"]["Admin"]      -- In admin service
LocalPlayer["state"]["Police"]     -- In police service
LocalPlayer["state"]["Route"]      -- Current routing bucket
LocalPlayer["state"]["Handcuff"]   -- Handcuffed
LocalPlayer["state"]["Cancel"]     -- Action cancelled
LocalPlayer["state"]["Commands"]   -- Using commands
LocalPlayer["state"]["Invisible"]  -- Invisible
LocalPlayer["state"]["Invincible"] -- Invincible
LocalPlayer["state"]["usingPhone"] -- Using phone
LocalPlayer["state"]["Buttons"]    -- Buttons blocked
LocalPlayer["state"]["Race"]       -- In race
LocalPlayer["state"]["Target"]     -- Target active
```

## Client-side Functions (tvRP)

```lua
-- Gets closest players
local players = tvRP.ClosestPeds(Radius)

-- Gets closest player
local serverId = tvRP.ClosestPed(Radius)

-- Sets GPS
tvRP.setGPS(x, y)

-- Creates attached objects
tvRP.CreateObjects(Dict, Anim, Prop, Flag, Hands, Pos1-6)

-- Destroys objects/animations
tvRP.Destroy(Mode)  -- "one", "two", or nil (both)

-- Sound
tvRP.PlaySound(Dict, Name)
```

## External Dependencies

| Resource | Usage |
|----------|-----|
| `oxmysql` | MySQL Database |
| `webhook` | `exports["webhook"]:Send(channel, title, fields)` |
| `inventory` | Inventory UI, weapons |
| `request` | Request system (accept/deny) |
| `taskbar` | Progress bar |
| `survival` | Health/death system |
| `cerberus` | Anti-exploit and rate-limiting (v2.0) |
| `cacheaside` | In-memory cache with TTL for queries |

### Official Repositories

```bash
git clone git@github.com:proelias7/cacheaside.git
git clone git@github.com:proelias7/cerberus.git
```

In `server.cfg`, add before scripts that depend on them:

```cfg
ensure cacheaside
ensure cerberus
```

## Cerberus v2.0 — Quick API

### SafeEvent (server-side)

```lua
-- Returns true if blocked, false if allowed
exports["cerberus"]:SafeEvent(source, "eventName", {
    time = 10,            -- minimum interval (seconds)
    noBan = false,        -- do not ban automatically
    position = true,      -- check distance
    positionDist = 2,     -- minimum distance (meters)
    notification = true,  -- notify player when blocked
    blockThreshold = 3,   -- suspicions before blocking
    silentLog = false,    -- silent log
    data = "extra info"   -- data for log
})
```

### SetCooldown (client-side)

```lua
-- Returns true if blocked, false if allowed
-- Time-based
exports["cerberus"]:SetCooldown("name", 3000) -- 3 seconds

-- Hit-based (allows N attempts before blocking)
exports["cerberus"]:SetCooldown("name", 5000, 3) -- 3 hits, then blocks 5s
```
