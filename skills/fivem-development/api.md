# FiveM Best Practices — APIs & Cerberus Exports

**Author:** Elias Araújo  
**Part of:** [best-practices.md](best-practices.md) index (one skill: `fivem-development`)  
**Section numbers** (`§1.6.1`, `§2.4`, …) are stable — keep them when linking from audits/corrections.

---

## Cerberus public API

Use these exports only — never invent cerberus/cacheaside helpers. For FiveM natives and framework APIs, verify from official docs (see skill `SKILL.md` → No Hallucination Policy).

### 4.3 Exports

| Export | Alias | Purpose |
|--------|-------|---------|
| `SendFullSync(targets, eventName, payload, options)` | `SyncFull` | Full/bootstrap sync; replaces pending job for same `key` |
| `SendDeltaSync(targets, eventName, payload, options)` | `SyncDelta` | Unit update; does not replace pending jobs by default |
| `SendBalancedPayload(targets, eventName, payload, options)` | `QueueBalancedPayload` | Generic/manual control |

**`targets`:** `source`, `-1`, or table of sources.

**`options`:** `key`, `coords`, `range`, `scopeRadius`, `replacePending`, `syncKind`.

- `range`: players near `coords` receive first; others receive later
- `scopeRadius`: with `coords` and `-1`, only players inside radius receive the event

### 4.4 Examples

**Full sync (player bootstrap):**
```lua
exports["cerberus"]:SendFullSync(
    source,
    "chest:fullSync",
    chestCacheSanitized,
    {
        key = "inventory:chests:full",
        coords = GetEntityCoords(GetPlayerPed(source)),
        range = 150.0
    }
)
```

**Delta update:**
```lua
exports["cerberus"]:SendDeltaSync(-1, "chest:updateChest", chestData)
```

**Delta delete:**
```lua
exports["cerberus"]:SendDeltaSync(-1, "chest:deleteChest", { name = chestName })
```

**Client consumer:**
```lua
RegisterNetEvent("chest:updateChest")
AddEventHandler("chest:updateChest", function(chestData)
    allChests[chestData.name] = chestData
    UpdateTargetZones(chestData.name)
end)
```
