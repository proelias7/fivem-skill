---
name: fivem-development
description: FiveM development best practices for any framework (vRP, QBCore, Qbox, ESX). Covers performance, security, client/server communication, cache (cacheaside), cerberus (load balance, SafeEvent, SetCooldown), view-cache audit (§2.4), manager server auth (§5.1), asset discovery, framework auto-detection, and dynamic documentation fetching. Use when the user works with FiveM, Lua scripts, natives, resources, fxmanifest, optimization, /fxmind audit, or general server development without a specific framework context.
---

# FiveM Development — Best Practices

> Framework-agnostic orchestrator for FiveM resource development.
> Supports vRP, QBCore, Qbox, and ESX via dedicated framework skills.

## Philosophy

1. **Fetch, don't memorize** — When unsure about a native or API, verify from authoritative sources
2. **Framework-agnostic thinking** — Understand patterns, adapt to the active framework
3. **Performance-first** — FiveM has strict tick budgets
4. **Security-aware** — Server-side validation is non-negotiable
5. **Clean, readable Lua over abstraction** — Monolith-first (`server.lua` / `client.lua`), minimal comments, reuse `local function` helpers
6. **Project memory** — `reference.mdc` = lean global map (`alwaysApply`); `.fxmind/memory/<topic>.md` = shared compact recipe (`lang: en-compact`, structured frontmatter). All agents read/write the same `.fxmind/` folder. Run `/fxmind learn` before rescanning; `/fxmind memory health [fix]` after refactors; `/fxmind graph` for snapshot; `/fxmind query` for graph-based retrieval in tasks and questions.
7. **Audit assertiveness** — `/fxmind audit` (fxmind) follows `best-practices.md` §2.4 + **§2.5 quality gates** (manifest-only files, exact counts, all V-b call sites).

---

## CRITICAL: No Hallucination Policy

**NEVER invent or guess native functions, framework APIs, or parameters.**

### Rules

1. **If unsure about a native** → MUST fetch from https://docs.fivem.net/natives/
2. **If unsure about framework API** → MUST fetch from official docs or read the framework skill
3. **If function doesn't exist** → Tell user honestly, suggest alternatives
4. **If parameters unknown** → Fetch documentation, don't guess

### Before writing any native or API call

- [ ] Is this a real FiveM native? → Verify at docs.fivem.net/natives
- [ ] Is this the correct function name? → Check exact spelling
- [ ] Are these the correct parameters? → Verify parameter order and types
- [ ] Does this work on client/server/both? → Check availability

### When you don't know

```
"I'm not 100% certain about this native/API. Let me fetch the documentation..."
[Use WebFetch to get accurate info]
```

---

## FiveM Natives — Official Source

- Docs: https://docs.fivem.net/natives/
- Official Repository (mirror): https://github.com/proelias7/fivem-natives

---

## Dynamic Documentation Fetching

**Use local skills first.** Fetch online only when information is missing, outdated, or uncertain.

### Decision Tree

| If user asks about... | Action |
|-----------------------|--------|
| Native function (GetPlayerPed, CreateVehicle, etc.) | **FETCH** from natives docs |
| Framework API (vRP, QBCore, Qbox, ESX) | **READ** framework skill; **FETCH** if uncertain |
| ox_lib feature (lib.callback, lib.notify) | **FETCH** from ox_lib docs |
| GTA V asset (prop, vehicle, ped model) | **READ** [asset-discovery.md](asset-discovery.md) + PlebMasters |
| Resource structure, manifest | **READ** local skills |
| Best practices, patterns | **READ** [best-practices.md](best-practices.md) |
| Code structure / clean Lua | **READ** [best-practices.md](best-practices.md) §3.5–3.9 |

### Documentation Sources

| Type | Source | When to use |
|------|--------|-------------|
| Native functions | https://docs.fivem.net/natives/ | Any native call |
| Native mirror | https://github.com/proelias7/fivem-natives | Offline reference |
| vRP API | skill `vrp-framework` | vRP/Creative Network projects |
| QBCore API | skill `qbcore-framework` / https://docs.qbcore.org/ | QBCore projects |
| Qbox API | skill `qbox-framework` / https://docs.qbox.re/ | Qbox projects |
| ESX API | skill `esx-framework` / https://docs.esx-framework.org/ | ESX projects |
| ox_lib | https://overextended.dev/ox_lib | ox_lib utilities |
| Props/Vehicles/Peds | https://forge.plebmasters.de/ | Asset discovery |
| Code structure / clean Lua | [best-practices.md](best-practices.md) §3.5+ | Before writing or refactoring Lua resources |

### WebFetch Examples

```
WebFetch(
  url: "https://docs.fivem.net/natives/",
  prompt: "Find documentation for the native function '{FUNCTION_NAME}'.
           Include: parameters, return values, usage examples,
           client/server availability."
)
```

```
WebFetch(
  url: "https://forge.plebmasters.de/",
  prompt: "Search for GTA V {ASSET_TYPE} matching '{SEARCH_TERM}'.
           Return model names/hashes that can be used in FiveM."
)
```

---

## Request Router

| Rule | Triggers | Action |
|------|----------|--------|
| Native Detection | PascalCase native name, "GTA native", hash `0x...` | Fetch from docs.fivem.net/natives |
| Framework API | `vRP.*`, `QBCore.*`, `exports.qbx_core`, `ESX.*`, `xPlayer` | Read framework skill |
| ox_lib | `lib.*`, `exports.ox_lib` | Fetch from overextended.dev/ox_lib |
| Asset Discovery | "model for...", "prop name", "vehicle spawn" | Read asset-discovery.md |
| Local Knowledge | fxmanifest, threads, patterns | Read best-practices.md |
| New Lua resource / refactor | "create script", "new resource", server.lua, client.lua | Read best-practices.md §3.5–3.9 first |
| Code audit | "audit", "review security", "check performance", exploit | User runs `/fxmind audit` — read-only plan, no auto-fix |
| Project memory | `/fxmind learn`, "learn craft", topic memory | User runs `/fxmind learn <topic>` — writes compact English `.fxmind/memory/<topic>.md` (shared) |
| Memory health | `/fxmind memory health`, stale memory, memória desatualizada | User runs `/fxmind memory health [fix] [topic]` — verifies paths/events vs repo, index/reference sync, token format; optional compact rewrite |
| Knowledge graph | `/fxmind graph`, "mapa mental", "grafo 3D" | User runs `/fxmind graph` — writes `knowledge-graph.json` + static HTML |
| Graph query | `/fxmind query`, "como X se conecta com Y", fluxo entre tópicos | User runs `/fxmind query "<question>"` — BFS/DFS over topic graph with token budget |
| Graph path | `/fxmind path`, caminho entre tópicos | User runs `/fxmind path <a> <b>` — shortest path between learned topics |
| Graph explain | `/fxmind explain`, explicar tópico | User runs `/fxmind explain <topic>` — node + connections |
| Recurring project flow | "criar craft", "criar item", "nova loja", craft/receita | Read `.fxmind/memory/<topic>.md` first; legacy fallback `.cursor/fivem/memory/` if empty; else suggest `/fxmind learn <topic>` or `/fxmind query` if graph exists |

---

## Before Writing Lua

When **creating or editing** a FiveM resource (server/client Lua):

1. **READ** [best-practices.md](best-practices.md) **sections 3.5–3.9** (monolith layout, reuse, comments, variable placement, checklist)
2. Default to **one `server.lua` and one `client.lua`** unless split is clearly justified
3. Do **not** over-comment or over-split files — see best-practices.md §3.10 (anti-patterns)

---

## Critical Performance Rules

ALWAYS follow these rules when writing code:

1. **Callback vs Event:** Use `TriggerServerEvent`/`TriggerClientEvent` when you do NOT need a return. Use callbacks/Tunnel only when you NEED a return.
2. **Dynamic Sleep:** NEVER fixed `Wait(0)`. Adjust based on state (dist < 20 = `0`, dist < 50 = `500`, else = `1000`+).
3. **Calls in same environment:** Call functions directly. NEVER use `TriggerEvent()` to call on the same side.
4. **No remote calls in loops:** Do not use callbacks/events in loops < 5 seconds. Prefer batch or delta.
5. **Small Payloads:** Send only the change, not full data. Limit of ~8KB per event.
6. **Cache:** Use `exports["cacheaside"]:Get()` for repeated database queries. Never query the database in a loop.
7. **Large sync:** Large server→client payloads use `exports["cerberus"]:SendFullSync` or `SendDeltaSync` — no manual chunking.
8. **Delta sync:** Prefer `SendDeltaSync` for unit updates; use `SendFullSync` only for bootstrap/full cache.
9. **SafeEvent:** Server events that grant money, items, XP, vehicles, or bypass restrictions must call `exports["cerberus"]:SafeEvent` (with `config.modules.safeEvent = true`) **and** server-side validation.
10. **SetCooldown:** Repetitive client/NUI actions (open menu, use item, spam callbacks) use `exports["cerberus"]:SetCooldown` before `TriggerServerEvent`.
11. **Server security:** Validate money, items, permissions, and distance on the server; never trust client/NUI data.
12. **Tables > if/else:** For 3+ conditions, use lookup table (O(1)) instead of if/elseif chains.
13. **Protect nil:** Always check variables before concatenating. Use `or ""` as fallback.

---

## Framework Skills

| Framework | Skill |
|-----------|-------|
| vRP Creative Network | `vrp-framework` |
| QBCore | `qbcore-framework` |
| Qbox (qbx_core) | `qbox-framework` |
| ESX Legacy | `esx-framework` |
| NUI (React + Vite) | `fivem-react-nui` |

For auto-detection and multi-framework bridge pattern, see [framework-detection.md](framework-detection.md).

---

## Resource Structure

Prefer monolith layout. See [best-practices.md](best-practices.md) §3.5 for when to split files.

```
resource_name/
├── fxmanifest.lua
├── shared/config.lua
├── server/server.lua      # default: all server logic here
└── client/client.lua      # default: all client logic here
```

Optional NUI (see skill `fivem-react-nui`):

```
└── html/ or src/ui/
    ├── index.html
    └── ...
```

---

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Split every feature into its own Lua file | Keep `server.lua` / `client.lua` unless clearly justified |
| Comment every line or use banner blocks | Comment only non-obvious rules and framework quirks |
| Global helper modules for tiny utilities | `local function` at file top; reuse |
| Declare state mid-file between handlers | Constants and state tables at the top |
| `while true do Wait(0)` | Use appropriate wait or events |
| Trust client data | Always validate on server |
| Hardcode framework | Detect dynamically |
| Fetch data every frame | Cache with refresh interval |
| Rebuild client payload on every `TriggerClientEvent` | Pre-build view cache on load/CRUD (§2.2–2.4) |
| `TriggerClientEvent("manager:*", -1, ...)` | Admin → `source`; world sync small → `-1`; large → cerberus (§1.6.1) |
| Large table via `TriggerClientEvent(-1, ...)` | cerberus `SendFullSync` / `SendDeltaSync` + scope |
| Audit one file ignoring fxmanifest siblings | Read all manifest scripts; matrix V-a–V-j |
| Cooldown helper as “manager permission” | Real `hasGroup`/`hasPermission` on server (§5.1) |
| Global when only used in one file | `local` — global only cross-file same-side (§3.6) |
| Invent natives/APIs | Verify before writing |

---

## External Resources (Download)

- `cacheaside` (in-memory cache): `git@github.com:proelias7/cacheaside.git`
- `cerberus` (modular: load balance, SafeEvent, SetCooldown): `git@github.com:proelias7/cerberus.git`

---

## Additional References

- Detailed best practices (performance, security, cache, broadcast §1.6.1, **§2.4 audit**, §5.1): [best-practices.md](best-practices.md)
- Asset discovery (props, vehicles, peds, weapons): [asset-discovery.md](asset-discovery.md)
- Framework auto-detection and bridge: [framework-detection.md](framework-detection.md)
- NUI interface construction: use skill `fivem-react-nui`
