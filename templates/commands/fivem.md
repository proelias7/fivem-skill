---
description: "FiveM helper — docs, natives, project reference (/fivem reference)"
argument-hint: "<question> | reference"
---

# FiveM

**Input:** $ARGUMENTS

## Routing

Parse `$ARGUMENTS` (trim, case-insensitive):

| Input | Mode |
|-------|------|
| `reference` or `reference ...` | **Reference** — generate/update `reference.mdc` at project root |
| empty or anything else | **Help** — answer FiveM development questions |

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
- Read **`.cursor/fivem/reference.example.mdc`** for depth/style reference (real-world example)

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
