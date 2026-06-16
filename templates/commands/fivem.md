---
description: "FiveM helper — docs, reference, audit (/fivem reference | audit)"
argument-hint: "<question> | reference | audit [scope]"
---

# FiveM

**Input:** $ARGUMENTS

## Routing

Parse `$ARGUMENTS` (trim, case-insensitive):

| Input | Mode |
|-------|------|
| `reference` or `reference ...` | **Reference** — generate/update `reference.mdc` at project root |
| `audit` or `audit ...` | **Audit** — scan code, report issues, output correction plan |
| empty or anything else | **Help** — answer FiveM development questions |

**Audit scope** (optional after `audit`):

- `audit` alone → resource/folder from user `@` mention, open files, or ask which resource to audit
- `audit resources/[Novos]/myresource` → audit that path only
- `audit server.lua` → audit file if path exists

---

## Mode: Audit

**Read-only analysis.** Do **not** edit code unless the user explicitly asks to implement fixes after reviewing the plan.

Audit the target Lua/JS resource(s) for **security**, **performance**, and **patterns**. Deliver a structured report + prioritized correction plan.

### Step 1 — Load standards

Read from `.cursor/skills/` (or `.claude/skills/`):

| Skill file | Sections |
|------------|----------|
| `fivem-development/best-practices.md` | §1 Communication, §2 Cache, §3 Patterns + **§3.5–3.10 Clean code**, §4 Cerberus |
| Framework skill (`vrp-framework`, etc.) | If detected |
| `fivem-react-nui/ui-guide.md` | If scope includes NUI/web |

Read **`.cursor/fivem/audit.template.md`** for report structure.

If **`reference.mdc`** exists at project root → read for project-specific conventions.

### Step 2 — Discover scope

1. Resolve target from `$ARGUMENTS` after `audit` or from user context (`@folder`, open file)
2. Read `fxmanifest.lua` for the resource(s)
3. Read all `server/**/*.lua`, `client/**/*.lua`, `shared/**/*.lua`, and NUI scripts in scope
4. Grep for high-risk patterns:

```text
RegisterNetEvent / RegisterServerEvent / AddEventHandler
RegisterNUICallback
TriggerServerEvent / TriggerClientEvent
exports["cerberus"]
SafeEvent
vRP.generateItem / addMoney / tryGetInventoryItem
while true do Wait(0)
TriggerEvent(  (same-environment abuse)
MySQL / oxmysql / exports.oxmysql
```

### Step 3 — Evaluate (evidence required)

Every finding **must** cite `file:line` or exact symbol — no generic warnings without code proof.

#### Security

- Events that grant money, items, XP, vehicles, or bypass restrictions without server validation
- Missing `exports["cerberus"]:SafeEvent` on advantage-giving server events
- Client/NUI data used without server re-validation
- Missing permission checks (`hasGroup`, `hasPermission`, job checks)
- `source = -1` flood risk on server events
- SQL built from unsanitized client strings
- Webhooks/tokens in client or shared files exposed to NUI

#### Performance

- `Wait(0)` / tight loops without dynamic sleep
- Callbacks/Tunnel where events would suffice (no return needed)
- Callbacks or `TriggerServerEvent` inside loops < 5s interval
- Same-side `TriggerEvent` instead of direct function call
- Repeated DB queries without `cacheaside`
- Large table payloads over network (> ~8KB risk)

#### Patterns & clean code (§3.5–3.10)

- Over-split fxmanifest (many server/client files for one resource)
- Globals for small helpers; duplicated logic
- Comment noise, state declared mid-file
- Long if/elseif chains where lookup table fits
- Missing nil guards on concatenation

#### NUI (when applicable)

- NUI callbacks without `cb("{}")` or valid JSON
- Missing Cerberus `SetCooldown` on repetitive client actions
- Heavy UI libraries (MUI, framer-motion, etc.)

Assign severity:

| Level | When |
|-------|------|
| **Critical** | Exploit / free items or money / crash / ban bypass |
| **High** | Likely abuse or serious perf regression |
| **Medium** | Should fix; maintainability or moderate risk |
| **Low** | Style, minor perf, polish |

### Step 4 — Write report

Save to **`.cursor/fivem/audit-<resource-name>.md`** (slug from folder name, e.g. `audit-inventory.md`).

Use structure from `audit.template.md`:

1. Summary table (severity counts)
2. Findings tables: Security, Performance, Patterns, NUI (if any)
3. **Correction plan** — phased checklist (Phase 1 Critical → Phase 4 Low)
4. Files reviewed + skills referenced

Write report in **Portuguese** if codebase/comments are PT-BR; otherwise match project language.

### Step 5 — Reply to user

In chat, provide:

- Short executive summary (3–5 bullets)
- Top 3 fixes by priority
- Path to full report: `.cursor/fivem/audit-<name>.md`
- Ask: *"Quer que eu implemente o Phase 1?"* (or equivalent) — **wait for approval before editing code**

### Audit rules

- **Never invent** findings — every row needs file evidence
- **Do not** auto-fix during audit mode
- Prefer concrete fix snippets in the plan, not vague advice
- If scope is too large, audit one resource at a time and say so

---

## Mode: Reference

Generate or update **`reference.mdc` in the project root** (same level as `resources/`, `server.cfg`, or main `fxmanifest.lua`).

This file is a **Cursor rule** (`alwaysApply: true`) with project-specific paths, flows, and anti-bug notes for future sessions.

### Step 1 — Discover the project

Search and read (do not guess paths):

1. **Framework** — `fxmanifest.lua` dependencies, `resources/[System]/`, `qb-core`, `qbx_core`, `es_extended`, `vrp`
2. **Core config** — item lists, groups/jobs, economy, shops
3. **Custom resources** — `[Novos]`, `[Exclusive]`, `[Scripts]`, etc.
4. **Integrations** — `cacheaside`, `cerberus`, `oxmysql`, `ox_lib`, webhooks/Discord
5. **NUI** — React/Vite projects (`src/ui/project`, build output paths)
6. **Security patterns** — `SafeEvent`, cooldowns, inventory validation
7. **Git** — submodules, monorepo layout

Use semantic search, grep, and file reads. Every path in the output must exist in the repo.

### Step 2 — Read existing context

- If **`reference.mdc`** exists at project root → read it and **merge/update** (preserve valid sections, replace outdated paths)
- Read **`.cursor/fivem/reference.template.mdc`** for section structure (installed by fivem-skill)
- Read **`.cursor/fivem/reference.example.mdc`** for format/depth only (fictional sample — do not copy its paths)

### Step 3 — Write `reference.mdc`

Use this frontmatter:

```yaml
---
description: <ProjectName> — referência rápida FiveM (<framework>)
alwaysApply: true
---
```

Required sections (adapt titles to what exists in **this** project):

1. **Manutenção desta rule** — update when new patterns appear
2. **Framework / grupos / permissões** — how auth works in this codebase
3. **Itens / inventário** — registration files, use handlers, naming conventions
4. **Economia / lojas / webhooks** — shop configs, webhook paths
5. **Sistemas custom** — one `##` per major feature (craft, minigames, panels, etc.) with:
   - File paths (markdown links when useful)
   - Runtime flow (events, exports)
   - **Checklist anti-bug**
6. **Integrações** — cacheaside, Cerberus SafeEvent, oxmysql patterns **as used here**
7. **NUI** — source folder + `pnpm run build` path if applicable
8. **Git / submodules** — if relevant
9. **Skills FiveM** — `.cursor/skills/` paths installed in this project

Write in **Portuguese** if the codebase/comments are PT-BR; otherwise match project language.

### Step 4 — Confirm

After writing the file, reply with:

- Framework detected
- Sections documented
- Paths that need manual review (if any)

### Rules

- **Never invent** file paths, events, or APIs — verify with search
- **Do not** paste generic FiveM tutorials — only project-specific findings
- Prefer **actionable** notes: where to edit, checklists, common bugs

---

## Mode: Help

You are a FiveM development expert. Help the user with their FiveM scripting question.

**User Query:** $ARGUMENTS

### Instructions

1. **Analyze the query** to determine what the user needs:
   - Native function → Fetch from https://docs.fivem.net/natives/
   - vRP API → Read skill `vrp-framework`
   - QBCore API → Read skill `qbcore-framework` / Fetch from https://docs.qbcore.org/
   - Qbox API → Read skill `qbox-framework` / Fetch from https://docs.qbox.re/
   - ESX API → Read skill `esx-framework` / Fetch from https://docs.esx-framework.org/
   - ox_lib → Fetch from https://overextended.dev/ox_lib
   - Asset (prop, vehicle, ped) → Read skill `fivem-development` (`asset-discovery.md`) + PlebMasters
   - NUI/React UI → Read skill `fivem-react-nui`
   - Patterns/best practices → Read skill `fivem-development` (`best-practices.md`)
   - Code audit → suggest `/fivem audit [scope]`
   - Project conventions → Read **`reference.mdc`** at project root if it exists

2. **Read the relevant skill** from `.cursor/skills/` (or `.claude/skills/`)

3. **Fetch current documentation** with WebFetch when needed (never invent natives or APIs)

4. **Answer** with code examples, best practices, and common pitfalls

### Framework Detection

Check `fxmanifest.lua` dependencies:

- `vrp` → vRP Creative Network
- `qbx_core` → Qbox
- `qb-core` → QBCore
- `es_extended` → ESX

See skill `fivem-development` → `framework-detection.md` for bridge patterns.

### No Hallucination Policy

NEVER invent native functions, framework APIs, or parameters. When uncertain, fetch documentation before answering.
