---
name: fivem-development
description: FiveM development best practices for any framework (vRP, QBCore, Qbox, ESX). Covers performance, security, client/server communication, cache (cacheaside), cerberus (load balance, SafeEvent, SetCooldown), view-cache audit (§2.4), manager server auth (§5.1), asset discovery, framework auto-detection, and dynamic documentation fetching. Use when the user works with FiveM, Lua scripts, natives, resources, fxmanifest, optimization, /fxmind audit, or general server development without a specific framework context.
---

# FiveM Development — Best Practices

> Framework-agnostic orchestrator. **One skill** — load reference files on demand (do not load all).

**Language rule:** Internal reasoning is in compact English. All messages and output displayed to the user must be in the user's language.

## Philosophy

1. **Fetch, don't memorize** — When unsure about a native or API, verify from authoritative sources
2. **Framework-agnostic thinking** — Understand patterns, adapt to the active framework
3. **Performance-first** — FiveM has strict tick budgets
4. **Security-aware** — Server-side validation is non-negotiable
5. **Clean, readable Lua over abstraction** — Monolith-first (`server.lua` / `client.lua`), minimal comments, reuse `local function` helpers. **Do not** componentize Lua like React or invent event roundtrips when Tunnel/`return` fits.
6. **Project memory** — `reference.mdc` = lean global map (`alwaysApply`); `.fxmind/memory/<topic>.md` = shared compact recipe. Run `/fxmind learn` before rescanning; `/fxmind memory health`; `/fxmind graph`; `/fxmind query`.
7. **Audit assertiveness** — `/fxmind audit` follows [performance.md](performance.md) §1.6.1–§1.6.2 + §2.4–§2.5 (**Pass 2b** E-a…E-e) + [security.md](security.md) §5.1.

---

## Reference router (load only what you need)

| Topic | File | Key sections |
|-------|------|--------------|
| Tunnel / events / `_` prefix / same-side calls | [communication.md](communication.md) | §1.1–§1.3, §1.7 |
| Loops, dynamic sleep, payloads, broadcast, StateBags, cache, audit gates | [performance.md](performance.md) | **§1.4–§1.6.2**, §2.1–**§2.5**, §4.1–4.2, §4.5 |
| Monolith layout, globals vs fake modules, state placement | [architecture.md](architecture.md) | **§3.5–§3.6**, §3.8 |
| Lookup tables, nil, comments, checklist, anti-patterns | [style.md](style.md) | §3.1–3.4, §3.7, §3.9–**§3.10** |
| SafeEvent, SetCooldown, manager auth, server resolution | [security.md](security.md) | §4.6–4.8, **§5.1–§5.2** |
| cerberus export signatures & examples | [api.md](api.md) | §4.3–4.4 |
| Index of all § links | [best-practices.md](best-practices.md) | TOC only |
| Props / vehicles / peds | [asset-discovery.md](asset-discovery.md) | — |
| Detect vRP / QB / Qbox / ESX | [framework-detection.md](framework-detection.md) | — |

**Corrections backlog** (`.fxmind/corrections/`) categories map 1:1 to these files — promote rules into the matching file, not into a new skill.

---

## CRITICAL: No Hallucination Policy

**NEVER invent or guess native functions, framework APIs, or parameters.**

1. **If unsure about a native** → MUST fetch from https://docs.fivem.net/natives/
2. **If unsure about framework API** → MUST fetch from official docs or read the framework skill
3. **If function doesn't exist** → Tell user honestly, suggest alternatives
4. **If parameters unknown** → Fetch documentation, don't guess

Before writing any native or API call: verify name, parameters, and client/server availability.

---

## Dynamic Documentation Fetching

**Use local skills first.** Fetch online only when information is missing, outdated, or uncertain.

| If user asks about... | Action |
|-----------------------|--------|
| Native function | **FETCH** https://docs.fivem.net/natives/ |
| Framework API | **READ** framework skill; **FETCH** if uncertain |
| ox_lib | **FETCH** https://overextended.dev/ox_lib |
| GTA V asset | **READ** [asset-discovery.md](asset-discovery.md) |
| Communication / Tunnel | **READ** [communication.md](communication.md) |
| Cache / sleep / broadcast / audit / cerberus sync | **READ** [performance.md](performance.md) |
| New resource / monolith | **READ** [architecture.md](architecture.md) + [style.md](style.md) |
| Security / SafeEvent / manager | **READ** [security.md](security.md) |
| cerberus export API | **READ** [api.md](api.md) |

---

## Request Router

| Rule | Triggers | Action |
|------|----------|--------|
| Native Detection | PascalCase native, `0x...` | Fetch docs.fivem.net/natives |
| Framework API | `vRP.*`, `QBCore.*`, `exports.qbx_core`, `ESX.*` | Read framework skill |
| ox_lib | `lib.*` | Fetch overextended.dev/ox_lib |
| Asset Discovery | prop / vehicle / ped model | Read asset-discovery.md |
| Communication | Tunnel, callback, `_` prefix, same-side `TriggerEvent` | Read communication.md |
| Performance / audit | Wait(0), loops, payload, broadcast, cache, `/fxmind audit` | Read performance.md (§1.4–§1.6.1, §2.4–§2.5) |
| Architecture | new resource, server.lua, refactor layout | Read architecture.md §3.5–3.6 first |
| Style | comments, if/else cleanup | Read style.md |
| Security | exploit, SafeEvent, manager event, webhook | Read security.md |
| Project memory | `/fxmind learn`, craft/item/loja | Read `.fxmind/memory/<topic>.md` or suggest learn/query |

---

## Before Writing Lua

1. **READ** [architecture.md](architecture.md) §3.5–3.6 and [style.md](style.md) §3.7–3.10
2. Default to **one `server.lua` and one `client.lua`** unless split is clearly justified
3. Prefer Tunnel/`return` over event roundtrips — [communication.md](communication.md) §1.1

---

## Critical Performance Rules

1. **Callback vs Event:** Use `TriggerServerEvent`/`TriggerClientEvent` when you do NOT need a return. Use callbacks/Tunnel only when you NEED a return.
2. **Dynamic Sleep:** NEVER fixed `Wait(0)`. Adjust based on state.
3. **Same environment:** Call functions directly — never `TriggerEvent()` same-side.
4. **No remote calls in loops** < 5s — batch or delta.
5. **Small payloads** — ~8KB limit; send deltas.
6. **Cache:** `exports["cacheaside"]:Get()` for repeated DB queries.
7. **Large sync:** cerberus `SendFullSync` / `SendDeltaSync`.
8. **SafeEvent** + server validation for money/items/XP/vehicles.
9. **SetCooldown** on client before spammy `TriggerServerEvent`.
10. **Server security:** never trust client/NUI; resolve derived data on server (§5.2).
11. **Tables > if/else** for 3+ conditions; protect nil.
12. **Consolidate network:** one Tunnel call with return (§1.1).

---

## Framework Skills

| Framework | Skill |
|-----------|-------|
| vRP Creative Network | `vrp-framework` |
| QBCore | `qbcore-framework` |
| Qbox (qbx_core) | `qbox-framework` |
| ESX Legacy | `esx-framework` |
| NUI (React + Vite) | `fivem-react-nui` |

See [framework-detection.md](framework-detection.md).

---

## Resource Structure

Prefer monolith — [architecture.md](architecture.md) §3.5.

```
resource_name/
├── fxmanifest.lua
├── shared/config.lua
├── server/server.lua
└── client/client.lua
```

---

## Anti-Patterns (short)

| Don't | Do |
|-------|-----|
| Split every feature into its own Lua file | Monolith unless justified (§3.5) |
| Comment every line | Comment only non-obvious rules (§3.7) |
| Fake `LoadResourceFile` imports | Global or same-file helper (§3.6) |
| Event roundtrip for a return value | Tunnel/`return` (§1.1) |
| Trust client / rebuild payload every send | Server auth + view cache (§5, §2.2) |
| Invent natives/APIs | Verify first |

Full tables: [style.md](style.md) §3.10, [architecture.md](architecture.md) §3.6.

---

## External Resources

- `cacheaside`: `git@github.com:proelias7/cacheaside.git`
- `cerberus`: `git@github.com:proelias7/cerberus.git`

## Natives

- https://docs.fivem.net/natives/
- Mirror: https://github.com/proelias7/fivem-natives
