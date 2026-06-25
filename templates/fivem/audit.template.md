# FiveM Audit — {{RESOURCE_OR_SCOPE}}

**Date:** {{DATE}}  
**Framework:** {{FRAMEWORK}}  
**Scope:** {{SCOPE_PATHS}}

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

## Findings

### Security

| ID | Severity | File | Issue | Recommendation |
|----|----------|------|-------|----------------|
| S1 | Critical | `server/server.lua:123` | Server event gives items without validation | Add server-side permission, distance, and item checks before granting reward |

Checklist used:

- [ ] Money/item/advantage server events use `cerberus` `SafeEvent` **and** server-side validation
- [ ] Repetitive client/NUI actions use `cerberus` `SetCooldown` before triggering server events
- [ ] Client data validated on server (never trust NUI/client payload)
- [ ] Permission/group checks before sensitive actions
- [ ] Events with `source = -1` guarded against floods
- [ ] DB queries from client-triggered events throttled or cached
- [ ] Large server→client sync uses cerberus `SendFullSync` / `SendDeltaSync` instead of manual chunking
- [ ] No secrets/webhooks hardcoded in client files

### Performance

| ID | Severity | File | Issue | Recommendation |
|----|----------|------|-------|----------------|
| P1 | High | `client/client.lua:45` | `Wait(0)` in idle loop | Dynamic sleep or event-driven |

Checklist used:

- [ ] No unnecessary callbacks when events suffice
- [ ] No callbacks/events inside tight loops
- [ ] No `TriggerEvent` for same-side calls when a local function exists
- [ ] No thin wrappers (`local function x() TriggerEvent(...) end`)
- [ ] Repeated DB reads use `cacheaside`
- [ ] Large payloads use cerberus sync or delta updates (not full tables every time)
- [ ] Network payloads small (delta, not full tables)
- [ ] Threads use dynamic `Wait` based on distance/state

#### View cache & hot-path rebuild (§2.2–2.3)

| ID | Severity | File | Issue | Recommendation |
|----|----------|------|-------|----------------|
| V1 | High | `server/adapter.lua:574` | `buildList()` on every `getGarages` event | `ViewListCache` rebuilt at load/CRUD only; handler sends cache |
| V2 | High | `server/adapter.lua:438` | `SanitizeCache` + chunks on every `playerConnect` | Pre-build sanitized chunks at load; connect sends cached chunks |
| V3 | High | `server/adapter.lua:668` | `buildItem()` inside `TriggerClientEvent` | `ViewCache[id]` rebuilt on CRUD; event sends cached item |
| V4 | High | `server/adapter.lua:567` | Full `Load*Player` after single create | Delta `updateGarage` / `SendDeltaSync`; drop redundant full reload |
| V5 | Medium | `server/adapter.lua:947` | `Load*Cache()` full DB after one insert | Upsert one row in memory + `rebuildViewItem(id)` |

Checklist used:

- [ ] Transform functions (`build*`, `Sanitize*`, `Get*Summary*`) not called on hot paths (events, connect, TriggerClientEvent args)
- [ ] Source cache + view cache (or sanitized cache) — view rebuilt at load/CRUD only
- [ ] No double build (single item + full list) in same handler
- [ ] CRUD sends delta, not full player resync, when delta path exists
- [ ] No manual `ChunkTable` + `Wait` when cerberus or pre-built chunks apply
- [ ] No full DB `Load*Cache()` after single-row write
- [ ] Duplicate transforms consolidated into one build → view cache

**Correction snippet (example):**

```lua
-- Before (hot path)
TriggerClientEvent("manager:receiveGarages", source, buildManagerGarageList())

-- After
TriggerClientEvent("manager:receiveGarages", source, getManagerGarageListCached())
```

### Patterns & Code Quality

| ID | Severity | File | Issue | Recommendation |
|----|----------|------|-------|----------------|
| C1 | Medium | `fxmanifest.lua` | Over-split server scripts | Merge into `server/server.lua` (see best-practices §3.5) |
| C2 | Low | `client/core.lua:26-28` | `finishSpawnSelection()` only calls `TriggerEvent` | Remove wrapper; inline `TriggerEvent("login:Spawn", false)` at call sites, or one helper that also closes NUI/camera |

Checklist used:

- [ ] Monolith-first layout (`server.lua` / `client.lua`)
- [ ] State/constants at file top (§3.8)
- [ ] No comment noise / banner blocks (§3.7)
- [ ] Globals justified — read by another file in **same scope** (server→server or client→client); else `local` (§3.6)
- [ ] No duplicate functions (`decodeJsonField` twice in same resource)
- [ ] No thin event-only wrappers — inline `TriggerEvent` or one real helper (§1.3)
- [ ] Lookup tables instead of long if/else (§3.2)
- [ ] nil-safe string concat (§3.4)

| ID | Severity | File | Issue | Recommendation |
|----|----------|------|-------|----------------|
| G1 | Low | `server/adapter.lua:5` | `GarageCache` global but only used in this file | Change to `local GarageCache = {}` |
| G2 | — | `server/adapter.lua:5` | `GarageCache` global, read in `server/spawn.lua` | **OK** — cross-file same scope |

### NUI (if applicable)

| ID | Severity | File | Issue | Recommendation |
|----|----------|------|-------|----------------|
| N1 | Medium | `web/script.js` | Missing `cb("{}")` on NUI callback | Return valid JSON to avoid fetch errors |

---

## Correction Plan

Execute in this order. **Do not implement until user approves.**

### Phase 1 — Critical security (immediate)

1. [ ] S1 — ...
2. [ ] ...

### Phase 2 — High performance / exploit surface

1. [ ] V1 — view cache: stop rebuild on `getGarages` / manager open
2. [ ] V2 — pre-build sanitized chunks; fix connect bootstrap
3. [ ] V3 — `ViewCache[id]` on CRUD; remove build-on-send
4. [ ] V4 — replace full `Load*Player` with delta on CRUD
5. [ ] P1 — ...
2. [ ] ...

### Phase 3 — Patterns & maintainability

1. [ ] C1 — ...
2. [ ] ...

### Phase 4 — Low priority / polish

1. [ ] ...

---

## Files Reviewed

- `path/to/file.lua`
- ...

## Skills Referenced

- `.cursor/skills/fivem-development/best-practices.md` (§1–4, §2.2–2.3 view cache audit, §3.5–3.10)
- Framework skill: `{{FRAMEWORK_SKILL}}`
