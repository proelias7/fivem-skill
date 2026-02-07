# Qbox Best Practices

## 1. Ox Lib Usage vs Native Loops

**Do:**
Use `lib.points` handling markers and interactions. It is significantly more optimized than native loops.
```lua
local point = lib.points.new({
    coords = vector3(441.0, -981.0, 30.0),
    distance = 5,
    drew = false,
})

function point:nearby()
    if self.currentDistance < 1 then
        lib.showTextUI('[E] Interaction')
    end
end
```

**Don't:**
Write loop-heavy code (`CreateThread` + `Wait`) for markers and close distance checks manually.

## 2. Exports vs Core Object

**Do:**
Use the `exports.qbx_core` API directly for cleaner, more explicit code.
```lua
local player = exports.qbx_core:GetPlayer(source)
```

**Don't:**
Retrieve the Core Object repeatedly or rely on it for things that exist natively as exports (unless porting legacy code).

## 3. Ox Inventory for Items

**Do:**
Interact with `exports.ox_inventory` for adding/removing items. Qbox delegates item management to it.
```lua
exports.ox_inventory:AddItem(source, 'water', 1)
```

**Don't:**
Try to use `Player.Functions.AddItem` if it's just a proxy. Using the inventory export directly is clearer and often exposes more options (metadata, slots).

## 4. Lib Callbacks (Async/Await)

**Do:**
Use `lib.callback.await` on the client to fetch server data synchronously (in code flow).
```lua
local cash = lib.callback.await('getMoney', false)
print("I have:", cash)
```

**Don't:**
Use legacy `QBCore.Functions.TriggerCallback` with nested functions unless necessary for compatibility.

## 5. Structured Logging

**Do:**
Use `lib.logger` for structured logging that can be parsed easily.
```lua
lib.logger(source, 'money_exploit', 'Player tried to add 1M cash')
```

**Don't:**
Use `print()` for critical errors or security logs.

## 6. Data Validation

**Do:**
Validate all inputs from client callbacks on the server side using `lib.callback.register`.
```lua
lib.callback.register('buyItem', function(source, itemName)
    if not Config.Items[itemName] then return false end
    -- Logic
end)
```

**Don't:**
Trust valid items/prices coming from the client.
