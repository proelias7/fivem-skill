---
description: "FiveM helper — docs, reference, audit, learn, memory health, graph"
argument-hint: "<question> | reference | audit [scope] | learn <topic> | memory health [fix] [topic] | graph"
---

# FiveM

**Input:** $ARGUMENTS

## Routing

Parse `$ARGUMENTS` (trim, case-insensitive):

| Input | Mode |
|-------|------|
| `reference` or `reference ...` | **Reference** — generate/update `reference.mdc` at project root |
| `audit` or `audit ...` | **Audit** — scan code, report issues, output correction plan |
| `learn` or `learn <topic>` | **Learn** — generate/update topic memory in `<agent>/fivem/memory/` |
| `learn list` | **Learn** — list topics in `_index.md` + catalog |
| `memory health` or `memory health fix` | **Memory health** — verify memories vs codebase + integration + token format |
| `memory health <topic>` or `memory health <topic> fix` | **Memory health** — single topic (optional auto-fix) |
| `graph` | **Graph** — build 3D knowledge map HTML from learned memories |
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

Read from the project agent skills directory (`.cursor/skills/`, `.gemini/skills/`, `.claude/skills/`, or `.agents/skills/`):

| Skill file | Sections |
|------------|----------|
| `fivem-development/best-practices.md` | §1 Communication, §2 Cache, §3 Patterns + **§3.5–3.10 Clean code**, §4 Cerberus |
| Framework skill (`vrp-framework`, etc.) | If detected |
| `fivem-react-nui/ui-guide.md` | If scope includes NUI/web |

Read **`<agent>/fivem/audit.template.md`** for report structure (`.cursor/fivem/` or `.gemini/fivem/`).

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

#### Patterns & clean code (§3.5–3.10, §1.3)

- Over-split fxmanifest (many server/client files for one resource)
- Globals for small helpers; duplicated logic
- Comment noise, state declared mid-file
- Long if/elseif chains where lookup table fits
- Missing nil guards on concatenation
- **Thin event wrappers** — `local function foo() TriggerEvent(...) end` with no other logic (inline the event or merge into a real helper)
- **Same-side `TriggerEvent`** when a local function in the same file could be called directly

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

Save to **`<agent>/fivem/audit-<resource-name>.md`** (e.g. `.cursor/fivem/audit-inventory.md` or `.gemini/fivem/audit-inventory.md`).

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
- **Do not recommend** creating a function whose body is only `TriggerEvent(...)` / `TriggerServerEvent(...)` — inline at call site, or expand into a helper that also closes NUI/camera/state (see best-practices §1.3)
- **Do not recommend** `TriggerEvent` for logic that already exists as `local function` in the same file — call the function directly
- When a fix needs a cross-resource hook (e.g. `login:Spawn`, `hookSelector`), show the **inlined** `TriggerEvent` in the plan, not a one-line wrapper alias

---

## Mode: Learn

Generate or update a **topic memory** at `<agent>/fivem/memory/<topic>.md` (`.cursor/fivem/` or `.gemini/fivem/`).

**Do not implement code** in this mode — only scan, write markdown, and update index/reference links.

### Step 1 — Resolve topic

1. Parse `$ARGUMENTS` after `learn` (e.g. `craft`, `item-usavel`, `dona-capivara`)
2. If `learn list` → read `<agent>/fivem/memory/_index.md` and `<agent>/fivem/topic-catalog.md`; reply with table; stop
3. Normalize slug: lowercase, hyphens, no spaces → `memory/<slug>.md`

### Step 2 — Load context

Read from agent skills directory (`.cursor/skills/`, `.gemini/skills/`, etc.):

| File | Purpose |
|------|---------|
| `fivem-development/best-practices.md` | Patterns, anti-bugs |
| Framework skill (`vrp-framework`, etc.) | If detected |
| `<agent>/fivem/topic-catalog.md` | Search hints for known topics |
| `<agent>/fivem/memory.template.md` | Output skeleton |
| `reference.mdc` at project root | If exists — project paths |
| `<agent>/fivem/memory/<topic>.md` | If exists — **merge** (preserve valid content, update paths) |

### Step 3 — Scan codebase

1. Match topic to catalog row if possible; use its grep/paths hints
2. Unknown topic → infer paths from user request + `reference.mdc`
3. Grep + read files — **every path in output must exist in the repo**
4. Extract: config paths, handlers, events, checklists, one real example from the codebase

### Step 4 — Write memory

Save to **`<agent>/fivem/memory/<topic>.md`** using `memory.template.md` structure (**~25–60 lines**, token-efficient):

- Frontmatter: `topic`, `updated`, `framework`, `lang: en-compact`
- Sections: `Files`, `Recipe`, `Example`, `Pitfalls`, `Skills` — **compact technical English only**
- No prose, no tables unless essential; bullet lists and short imperative lines
- Keep repo literals verbatim: paths, events, item ids, permissions, resource names
- **Do not** write memory in Portuguese — memory is agent-internal context, not user-facing

### Step 5 — Update index

Update **`<agent>/fivem/memory/_index.md`** — table row: topic | file | triggers | last updated.
Create from `memory-index.template.md` if missing.

### Step 6 — Update reference.mdc

If **`reference.mdc`** exists at project root:

1. Ensure section **`## Memórias por tópico`** exists (create if absent)
2. Add or update **one table row** per topic: topic → `memory/<topic>.md`
3. Keep the rest of `reference.mdc` **lean** — do not duplicate full craft/item flows here

If `reference.mdc` does not exist, skip (user can run `/fivem reference` later).

### Step 7 — Reply

Reply to the user in **their language** (usually PT-BR if they write in PT-BR):

- Summary of what was learned (3–5 bullets)
- Path: `<agent>/fivem/memory/<topic>.md`
- If codebase changed heavily since last learn → suggest re-running `/fivem learn <topic>`
- Suggest `/fivem graph` to refresh the 3D knowledge map

### Learn rules

- **Never invent** paths, events, or APIs
- **Do not** edit Lua/JS during learn mode
- Cursor Agent: use **AskQuestion** if critical context is missing; otherwise ask in chat
- **Memory file:** compact technical English (`lang: en-compact`) — token-efficient agent context
- **Chat reply:** user's language — do not mirror memory language in the reply

---

## Mode: Memory health

Verify **topic memories** against the live codebase and **integration** (`_index.md`, `reference.mdc`). Optionally **auto-fix** stale content and **compact token format**.

**Read-only by default.** With `fix` → rewrite markdown only (memories, index, reference links, health report). **Do not edit Lua/JS.**

### Step 1 — Parse scope

After `memory health` (case-insensitive):

| Input | Scope | Fix |
|-------|-------|-----|
| `memory health` | all `memory/*.md` | no |
| `memory health fix` | all | yes |
| `memory health craft` | topic `craft` only | no |
| `memory health craft fix` | topic `craft` only | yes |

If no `memory/` files exist → reply suggesting `/fivem learn <topic>` first; stop.

### Step 2 — Load context

| File | Purpose |
|------|---------|
| `<agent>/fivem/memory-health.template.md` | Report structure |
| `<agent>/fivem/memory.template.md` | Target compact format |
| `<agent>/fivem/memory/_index.md` | Index integration |
| `<agent>/fivem/topic-catalog.md` | Catalog orphans (info) |
| `reference.mdc` | Section `## Memórias por tópico` |
| `<agent>/fivem/memory/<topic>.md` | Each topic to verify |

### Step 3 — Verify each memory (evidence required)

For every topic file, extract and validate:

#### Paths

- Backtick strings that look like repo paths (`/`, `\`, or extensions `.lua`, `.js`, `.tsx`, `.json`, `.cfg`)
- **Missing file** → Stale/Broken (critical if listed under `Files:` or `Recipe:`)

#### Events / symbols

Grep repo for symbols mentioned in memory:

```text
RegisterNetEvent / RegisterServerEvent / AddEventHandler
TriggerServerEvent / TriggerClientEvent (quoted event names)
exports["..."] / exports['...']
vRP.* / QBCore.* / ESX.* / lib.*
function names referenced in Recipe steps
```

- **Zero matches** for a quoted event or export used as a step → Stale
- **Zero matches** for primary handler/event in `Files:` or `Recipe:` → Broken

#### Integration

| Check | Drift |
|-------|-------|
| `_index.md` row | topic in index but no `memory/<topic>.md` |
| `memory/*.md` file | file exists but missing from `_index.md` |
| `reference.mdc` table | link to missing memory file |
| `reference.mdc` | topic in memory folder but no row in `## Memórias por tópico` |

#### Token format

| Issue | Flag |
|-------|------|
| Missing `lang: en-compact` in frontmatter | Token |
| > 60 lines (or < 10 with empty sections) | Token |
| PT-BR narrative sections (`Arquivos principais`, `Checklist`, `Anti-bugs`, `Memória —`) | Token |
| Long prose paragraphs (> 2 lines) | Token |
| Missing core sections: `Files`, `Recipe`, `Pitfalls` | Token |

**Verdict per topic:** `OK` | `Stale` (partial drift) | `Broken` (critical path/event missing)

### Step 4 — Write report

Save **`<agent>/fivem/memory-health.md`** using `memory-health.template.md`:

- Summary counts (OK / Stale / Broken / Integration / Token)
- Per-topic table + detail blocks with grep evidence
- Integration section
- Recommended actions

Write report in **user's language**; memory files stay compact English.

### Step 5 — Fix mode (when `fix` in args)

Only after verification — **never invent** replacements:

1. **Prune** lines referencing missing paths/events (grep-confirmed dead refs)
2. **Rewrite** to `memory.template.md` — compact English, `lang: en-compact`, ~25–60 lines
3. **Re-scan** repo for that topic (catalog hints + surviving valid paths) to refresh `Files`, `Recipe`, `Example`, `Pitfalls`
4. **Sync** `_index.md` (topic | file | triggers | updated) and `reference.mdc` one-row links
5. **Broken topics** mostly empty after prune → keep minimal stub + flag **re-learn**: `/fivem learn <topic>` — do not guess new APIs

Update frontmatter `updated` on changed memories.

### Step 6 — Reply

Reply in **user's language**:

- Summary table (topics × verdict)
- Path: `<agent>/fivem/memory-health.md`
- Auto-fixed topics (fix mode)
- Topics needing `/fivem learn <topic>` (manual)
- Suggest `/fivem graph` if memories changed

### Memory health rules

- **Never invent** paths, events, or APIs
- **Do not** edit Lua/JS — markdown only
- Every finding needs **file evidence** or **grep result**
- Fix mode optimizes **tokens** and **accuracy** — not a full codebase rescan unless topic is rescanned in step 5
- Cursor Agent: use **AskQuestion** before deleting an entire topic memory; otherwise ask in chat

---

## Mode: Graph

Build a **static 3D knowledge graph** HTML file and **open it in the browser**. No Node script, no background server.

### Step 1 — Read sources

From the FiveM project root, read:

- `<agent>/fivem/memory/_index.md` (topic table)
- `<agent>/fivem/memory/*.md` (exclude `_index.md`)
- `<agent>/fivem/topic-catalog.md` (catalog orphans)

Cursor: `<agent>` = `.cursor/fivem` · Gemini: `.gemini/fivem`

If `<agent>/fivem/knowledge-graph.html` is missing → tell user to run fivem-skill installer first.

### Step 2 — Build graph JSON

Assemble a single JSON object with `nodes`, `links`, and `meta`.

**Learned nodes** (one per `memory/<slug>.md`):

| Field | Source |
|-------|--------|
| `id` | slug (filename without `.md`, lowercase) |
| `name` | frontmatter `topic`, or index row, or slug |
| `group` | `"learned"` |
| `file` | path relative to project root (e.g. `.cursor/fivem/memory/craft.md`) |
| `updated` | frontmatter `updated` or index column |
| `framework` | frontmatter `framework` or `""` |
| `triggers` | index triggers column or `""` |
| `tokens` | `Math.round(content.length / 4)` |
| `paths` | array of lowercase paths from backtick values containing `/`, `\`, `.lua`, `.md`, or `config.` |
| `searchHints` | `""` |

**Catalog nodes** (from `topic-catalog.md`, skip slugs already learned):

| Field | Value |
|-------|-------|
| `id` | slug from first column backticks |
| `name` | slug label |
| `group` | `"catalog"` |
| `file` | `""` |
| `updated`, `framework` | `""` |
| `triggers` | catalog triggers column |
| `tokens` | `Math.round((triggers + searchHints).length / 4)` |
| `paths` | from `searchHints` backticks (same rules) |
| `searchHints` | catalog searchHints column |

**Links** (dedupe; never link a node to itself):

| Type | Rule |
|------|------|
| `shared-path` | Two learned nodes share a path in `paths` |
| `cross-mention` | Slug of one learned node appears in another's file content (case-insensitive word boundary) |
| `catalog-hint` | Catalog orphan shares a token (≥4 chars, alphanumeric) with a learned node's triggers, content, or paths |

Each link: `{ "source": "<id>", "target": "<id>", "type": "<type>" }`

**Meta:**

```json
{
  "generatedAt": "<ISO-8601 now>",
  "agent": "cursor",
  "fivemDir": ".cursor/fivem",
  "counts": {
    "learned": <learned count>,
    "catalog": <catalog count>,
    "links": <link count>,
    "tokens": <sum of all node tokens>
  }
}
```

Use `"agent": "gemini"` and `"fivemDir": ".gemini/fivem"` for Gemini projects.

### Step 3 — Write HTML

Read `<agent>/fivem/knowledge-graph.html`. Replace **only** the token `/*__GRAPH_DATA__*/` with the JSON from step 2 (2-space indent, valid JavaScript). Do not change any other part of the file.

Write the result back to `<agent>/fivem/knowledge-graph.html`.

### Step 4 — Open browser

Open the HTML file in the default browser:

- **Windows:** `start "" "<absolute-path-to-knowledge-graph.html>"`
- **macOS:** `open "<path>"`
- **Linux:** `xdg-open "<path>"`

Or tell the user to open the file manually if shell open fails.

### Step 5 — Reply

Report:

- **Learned** nodes — existing `memory/*.md`
- **Catalog orphans** — topics in `topic-catalog.md` not yet learned
- **Links** — inferred connections
- Path to `knowledge-graph.html` and that the browser was opened

Remind user: re-run `/fivem graph` after `/fivem learn` to refresh the snapshot.

### Graph rules

- **Do not** run Node scripts or start HTTP servers
- **Do not** edit memory files during graph mode — only regenerate the HTML
- **Do not** keep a background process running
- If `<agent>/fivem/` is missing → user must run fivem-skill installer first

---

## Mode: Reference

Generate or update **`reference.mdc` in the project root** (same level as `resources/`, `server.cfg`, or main `fxmanifest.lua`).

This file is a **Cursor rule** (`alwaysApply: true`) with project-specific paths, flows, and anti-bug notes for future sessions.

Keep it **lean**: detailed flows for recurring topics belong in `<agent>/fivem/memory/<topic>.md` via `/fivem learn <topic>` — do not paste full craft/item recipes here. Memory files use compact technical English (`lang: en-compact`); only link to them from this rule.

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
- Read **`<agent>/fivem/reference.template.mdc`** for section structure (installed by fivem-skill)
- Read **`<agent>/fivem/reference.example.mdc`** for format/depth only (fictional sample — do not copy its paths)

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
5. **Sistemas custom** — one line per major feature pointing to memory or key config path (e.g. "Craft → `/fivem learn craft` ou `memory/craft.md`")
6. **Memórias por tópico** — table linking topics to `<agent>/fivem/memory/*.md` (filled by `/fivem learn`)
7. **Integrações** — cacheaside, Cerberus SafeEvent, oxmysql patterns **as used here**
8. **NUI** — source folder + `pnpm run build` path if applicable
9. **Git / submodules** — if relevant
10. **Skills FiveM** — `.cursor/skills/` paths installed in this project

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

0. **Before scanning the whole codebase** — read `<agent>/fivem/memory/_index.md`. If a memory exists for the detected topic (craft, item, loja, etc.), read **`memory/<topic>.md` first** and answer from it when sufficient. Memories are stored in **compact technical English** (`lang: en-compact`) for token efficiency — **translate/adapt to the user's language in your reply**, do not paste memory verbatim unless showing code paths.

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
   - Recurring project flow (craft, item, loja, NUI) → read `<agent>/fivem/memory/<topic>.md` if exists; else suggest `/fivem learn <topic>`
   - Project conventions → Read **`reference.mdc`** at project root if it exists

2. **Read the relevant skill** from the agent skills directory (`.cursor/skills/`, `.gemini/skills/`, etc.)

3. **Fetch current documentation** with WebFetch when needed (never invent natives or APIs)

4. **Answer** in the **user's language** with code examples, best practices, and common pitfalls — even when the source memory is English

### Framework Detection

Check `fxmanifest.lua` dependencies:

- `vrp` → vRP Creative Network
- `qbx_core` → Qbox
- `qb-core` → QBCore
- `es_extended` → ESX

See skill `fivem-development` → `framework-detection.md` for bridge patterns.

### No Hallucination Policy

NEVER invent native functions, framework APIs, or parameters. When uncertain, fetch documentation before answering.
