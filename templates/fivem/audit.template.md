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
| S1 | Critical | `server/server.lua:123` | Server event gives items without `SafeEvent` | Wrap with `exports["cerberus"]:SafeEvent(source, "eventName", { time = N })` |

Checklist used:

- [ ] Money/item/advantage events use Cerberus `SafeEvent`
- [ ] Client data validated on server (never trust NUI/client payload)
- [ ] Permission/group checks before sensitive actions
- [ ] Events with `source = -1` protected (`noBan = true`)
- [ ] DB queries from client-triggered events protected
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
- [ ] Network payloads small (delta, not full tables)
- [ ] Threads use dynamic `Wait` based on distance/state

### Patterns & Code Quality

| ID | Severity | File | Issue | Recommendation |
|----|----------|------|-------|----------------|
| C1 | Medium | `fxmanifest.lua` | Over-split server scripts | Merge into `server/server.lua` (see best-practices §3.5) |
| C2 | Low | `client/core.lua:26-28` | `finishSpawnSelection()` only calls `TriggerEvent` | Remove wrapper; inline `TriggerEvent("login:Spawn", false)` at call sites, or one helper that also closes NUI/camera |

Checklist used:

- [ ] Monolith-first layout (`server.lua` / `client.lua`)
- [ ] State/constants at file top (§3.8)
- [ ] No comment noise / banner blocks (§3.7)
- [ ] Helpers reused, not duplicated globals (§3.6)
- [ ] No thin event-only wrappers — inline `TriggerEvent` or one real helper (§1.3)
- [ ] Lookup tables instead of long if/else (§3.2)
- [ ] nil-safe string concat (§3.4)

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

1. [ ] P1 — ...
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

- `.cursor/skills/fivem-development/best-practices.md` (§1–4, §3.5–3.10)
- Framework skill: `{{FRAMEWORK_SKILL}}`
