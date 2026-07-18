# FiveM Best Practices

**Author:** Elias Araújo  
**Focus:** Performance, Optimization, and Security (framework-agnostic)

> **Split index** — one Cursor skill (`fivem-development`), multiple reference files loaded on demand.  
> Section numbers (`§1.6.1`, `§2.4`, `§5.1`, …) stay stable across files.

| File | Contents | Corrections category |
|------|----------|----------------------|
| [communication.md](communication.md) | §1.1–§1.3 · §1.7 Tunnel/events/`_`/same-side | `communication` |
| [performance.md](performance.md) | §1.4–§1.6.2 loops/sleep/payloads/broadcast/StateBags · §2 cache/audit · §4.1–4.2 · §4.5 | `performance` |
| [architecture.md](architecture.md) | §3.5–3.6 · §3.8 monolith, reuse, state placement | `architecture` |
| [style.md](style.md) | §3.1–3.4 · §3.7 · §3.9–3.10 tables, comments, checklist | `style` |
| [security.md](security.md) | §4.6–4.8 SafeEvent/SetCooldown · §5 server auth | `security` |
| [api.md](api.md) | §4.3–4.4 cerberus exports & examples | `api` |

## Quick load (agents)

| Need | Read |
|------|------|
| Tunnel vs events, `_` prefix | [communication.md](communication.md) |
| Dynamic sleep, loops, payloads, broadcast §1.6.1, StateBags §1.6.2, cache, audit §2.4–§2.5 | [performance.md](performance.md) |
| New resource / monolith / globals §3.5–3.6 | [architecture.md](architecture.md) |
| Comments, lookup tables, anti-patterns | [style.md](style.md) |
| SafeEvent, manager auth §5.1, server resolution §5.2 | [security.md](security.md) |
| cerberus `SendFullSync` / export signatures | [api.md](api.md) |
| Full audit | communication §1.1 + performance (§1.6.1, §2.4–§2.5) + architecture §3.6 + security §5.1 |

Router: [SKILL.md](SKILL.md)

