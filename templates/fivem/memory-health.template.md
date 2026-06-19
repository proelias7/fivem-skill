# Memory health — {{SCOPE}}

**Date:** {{DATE}}  
**Framework:** {{FRAMEWORK}}  
**Mode:** {{MODE}}  
**Topics checked:** {{TOPIC_COUNT}}

---

## Summary

| Status | Count |
|--------|-------|
| OK | 0 |
| Stale | 0 |
| Broken | 0 |
| Integration | 0 |
| Token | 0 |

One-paragraph overview: drift vs codebase, index/reference sync, compact-format gaps.

---

## Per topic

| Topic | File | Paths | Events/symbols | Token | Verdict |
|-------|------|-------|----------------|-------|---------|
| craft | `memory/craft.md` | 2/3 missing | 1 stale | needs compact | **Broken** |

### craft — details

**Missing paths:**
- `resources/old/craft/config.lua` — file not found

**Stale symbols (not in repo):**
- `RegisterNetEvent("craft:legacyFinish")` — no matches

**Token issues:**
- missing `lang: en-compact`
- 94 lines (target 25–60)
- PT-BR section headers (`## Arquivos principais`)

**Fix applied:** _(none | compact rewrite | pruned stale lines | re-learn recommended)_

---

## Integration

| Check | Status | Notes |
|-------|--------|-------|
| `_index.md` vs `memory/*.md` | OK / drift | orphan rows, missing rows |
| `reference.mdc` `## Memórias por tópico` | OK / drift | stale links |
| Catalog orphans (not learned) | info | from `topic-catalog.md` |

---

## Actions

### Auto-fixed (fix mode)

- ...

### Manual / re-learn

- `/fivem learn <topic>` — ...

### Suggested next

- `/fivem graph` — refresh 3D map after fixes
