# FiveM Audit — {{RESOURCE_OR_SCOPE}}

**Date:** {{DATE}}  
**Framework:** {{FRAMEWORK}}  
**Scope:** {{SCOPE_PATHS}}  
**Coverage:** Full resource (fxmanifest) | Single file only (state reason)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

One-paragraph overview of the main risks and quick wins.

---

## Manager Events Matrix (§5.1)

| Event | File:line | SafeEvent | Real permission | Cooldown-only trap | Verdict |
|-------|-----------|-----------|-----------------|-------------------|---------|
| `manager:getGarages` | `server/adapter.lua:571` | ❌ | ❌ | — | **Critical** — data leak |
| `manager:createGarage` | `server/adapter.lua:463` | ✅ | ❌ (only cooldown) | `CanUseGarageManager` | **Critical** |
| `manager:deleteGarage` | `server/adapter.lua:676` | ❌ | ❌ | cooldown | **Critical** |

Or: **N/A** — no manager/admin events in scope.

**Systemic finding (if multiple rows lack auth):** list all events in one S* row; fix with shared `CanManageResource(source)`.

---

## View Cache Matrix (§2.4 Pass 2)

| Row | Check | Found? | File:line | Severity |
|-----|-------|--------|-----------|----------|
| V-a | `build*` inside `TriggerClientEvent` args | | | High |
| V-b | `build*List()` in get/open handler | | | High |
| V-c | Double build (item + list same handler) | | | High |
| V-d | Triple sync (delta + list + `Load*Player`) | | | High |
| V-e | `Load*Player` on connect | | | High |
| V-f | `Load*Player` after CRUD + delta exists | | | High |
| V-g | Full `Load*Cache()` after one DB write | | | Medium |
| V-h | Duplicate transform / duplicate fn | | | Medium |
| V-i | Manual `ChunkTable` + `Wait` | | | Medium |

Mark **N/A** only when the resource has no caches/sync — explain why.

---

## Globals Table (§3.6)

| Symbol | Declared | Used in files | Verdict |
|--------|----------|---------------|---------|
| `GarageCache` | `adapter.lua:5` | `adapter.lua` only | → `local` |
| `GarageLocates` | `adapter.lua:258` | `adapter.lua`, `server.lua` | **OK** — cross-file server |
| `GarageVehicleSetCache` | `adapter.lua:840` | `adapter.lua` only | → `local` |

---

## Findings

### Security

| ID | Severity | File:line | Symbol | Issue | Recommendation |
|----|----------|-----------|--------|-------|----------------|
| S1 | Critical | `server/adapter.lua:571` | `manager:getGarages` | No server auth; leaks full garage list with perms | Shared `CanManageResource`; block before send |
| S2 | Critical | `server/adapter.lua:676` | `manager:deleteGarage` | No SafeEvent; no real permission | SafeEvent + `CanManageResource` |

Checklist:

- [ ] Manager events matrix complete
- [ ] Cooldown helpers not mistaken for permission
- [ ] SafeEvent on all mutating admin events (compare siblings)
- [ ] Client/NUI data re-validated on server
- [ ] No secrets in client files

### Performance — View Cache (IDs = matrix row)

| ID | Severity | File:line | Symbol | Issue | Recommendation |
|----|----------|-----------|--------|-------|----------------|
| V-a | High | `server/adapter.lua:668` | `manager:updateGarage` | `buildManagerGarageListItem(...)` in `TriggerClientEvent` | `ViewCache[id]` on CRUD |
| V-b | High | `server/adapter.lua:574` | `manager:getGarages` | `buildManagerGarageList()` every request | Send `getViewList()` from cache |
| V-c | High | `server/adapter.lua:565` | `manager:createGarage` | `listItem` + `buildManagerGarageList()` same handler | Single cache rebuild |
| V-d | High | `server/adapter.lua:567` | `manager:createGarage` | `receiveGarages` + `LoadGaragePlayer` + delta | Keep delta only |
| V-e | High | `server/adapter.lua:837` | `playerConnect` | Full sanitize/chunk every connect | Pre-built chunks |
| V-f | High | `server/adapter.lua:669` | `manager:updateGarage` | `LoadGaragePlayer` after update | Use existing delta fn |
| V-g | Medium | `server/adapter.lua:947` | `CreateGarageVehicleSet` | `LoadGarageVehicleSetCache()` full DB | Upsert one entry |

**Snippet (required for High/Critical):**

```lua
-- Before @ adapter.lua:668
TriggerClientEvent("manager:garageUpdated", source, buildManagerGarageListItem(id, cacheEntry))

-- After
TriggerClientEvent("manager:garageUpdated", source, ManagerGarageListCache[id])
```

### Performance — General

| ID | Severity | File:line | Issue | Recommendation |
|----|----------|-----------|-------|----------------|
| P1 | High | `client/client.lua:45` | `Wait(0)` idle loop | Dynamic sleep |

### Patterns & Code Quality

| ID | Severity | File:line | Issue | Recommendation |
|----|----------|-----------|-------|----------------|
| C1 | Medium | `adapter.lua:288,842` | `decodeJsonField` defined twice | Remove duplicate |
| G1 | Medium | `adapter.lua:5` | `GarageCache` global, single-file use | `local GarageCache` |

### NUI (if applicable)

| ID | Severity | File | Issue | Recommendation |
|----|----------|------|-------|----------------|
| N1 | Medium | `web/script.js` | Missing `cb("{}")` | Return valid JSON |

---

## Correction Plan

**Severity ↔ phase must match (§2.4 Pass 5).**

### Phase 1 — Critical security

1. [ ] S1 — `CanManageResource` on all `manager:*` read/list/teleport events
2. [ ] S2 — SafeEvent on delete events; real permission on CRUD

### Phase 2 — High (view cache + hot paths)

1. [ ] V-a — remove build-on-send
2. [ ] V-b — cache list for get/open handlers
3. [ ] V-c / V-d — remove double/triple sync on create
4. [ ] V-e — pre-build chunks for connect
5. [ ] V-f — delta-only on update/delete
6. [ ] P1 — ...

### Phase 3 — Medium

1. [ ] V-g — incremental cache after DB write
2. [ ] C1 / G1 — dedupe functions; local globals

### Phase 4 — Low

1. [ ] ...

---

## Pass 6 Self-Check (§2.4)

- [ ] All fxmanifest Lua files in **Files reviewed**
- [ ] View cache matrix V-a–V-i each marked Found or N/A
- [ ] Every finding has correct **symbol** (event/fn name)
- [ ] Line numbers verified by reading file
- [ ] Globals table complete (server + client scope)
- [ ] Manager matrix complete or N/A
- [ ] Phase plan matches finding severities
- [ ] Before/after snippets for all Critical/High items

---

## Files Reviewed

| File | Lines | Side |
|------|-------|------|
| `src/server/adapter.lua` | 1162 | server |
| `src/server/server.lua` | 1553 | server |
| `src/client/client.lua` | 400 | client |
| `fxmanifest.lua` | 37 | — |

## Skills Referenced

- `fivem-development/best-practices.md` — §2.2–2.4, §3.6, §5.1
- Framework skill: `{{FRAMEWORK_SKILL}}`
