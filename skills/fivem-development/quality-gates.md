# FiveM Quality Gates — Definition of Done (task mode)

**Author:** Elias Araújo  
**Part of:** [best-practices.md](best-practices.md) index (one skill: `fivem-development`)  
**When to read:** Gate A (design plan), Implement (while coding), **before Gate V** (self-review loop).

> **Audit vs quality-gates:** `/fxmind audit` is the **independent** post-hoc review. This file is the **author's checklist** while writing code. You cannot mark a check as pass without evidence in the diff.

Theory lives in sibling files — this file only states **what to do** and **when**. Follow § links for details.

| Topic | File |
|-------|------|
| Tunnel, response budget, N+1 | [communication.md](communication.md) §1.1 |
| Payload, cache, broadcast, audit E-a…E-g | [performance.md](performance.md) §1.4–§1.6, §2.1, §2.1.1 |
| Monolith, globals | [architecture.md](architecture.md) §3.5–§3.6 |
| Comments, anti-patterns | [style.md](style.md) §3.7, §3.10 |
| SafeEvent, validation, auth | [security.md](security.md) §4.6–§4.8, §5.1–§5.3 |
| cerberus exports | [api.md](api.md) |

---

## Gate A — QUALITY plan (design review)

When the task touches a FiveM resource, add a **QUALITY** block to Gate A (3–6 lines):

```
QUALITY:
  endpoints: <new/changed names + type: event|Tunnel|NUI>
  payload:   <estimated KB per response; list = metadata only>
  cache:     <server cacheaside §2.1 | client §2.1.1 | none + why>
  validate:  <§5.3 checks per mutation>
  rate-limit:<SafeEvent on server | SetCooldown on client | both>
  fan-out:   <source | -1 small delta | cerberus | none>
```

**Refactor tasks** also declare:

```
INVARIANTS: <behavior that must not change>
```

If you cannot fill a line, read the checklist below before editing.

---

## Checklist by artifact

Apply **every row** that matches something you created or changed in the diff.

### Endpoint (RegisterNetEvent, Tunnel `func.*`, NUI→server chain)

| # | Check | Rule | Ref |
|---|-------|------|-----|
| E1 | Identity early | `source` + Passport/user_id before any work | §5.1 |
| E2 | Rate-limit | Mutations + expensive reads: `SafeEvent` on server | §4.6 |
| E3 | Input validation | Mutations: type/shape, whitelist keys, ranges, string cap **before** DB write | §5.3 |
| E4 | Response size | List endpoints return **metadata only**; heavy fields (LONGTEXT, base64) on demand or batch | §1.6, E-f |
| E5 | No N+1 | Client never loops server calls per list item; use batch `getDetails(ids[])` | §1.4, E-g |
| E6 | Cache | Repeated per-user reads → `cacheaside` (§2.1); UI re-reads → client cache (§2.1.1) | §2.1, §2.1.1 |
| E7 | Fan-out | Admin/UI → `source`; world small delta → `-1`; large → cerberus | §1.6.1 |
| E8 | Admin class | `manager:*` / `admin:*` need **real** permission, not cooldown-only | §5.1 |

### Sync / broadcast

| # | Check | Rule | Ref |
|---|-------|------|-----|
| S1 | Target | Never `TriggerClientEvent("manager:*", -1, ...)` | §1.6.1 |
| S2 | Large payload | Never manual `ChunkTable` + `Wait`; use cerberus `SendFullSync`/`SendDeltaSync` | §4.2 |
| S3 | Pre-built | Send from view cache, not `build*(id, raw)` on hot path | §2.2 |

### DB write

| # | Check | Rule | Ref |
|---|-------|------|-----|
| D1 | Validate first | No client string → SQL without §5.3 checks | §5.3 |
| D2 | Invalidate cache | Same handler that writes also `Delete`/`Set` cacheaside key | §2.1 |
| D3 | Async | No `executeSync` on hot paths; prefer `*_async` | performance |
| D4 | Ownership | Mutations include `AND user_id = ?` (or equivalent) | §5.1 |

### NUI callback

| # | Check | Rule | Ref |
|---|-------|------|-----|
| N1 | Client cooldown | `SetCooldown` before `TriggerServerEvent` / Tunnel on mutating callbacks | §4.7 |
| N2 | JSON response | `cb({})` or valid JSON — not bare `"ok"` string | ui-guide |
| N3 | No trust | NUI `maxlength`/UI gates are not security; server validates | §5.3 |

### Refactor

| # | Check | Rule | Ref |
|---|-------|------|-----|
| R1 | Invariants | Gate A `INVARIANTS` preserved unless INTENT says otherwise | task.md |
| R2 | Small steps | One concern per commit-sized change; no drive-by refactors | task.md |
| R3 | Twins | Same defect pattern elsewhere → fix or list in Gate V `TWINS:` | task-verify |
| R4 | No scope creep | Do not "improve" unrelated files | failure-modes #11 |

### Clean code (always)

| # | Check | Rule | Ref |
|---|-------|------|-----|
| C1 | Monolith | Stay in `server.lua`/`client.lua` unless split is justified | §3.5 |
| C2 | No noise | Comment only non-obvious rules — not every line | §3.7 |
| C3 | No thin wrappers | No `local function x() TriggerEvent(...) end` with no other logic | §1.3 |
| C4 | Lookup tables | 3+ conditions → table lookup, not long if/elseif | §3.1 |
| C5 | Dead code | Remove unused imports/bindings touched by the diff | §3.6 |

---

## Self-review loop (before Gate V)

Run this on **your own diff** after Implement, before reading `task-verify.md`. Max **2** self-review cycles; then proceed to Gate V (fix remaining in verify if needed).

### Step 1 — Enumerate artifacts

List every artifact the diff touches:

```text
endpoints:  func.saveOutfit (Tunnel mutate), NUI save (chain)
broadcast:  none
db-writes:  INSERT wardrobe_presets
nui:        RegisterNUICallback save
refactor:   no | yes → INVARIANTS: ...
```

### Step 2 — Check each artifact

For each row in the checklist above that applies, mark **pass** or **fail + file:line**. Use audit severity anchors mentally: missing SafeEvent on mutation = fail; oversized list response = fail; N+1 loop = fail.

### Step 3 — Clean code pass

Scan diff for C1–C5. Fail = fix before Gate V.

### Step 4 — Fix or document

- **Fix** every fail you can in ≤2 cycles.
- **Cannot fix** (out of scope) → list in Gate V `REVIEW: ... fixed: [...] deferred: [...]`.

### Gate V artifact (required verbatim)

```
REVIEW: endpoints <n> (<names>) — quality checks <pass|fixed: list|deferred: list> — clean-code <pass|fixed: list>
PARITY: <n/a | invariants preserved | changed: reason>   ← required on refactor tasks
```

---

## Worked examples (minimal)

### Endpoint — WRONG vs CORRECT

```lua
-- WRONG: mutation, no SafeEvent, no validation, echoes client payload
function func.saveOutfit(name, clothingData)
    local user_id = vRP.Passport(source)
    exports["oxmysql"]:insert_async("INSERT ...", { user_id, name, json.encode(clothingData.components) })
    return true, { name = name, components = clothingData.components }
end

-- CORRECT: SafeEvent → validate → write → return sanitized
function func.saveOutfit(name, clothingData)
    local source = source
    if exports["cerberus"]:SafeEvent(source, "wardrobe:saveOutfit", { time = 3, noBan = true }) then return false end
    local user_id = vRP.Passport(source)
    if not user_id then return false end
    if type(name) ~= "string" or #name < 1 or #name > 32 then return false end
    local clean = validateClothing(clothingData)  -- §5.3 whitelist + ranges
    if not clean then return false end
    -- INSERT clean ...
end
```

### List response — WRONG vs CORRECT

```lua
-- WRONG: full components + props for every preset (~290 KB tunnel_res)
return getPresets(user_id), maxSlots, baseSlots

-- CORRECT: metadata list; detail on apply/select
-- SELECT id, name, created_at  (no components/props in list)
-- func.applyOutfit(id) or func.getPresetDetail(id) for heavy fields
```

### N+1 — WRONG vs CORRECT

```lua
-- WRONG client loop
for _, preset in ipairs(presets) do
    local shot = func.getScreenshot(preset.id)  -- N Tunnel calls
end

-- CORRECT: one batch + client cache §2.1.1
local shots = func.getScreenshots(idsFrom(presets))
-- cache in presetsCache; invalidate on CRUD only
```

### NUI — WRONG vs CORRECT

```lua
-- WRONG
RegisterNUICallback("save", function(data, cb)
    func.saveOutfit(data.name, getCurrentClothing())
    cb("ok")
end)

-- CORRECT
RegisterNUICallback("save", function(data, cb)
    if exports["cerberus"]:SetCooldown("wardrobe:save", 2000) then cb({ success = false }); return end
    local ok, result = func.saveOutfit(data.name, getCurrentClothing())
    cb({ success = ok, preset = result })
end)
```

### Refactor — parity

```lua
-- WRONG: refactor rename + "while here" add SafeEvent to unrelated endpoints
-- CORRECT: one INTENT change; INVARIANTS: "apply still returns preset shape {id,name,components,props}"
-- TWINS: grep same missing-SafeEvent pattern in sibling handlers — fix or list
```

---

## Graph engineering (Gate B hook)

Before Implement, load context for the task's domain:

1. **`fxmind_query`** (~1500) on Gate A TOPICS.
2. **Memories** from `.fxmind/memory/_index.md` matching TOPICS.
3. **Corrections** from `.fxmind/corrections/` — categories map to skill files (`performance`, `security`, `communication`, `architecture`, `style`). Read entries whose domain matches the resource you touch.

Promote a pitfall found in self-review → `fxmind_record_correction` at Gate C (category = matching skill file).

---

## Quick reference — fail = do not ship

| Symptom in diff | Fix |
|-----------------|-----|
| New `func.*` mutation without `SafeEvent` | Add §4.6 at handler top |
| Client loop calling server per item | Batch endpoint §1.4 |
| List returns LONGTEXT/base64/json blobs | Metadata list §1.6 |
| `executeSync` in handler called from UI | `*_async` + cache §2.1 |
| Client re-fetches same data on every open | Client cache §2.1.1 |
| `cb("ok")` in NUI | `cb({})` |
| Refactor changed behavior not in INTENT | Revert or update INTENT + PARITY |

Router: [SKILL.md](SKILL.md) · Full audit: [performance.md](performance.md) §2.4–§2.5
