---
description: "FiveM helper — task workflow, docs, reference, audit, learn, memory health, graph, query, path, explain"
argument-hint: "<task/question> | reference | audit [scope] | learn <topic> | memory health [fix] [topic] | graph | query \"<question>\" [--dfs] [--budget N] | path <a> <b> | explain <topic>"
---

# FiveM

**Input:** $ARGUMENTS

## Routing

Parse `$ARGUMENTS` (trim, case-insensitive):

| Input | Mode |
|-------|------|
| `reference` or `reference ...` | **Reference** — generate/update `reference.mdc` at project root |
| `audit` or `audit ...` | **Audit** — scan code, report issues, output correction plan |
| `learn` or `learn <topic>` | **Learn** — generate/update topic memory in `.fivem/memory/` |
| `learn list` | **Learn** — list topics in `_index.md` + catalog |
| `memory health` or `memory health fix` | **Memory health** — verify memories vs codebase + integration + token format |
| `memory health <topic>` or `memory health <topic> fix` | **Memory health** — single topic (optional auto-fix) |
| `graph` | **Graph** — build knowledge-graph.json + HTML snapshot |
| `query` or `query "<question>"` | **Query** — BFS/DFS traversal over topic graph, load memories with budget |
| `query "<question>" --dfs` | **Query** — DFS trace for specific flow chains |
| `query "<question>" --budget N` | **Query** — cap loaded memory context at N tokens (default 1500) |
| `path <topic-a> <topic-b>` | **Path** — shortest path between two learned topics |
| `explain <topic>` | **Explain** — describe a topic node and its connections |
| implementation/correction request | **Task** — analyze, retrieve minimal memories, implement, then capture reusable knowledge |
| empty or conceptual question | **Help** — answer FiveM development questions |

**Audit scope** (optional after `audit`):

- `audit` alone → resource/folder from user `@` mention, open files, or ask which resource to audit
- `audit resources/[Novos]/myresource` → audit that path only
- `audit server.lua` → audit file if path exists

---

## Shared memory (`.fivem/`)

All agents (Cursor, Claude, Gemini, OpenCode, Codex) read and write the **same project memory** under `.fivem/` at the project root.

| Path | Role |
|------|------|
| `.fivem/memory/<topic>.md` | Shared topic memories |
| `.fivem/memory/_index.md` | Memory router |
| `.fivem/topic-catalog.md` | Learn search hints |
| `.fivem/knowledge-graph.json` | Topic graph for query/path/explain |
| `.fivem/*.template.md` | Report/memory skeletons (read-only) |

**Read policy:** always prefer `.fivem/memory/` and `.fivem/knowledge-graph.json`. If a topic exists only under a legacy per-agent folder (`.cursor/fivem/memory/`, `.gemini/fivem/memory/`, `.opencode/fivem/memory/`), read it as fallback and suggest re-running `fivem-skill -y` or `/fivem memory health fix` to consolidate.

**Write policy:** `learn`, `memory health fix`, and `graph` write **only** to `.fivem/` — never to per-agent memory folders.

---

## Mode: Task

Use Task mode when the user asks to **make, create, implement, fix, adjust, refactor, add, remove, wire, migrate, or change code/config** in a FiveM project. This mode optimizes delivery time by loading only the memory needed for the task, then learning from the completed work.

### Step 1 — Initial task analysis

Before scanning broadly, identify:

| Item | What to infer |
|------|---------------|
| Goal | requested behavior or bug fix |
| Scope | likely resource/module/files from args, `@` mentions, open files, and project conventions |
| Tech topics | e.g. NUI, inventory, item, group/permission, webhook, DB, events, config, framework |
| Risk | security validation, money/items, permissions, client/server trust, NUI callbacks, performance |
| Memory hints | candidate slugs/aliases/triggers to search in memory index |

### Step 2 — Ask when context is missing

If uncertainty can change the implementation path, stop before editing code and ask concise numbered questions in chat. Continue only after the user answers.

Ask when unsure about:

- target resource/file when multiple matches are plausible
- expected behavior or business rule
- group/permission/job rules
- client vs server vs NUI responsibility
- data migration or destructive changes
- two valid approaches with meaningful trade-offs
- money, inventory, permission, vehicle, XP, ban, or sensitive event behavior

Do **not** ask for trivial details that can be resolved by reading existing code, loaded memories, `reference.mdc`, or obvious local patterns.

### Step 3 — Selective memory retrieval

Use memories as a routing cache, not as a bulk context dump.

**Fast path — graph router (when `knowledge-graph.json` exists):**

1. Read `.fivem/knowledge-graph.json` (fallback: extract `GRAPH_DATA` from `knowledge-graph.html`).
2. Expand task keywords against graph vocabulary (node `id`, `name`, `triggers`, `events`, `paths`) — up to 12 tokens from vocab only.
3. BFS from best-matching learned nodes (depth 3); link priority: `event-flow` > `shared-resource` > `shared-path` > `shared-symbol` > `cross-mention`.
4. Load `memory/<topic>.md` for traversed nodes with budget **~1500 tokens** (hubs full, depth-1 Recipe+Files, depth-2+ frontmatter+Files).
5. If graph returns no matches, fall through to index matching below.

**Fallback — index matching:**

1. Read `.fivem/memory/_index.md` first if it exists.
2. Read `.fivem/topic-catalog.md` for aliases/search hints.
3. Match the task against memory rows by slug, canonical slug, aliases, triggers, paths, symbols, and resource names.
4. Load only the relevant `memory/<topic>.md` files, normally **3–5 maximum**.
5. If no memory matches, use `topic-catalog.md`, `reference.mdc`, and the task files directly.
6. Do not load all memories just to be safe.

Canonical matching:

- lowercase, strip accents, remove punctuation
- simple singular/plural normalization (`grupos` → `grupo`, `items` → `item`)
- compare topic, filename slug, triggers, aliases, path fragments, and known symbols

### Step 4 — Implement with loaded knowledge

After retrieval:

1. Read the real code files needed for the task.
2. Follow project patterns from relevant memories, `reference.mdc`, and skills.
3. Edit Lua/JS/TS/NUI/config only as required by the task.
4. Prefer existing helpers/events/framework APIs over new abstractions.
5. Validate with focused lints/tests/grep where practical.
6. Do **not** edit memory files during the main implementation phase.

### Step 5 — Post-task learning review

After implementation and validation, review whether the work produced reusable project knowledge.

Create or update memory only when there is verified, reusable knowledge such as:

- a project-specific flow understood end-to-end
- a module/resource integration pattern
- events, exports, callbacks, permissions, config keys, item ids, DB tables, or paths useful for future tasks
- a local convention that differs from generic FiveM knowledge
- a correction that changes an existing memory's recipe or pitfalls

Do **not** create memory for:

- tiny style/text changes
- one-off bug fixes with no reusable flow
- guesses or generic FiveM advice without repo evidence
- duplicated topic already covered by an equivalent memory

### Step 6 — Create or update memory without duplicates

When the learning review qualifies:

1. Read `_index.md` and candidate `memory/<topic>.md` files before writing.
2. Canonicalize the topic (`grupos` → `grupo`, singular/plural, aliases).
3. Update an existing memory if it covers the same domain.
4. Create a new memory only for a distinct domain.
5. Use `.fivem/memory.template.md` structure, compact English, `lang: en-compact`, ~25–60 lines.
6. Frontmatter arrays (`resources`, `paths`, `events`, `exports`, `symbols`, `triggers`) — grep-confirmed literals only; `confidence: extracted`.
7. Include only verified repo literals: paths, events, exports, config keys, permissions, examples.
7. Update `.fivem/memory/_index.md`; create from `memory-index.template.md` if missing.
8. If `reference.mdc` exists, update only one row under `## Memórias por tópico`.

### Step 7 — Reply

Reply in the user's language with the implementation summary and validation. If memory changed, add:

- `Memória criada: .fivem/memory/<topic>.md`
- or `Memória atualizada: .fivem/memory/<topic>.md`
- suggest `/fivem graph` to refresh the 3D knowledge map

If no reusable knowledge was learned, omit memory noise unless it clarifies the outcome.

### Task rules

- Optimize context: read the index first, then only relevant memories.
- Never invent paths, events, APIs, permissions, or framework behavior.
- Memory writes are allowed only after code work is complete and only for verified reusable knowledge.
- Preserve unrelated user changes in the working tree.

---

## Mode: Audit

**Read-only analysis.** Do **not** edit code unless the user explicitly asks to implement fixes after reviewing the plan.

Audit the target Lua/JS resource(s) for **security**, **performance**, and **patterns**. Deliver a structured report + prioritized correction plan.

> **Assertiveness:** Follow **`best-practices.md` §2.4** (mandatory passes) and **§5.1** (manager events). An audit that covers only one file, skips the view-cache matrix, or treats cooldown as permission is **failed/incomplete** — redo before delivering.

### Step 1 — Load standards

Read from the project agent skills directory (`.cursor/skills/`, `.gemini/skills/`, `.opencode/skills/`, `.claude/skills/`, or `.agents/skills/`):

| Skill file | Sections |
|------------|----------|
| `fivem-development/best-practices.md` | §2.2–**§2.4** (view cache + **assertiveness**), §3.6 globals, §4 Cerberus, **§5.1** manager auth |
| Framework skill (`vrp-framework`, etc.) | If detected |
| `fivem-react-nui/ui-guide.md` | If scope includes NUI/web |

Read **`.fivem/audit.template.md`** for report structure.

If **`reference.mdc`** exists at project root → read for project-specific conventions.

### Step 2 — Discover scope (full resource — Pass 0)

1. Resolve target resource folder from `$ARGUMENTS` or user `@` mention
2. Read **`fxmanifest.lua`** — enumerate **all** script paths
3. Read **every** `server/**/*.lua`, `client/**/*.lua`, `shared/**/*.lua`, and NUI scripts listed in the manifest
4. Do **not** stop at the file the user mentioned unless they explicitly scoped to that file only
5. Grep for high-risk patterns:

```text
RegisterNetEvent / RegisterServerEvent / AddEventHandler
RegisterNUICallback
TriggerServerEvent / TriggerClientEvent
exports["cerberus"]
SafeEvent / SetCooldown
SendFullSync / SendDeltaSync
exports["cacheaside"]
while true do Wait(0)
TriggerEvent(  (same-environment abuse)
build.*ListItem|build.*Item.*TriggerClientEvent
Sanitize.*Cache|ChunkTable|CHUNK_SIZE|Load.*Player
Get.*SummaryList|Get.*List\(
Load.*Cache\(
json\.decode
MySQL / oxmysql / exports.oxmysql
^[A-Z][A-Za-z0-9_]*\s*=  (top-level globals — verify cross-file use)
RegisterNetEvent\("manager:|RegisterNetEvent\("admin:
CanUse.*Manager|CanManage|hasGroup|hasPermission|SafeEvent
playerConnect|playerJoining|playerSpawned
```

6. **View cache matrix (§2.3–2.4 Pass 2)** — mandatory; document every row V-a through V-i as found or N/A:

   a. Grep **every** `build*`, `Sanitize*`, `Get*List`, `Get*Summary*`, `Load*Player`, `Load*Cache`, `ChunkTable`.
   b. For **each** caller: read enclosing handler name; record `file:line` + symbol.
   c. Explicitly search: `TriggerClientEvent\([^)]*build`, same-handler double build, CRUD + `Load*Player` + delta fn.
   d. Flag all applicable rows — **do not report only the first match**.

7. **Globals pass (§3.6 Pass 3)** — build **Globals table** (Symbol | Declared | Used in | Verdict) for every top-level global in server scope, then client scope.

8. **Manager events pass (§5.1 Pass 4)** — build **Manager events matrix** for every `manager:*` / admin event: SafeEvent, real permission, cooldown-only trap, severity.

9. **Pass 6 self-check** — complete checklist in §2.4 before writing report.

### Step 3 — Evaluate (evidence required — Pass 1)

Every finding **must** cite `file:line` **and** name the exact **event/function symbol**. Read the line before citing — never attribute a pattern to the wrong handler.

#### Security — manager / admin (§5.1)

- Any `manager:*` / admin event without **real** server permission (`hasGroup`, etc.)
- **Do not** treat cooldown-only helpers (`CanUse*Manager`, rate maps by `source`) as permission
- Missing `SafeEvent` on create/update/delete — compare siblings in same resource
- Read events (`get*`, `list*`) leaking config/perms/coords without auth → **Critical**
- `teleport*` admin actions without permission

Report as **systemic finding** when multiple events share the same missing auth pattern.

#### Security — general
- Client/NUI data used without server re-validation
- Repetitive client/NUI actions without `cerberus` `SetCooldown` before `TriggerServerEvent`
- Missing permission checks (`hasGroup`, `hasPermission`, job checks)
- `source = -1` flood risk on server events
- SQL built from unsanitized client strings
- Webhooks/tokens in client or shared files exposed to NUI

#### Performance — view cache & hot-path rebuild (§2.2–2.4)

Report **separate findings** for each matrix row hit (V-a through V-i):

- **V-a** `build*` inside `TriggerClientEvent` argument
- **V-b** `build*List()` in get/open event handler
- **V-c** double build (item + list same handler)
- **V-d** triple sync (delta + full list + `Load*Player` same CRUD)
- **V-e** `Load*Player` on connect/bootstrap
- **V-f** `Load*Player` after single CRUD when delta exists
- **V-g** full `Load*Cache()` after one DB write
- **V-h** duplicate transform / duplicate function definitions
- **V-i** manual chunk + `Wait` loop

#### Performance — general

- `Wait(0)` / tight loops without dynamic sleep
- Callbacks/Tunnel where events would suffice (no return needed)
- Callbacks or `TriggerServerEvent` inside loops < 5s interval
- Same-side `TriggerEvent` instead of direct function call
- Repeated DB queries without `cacheaside`
- Large table payloads sent manually without cerberus `SendFullSync` / `SendDeltaSync`
- Large table payloads over network (> ~8KB risk)

#### Patterns & clean code (§3.5–3.10, §1.3)

- Over-split fxmanifest (many server/client files for one resource)
- **Unnecessary globals** — top-level symbol not read by any other file in same scope (§3.6); verify via fxmanifest scope before flagging
- Duplicated logic (same `json.decode`/normalize in multiple functions)
- Comment noise, state declared mid-file
- Long if/elseif chains where lookup table fits
- Missing nil guards on concatenation
- **Thin event wrappers** — `local function foo() TriggerEvent(...) end` with no other logic (inline the event or merge into a real helper)
- **Same-side `TriggerEvent`** when a local function in the same file could be called directly
- **Rebuild-on-send** — `TriggerClientEvent(..., buildItem(id, rawCache))`; pre-build view cache on load/CRUD (§2.2–2.3)

#### Correction plan — view cache findings

For each §2.3 finding in the report, the plan must include:

1. **New caches** — name `SourceCache` / `ViewCache` / optional `ViewListCache`
2. **Rebuild hooks** — where to call `rebuildViewItem(id)` / `rebuildViewAll()` (load, create, update, delete)
3. **Send sites** — replace hot-path `build*` calls with cached references
4. **Delta vs full** — remove redundant `Load*Player` when delta event or `SendDeltaSync` exists; keep full bootstrap from pre-built chunks only
5. **Minimal snippet** — before/after for the worst caller (`file:line`)

Do not recommend a full rewrite — smallest change that stops hot-path rebuild.

#### NUI (when applicable)

- NUI callbacks without `cb("{}")` or valid JSON
- Repetitive client/NUI actions without local cooldown/debounce
- Heavy UI libraries (MUI, framer-motion, etc.)

Assign severity:

| Level | When |
|-------|------|
| **Critical** | Exploit / CRUD or data leak without server auth / free items or money / crash / ban bypass |
| **High** | Hot-path rebuild, full resync on delta, serious perf regression |
| **Medium** | Full DB cache reload, duplicate code, unnecessary global |
| **Low** | Style, minor perf, polish |

**Phase alignment (§2.4 Pass 5):** Critical → Phase 1; High → Phase 2; Medium → Phase 3; Low → Phase 4. Never downgrade.

### Step 4 — Write report

Save to **`.fivem/audit-<resource-name>.md`**.

Use structure from `audit.template.md` — **required sections:**

1. Summary table (severity counts)
2. **Manager events matrix** (or N/A)
3. **View cache matrix** (rows V-a–V-i: Found / N/A)
4. **Globals table** (Symbol | Declared | Used in | Verdict)
5. Findings tables: Security, Performance (view cache IDs `V-a`…), Patterns, NUI
6. **Correction plan** — phased; severity must match findings
7. **Files reviewed** — every manifest Lua file with line count
8. **Pass 6 self-check** — all boxes ticked

Write report in **Portuguese** if codebase/comments are PT-BR; otherwise match project language.

### Step 5 — Reply to user

In chat, provide:

- Short executive summary (3–5 bullets)
- Count of findings by severity + **files reviewed** (must match fxmanifest)
- Mention if view-cache matrix or manager matrix had hits
- Top 3 fixes by priority
- Path to full report: `.fivem/audit-<name>.md`
- Ask: *"Quer que eu implemente o Phase 1?"* (or equivalent) — **wait for approval before editing code**

### Audit rules

- **Never invent** findings — read `file:line` before citing; wrong handler = failed audit
- **Never treat cooldown as permission** — `CanUse*Manager` with only `os.time()` is rate-limit, not auth (§5.1)
- **Never audit one file** when user scoped the resource — read full `fxmanifest` unless explicitly single-file
- **Never skip view-cache matrix rows** — report each V-a–V-i as found or N/A
- **Never mismatch severity and phase** — High findings go to Phase 2, not Phase 3
- **Do not** auto-fix during audit mode
- Prefer concrete **before/after** snippets for every Critical/High finding
- If scope is too large, audit **one resource at a time** (full manifest), not one file
- **Do not recommend** creating a function whose body is only `TriggerEvent(...)` / `TriggerServerEvent(...)` — inline at call site, or expand into a helper that also closes NUI/camera/state (see best-practices §1.3)
- **Do not recommend** `TriggerEvent` for logic that already exists as `local function` in the same file — call the function directly
- When a fix needs a cross-resource hook (e.g. `login:Spawn`, `hookSelector`), show the **inlined** `TriggerEvent` in the plan, not a one-line wrapper alias

---

## Mode: Learn

Generate or update a **topic memory** at `.fivem/memory/<topic>.md` (shared by all agents).

**Do not implement code** in this mode — only scan, write markdown, and update index/reference links.

### Step 1 — Resolve topic

1. Parse `$ARGUMENTS` after `learn` (e.g. `craft`, `item-usavel`, `dona-capivara`)
2. If `learn list` → read `.fivem/memory/_index.md` and `.fivem/topic-catalog.md`; reply with table; stop
3. Normalize slug: lowercase, hyphens, no spaces → `memory/<slug>.md`

### Step 2 — Load context

Read from agent skills directory (`.cursor/skills/`, `.gemini/skills/`, `.opencode/skills/`, etc.):

| File | Purpose |
|------|---------|
| `fivem-development/best-practices.md` | Patterns, anti-bugs |
| Framework skill (`vrp-framework`, etc.) | If detected |
| `.fivem/topic-catalog.md` | Search hints for known topics |
| `.fivem/memory.template.md` | Output skeleton |
| `reference.mdc` at project root | If exists — project paths |
| `.fivem/memory/<topic>.md` | If exists — **merge** (preserve valid content, update paths) |

### Step 3 — Scan codebase

1. Match topic to catalog row if possible; use its grep/paths hints
2. Unknown topic → infer paths from user request + `reference.mdc`
3. Grep + read files — **every path in output must exist in the repo**
4. Extract: config paths, handlers, events, checklists, one real example from the codebase

### Step 4 — Write memory

Save to **`.fivem/memory/<topic>.md`** using `memory.template.md` structure (**~25–60 lines**, token-efficient):

- Frontmatter: `topic`, `updated`, `framework`, `lang: en-compact`, `confidence: extracted`
- Structured arrays (grep-confirmed): `resources`, `paths`, `events`, `exports`, `symbols`, `triggers`
- Sections: `Files`, `Recipe`, `Example`, `Pitfalls`, `Skills` — **compact technical English only**
- No prose, no tables unless essential; bullet lists and short imperative lines
- Keep repo literals verbatim: paths, events, item ids, permissions, resource names
- **Do not** write memory in Portuguese — memory is shared project context (`lang: en-compact`), not user-facing chat

### Step 5 — Update index

Update **`.fivem/memory/_index.md`** — table row: topic | file | triggers | last updated.
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
- Path: `.fivem/memory/<topic>.md`
- If codebase changed heavily since last learn → suggest re-running `/fivem learn <topic>`
- Suggest `/fivem graph` to refresh the 3D knowledge map

### Learn rules

- **Never invent** paths, events, or APIs
- **Do not** edit Lua/JS during learn mode
- Cursor Agent: use **AskQuestion** if critical context is missing; otherwise ask in chat
- **Memory file:** compact technical English (`lang: en-compact`) — shared project memory
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
| `.fivem/memory-health.template.md` | Report structure |
| `.fivem/memory.template.md` | Target compact format |
| `.fivem/memory/_index.md` | Index integration |
| `.fivem/topic-catalog.md` | Catalog orphans (info) |
| `reference.mdc` | Section `## Memórias por tópico` |
| `.fivem/memory/<topic>.md` | Each topic to verify |
| `.fivem/knowledge-graph.json` | If present — graph drift vs memories |

### Step 3 — Verify each memory (evidence required)

For every topic file, extract and validate:

#### Paths

- Backtick strings that look like repo paths (`/`, `\`, or extensions `.lua`, `.js`, `.tsx`, `.json`, `.cfg`)
- Frontmatter `paths[]` entries — each must exist in repo
- **Missing file** → Stale/Broken (critical if listed under `Files:` or `Recipe:`)

#### Events / symbols

Grep repo for symbols mentioned in memory and frontmatter:

```text
RegisterNetEvent / RegisterServerEvent / AddEventHandler
TriggerServerEvent / TriggerClientEvent (quoted event names)
exports["..."] / exports['...']
frontmatter events[], exports[], symbols[]
vRP.* / QBCore.* / ESX.* / lib.*
function names referenced in Recipe steps
```

- **Zero matches** for a quoted event or export used as a step → Stale
- **Zero matches** for primary handler/event in `Files:` or `Recipe:` → Broken

#### Frontmatter structure

| Issue | Flag |
|-------|------|
| Missing `lang: en-compact` | Token |
| Missing `confidence` | Token |
| `paths[]` / `events[]` / `exports[]` with zero grep matches | Stale/Broken |
| Arrays contain invented literals not in repo | Broken |

#### Integration

| Check | Drift |
|-------|-------|
| `_index.md` row | topic in index but no `memory/<topic>.md` |
| `memory/*.md` file | file exists but missing from `_index.md` |
| `reference.mdc` table | link to missing memory file |
| `reference.mdc` | topic in memory folder but no row in `## Memórias por tópico` |

#### Graph drift (when `knowledge-graph.json` exists)

| Check | Drift |
|-------|-------|
| Learned node in graph | no matching `memory/<id>.md` |
| `memory/*.md` topic | missing from graph learned nodes |
| Stale `generatedAt` | memories updated after graph `meta.generatedAt` |

If graph drift detected → recommend `/fivem graph` refresh.

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

Save **`.fivem/memory-health.md`** using `memory-health.template.md`:

- Summary counts (OK / Stale / Broken / Integration / Token)
- Per-topic table + detail blocks with grep evidence
- Integration section
- Recommended actions

Write report in **user's language**; memory files stay compact English.

### Step 5 — Fix mode (when `fix` in args)

Only after verification — **never invent** replacements:

1. **Prune** lines referencing missing paths/events (grep-confirmed dead refs)
2. **Rewrite** to `memory.template.md` — compact English, `lang: en-compact`, ~25–60 lines; refresh frontmatter arrays from surviving grep evidence
3. **Re-scan** repo for that topic (catalog hints + surviving valid paths) to refresh `Files`, `Recipe`, `Example`, `Pitfalls`
4. **Sync** `_index.md` (topic | file | triggers | updated) and `reference.mdc` one-row links
5. **Broken topics** mostly empty after prune → keep minimal stub + flag **re-learn**: `/fivem learn <topic>` — do not guess new APIs

Update frontmatter `updated` on changed memories.

### Step 6 — Reply

Reply in **user's language**:

- Summary table (topics × verdict)
- Path: `.fivem/memory-health.md`
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

Execute the **graph generator operation** and open the resulting HTML. This is not Task mode, not Learn mode, and not a refactor opportunity.

Graph mode is intentionally mechanical:

- read memory/catalog files
- build the graph JSON in the agent response context
- replace only the `GRAPH_DATA` payload in the existing HTML
- open the HTML or report its path

Do **not** think beyond this operation, improve graph code, tune visuals, edit templates, learn memories, create scripts, or modify project code.

This mode is file-only: **no Python, no Node, no Bash helper, no generated script, no HTTP server, no background process**.

### Step 1 — Read sources

From the FiveM project root, read:

- `.fivem/memory/_index.md` (topic table)
- `.fivem/memory/*.md` (exclude `_index.md`)
- `.fivem/topic-catalog.md` (catalog orphans)

If `.fivem/` is missing → user must run fivem-skill installer first.

Legacy fallback: if `.fivem/memory/` is empty but `.cursor/fivem/memory/`, `.gemini/fivem/memory/`, or `.opencode/fivem/memory/` has topics, read from legacy paths and suggest `fivem-skill -y` to migrate.

### Step 2 — Build graph JSON

Assemble a single JSON object with `nodes`, `links`, and `meta` directly from the files read in Step 1.

Do **not** create or execute helper code to build the JSON. The graph data must be assembled by the agent from file contents and written directly into the existing HTML.

Do not scan the source codebase for extra evidence in graph mode. Links come from the existing memory files only.

**Learned nodes** (one per `memory/<slug>.md`):

| Field | Source |
|-------|--------|
| `id` | slug (filename without `.md`, lowercase) |
| `name` | frontmatter `topic`, or index row, or slug |
| `group` | `"learned"` |
| `file` | path relative to project root (e.g. `.fivem/memory/craft.md`) |
| `updated` | frontmatter `updated` or index column |
| `framework` | frontmatter `framework` or `""` |
| `triggers` | frontmatter `triggers[]` or index triggers column or `""` |
| `events` | frontmatter `events[]` or quoted events extracted from content |
| `exports` | frontmatter `exports[]` or extracted from content |
| `resources` | frontmatter `resources[]` or inferred from path segments under `resources/` |
| `tokens` | `Math.round(content.length / 4)` |
| `paths` | frontmatter `paths[]` if present; else array from backtick values containing `/`, `\`, `.lua`, `.md`, or `config.` |
| `searchHints` | `""` |

**Catalog nodes** (from `topic-catalog.md` — **skip if already covered by a learned topic**):

Before adding a catalog row, build a **canonical topic key** for every learned node and skip catalog rows that match the same concept.

**Canonical key rules** (apply to slug, `name`, `topic`, and trigger tokens):

- lowercase, strip accents, remove punctuation
- split camelCase / separators into tokens
- simple singularize: `grupos` → `grupo`, `items` → `item`, `permissions` → `permission`
- ignore generic tokens: `config`, `script`, `module`, `system`, `core`, `main`, `utils`

**Skip catalog orphan when any learned node matches by:**

- exact slug (`grupo` learned → skip catalog `grupo`)
- canonical slug (`grupo` learned → skip catalog `grupos`)
- learned `name` / `topic` equals catalog slug or alias
- catalog triggers contain the learned slug or its canonical form (e.g. learned `grupo`, catalog triggers include `grupo` or `grupos`)

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

**Links** (dedupe; never link a node to itself; **only between learned nodes** — catalog orphans never receive links):

Infer links from **code evidence**, not slug similarity alone. Prefer stronger signals first; dedupe by `{source, target}` pair (keep highest-priority type).

| Type | Rule |
|------|------|
| `shared-path` | Same file path, or same resource folder (e.g. both under `resources/inventory/`) |
| `shared-resource` | Same FiveM resource name or same `fxmanifest.lua` path |
| `event-flow` | One memory registers/handles an event the other triggers (quoted event names match) |
| `shared-symbol` | Same export, framework call, config key, or handler function (e.g. `vRP.hasGroup`, `inventory:useItem`) |
| `cross-mention` | Slug of one learned node appears in another's file content (word boundary) |
| `domain-related` | ≥2 strong technical tokens shared in triggers/content/paths (exclude generic words above) |

**Module grouping:** when one topic spans several scripts inside a resource (e.g. inventory core + itemlist + chest), link related learned topics via `shared-resource`, `shared-path`, or `event-flow` — do **not** create a virtual hub node.

Each link: `{ "source": "<id>", "target": "<id>", "type": "<type>", "confidence": "extracted" }` for frontmatter-backed links; `"inferred"` for content-only inference.

**Surprising connections** (for reply only — do not add extra nodes):

- Cross-resource `event-flow` links (topics in different `resources/<name>/` folders)
- High-degree hub nodes (degree ≥ 3)
- Catalog orphans with triggers matching user-facing terms but no learned memory yet

**Meta:**

```json
{
  "generatedAt": "<ISO-8601 now>",
  "agent": "shared",
  "fivemDir": ".fivem",
  "counts": {
    "learned": <learned count>,
    "catalog": <catalog count>,
    "links": <link count>,
    "tokens": <sum of all node tokens>
  }
}
```

Always use `"agent": "shared"` and `"fivemDir": ".fivem"` — the graph is shared across all agents.

### Step 3 — Write JSON and HTML

Write the same JSON object to **both**:

1. `.fivem/knowledge-graph.json` (2-space indent, valid JSON)
2. `.fivem/knowledge-graph.html` — replace only the graph data payload

Read `.fivem/knowledge-graph.html`. Replace **only** the graph data payload with the JSON from step 2 (2-space indent, valid JavaScript). Do not change any other part of the file.

Payload replacement rule:

- If `/*__GRAPH_DATA__*/` exists, replace only that token.
- Otherwise replace only the object assigned to `const GRAPH_DATA = ...;`.
- Preserve all HTML, CSS, JS functions, visual settings, imports, comments, and formatting outside the `GRAPH_DATA` assignment.

Write the result back to `.fivem/knowledge-graph.html`.

Allowed writes in graph mode:

- `.fivem/knowledge-graph.json`
- `.fivem/knowledge-graph.html`

Forbidden writes in graph mode:

- temporary scripts such as `.py`, `.js`, `.mjs`, `.cjs`, `.sh`, `.ps1`
- build scripts, helper tools, package files, generated logs, cache files
- memory files, catalog files, templates, or source code

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
- **Surprising connections** — cross-resource event-flows, hub nodes, catalog gaps
- Paths to `knowledge-graph.json` and `knowledge-graph.html`; browser opened for HTML

Remind user: re-run `/fivem graph` after `/fivem learn`; use `/fivem query` for agent retrieval.

### Graph rules

- **Do not** enter Task mode or run post-task memory capture during `graph`
- **Do not** improve, tune, refactor, reformat, or edit graph HTML/JS/CSS beyond replacing `GRAPH_DATA`
- **Do not** scan Lua/JS/source resources to infer new knowledge; graph uses existing memories only
- **Do not** create or run scripts of any kind: Python, Node, Bash, PowerShell, batch, or generated helper files
- **Do not** run build tools, package managers, formatters, watchers, servers, or shell pipelines to assemble the JSON
- Shell is allowed only for opening the final HTML in the browser; if opening fails, tell the user the path instead
- **Do not** edit memory files during graph mode — only regenerate the HTML
- **Do not** keep a background process running
- **Do not** modify `knowledge-graph.html` structure during graph mode — only replace the embedded graph data
- If `.fivem/` is missing → user must run fivem-skill installer first

---

## Mode: Query

Answer a question by **traversing the topic knowledge graph** and loading only relevant memories. Read-only — do not edit code or memory files.

Parse `$ARGUMENTS` after `query`:

- Question text in quotes (required)
- `--dfs` → depth-first trace for specific flow chains
- `--budget N` → cap loaded memory context at N tokens (default **1500**)

### Step 1 — Load graph

1. Read `.fivem/knowledge-graph.json` if it exists
2. If missing → extract `GRAPH_DATA` from `.fivem/knowledge-graph.html`
3. If neither exists → tell user to run `/fivem learn <topic>` then `/fivem graph`; stop

### Step 2 — Vocabulary expansion (required)

Build vocabulary from graph learned nodes only: `id`, `name`, `triggers`, `paths`, `events`, `exports`, `resources`.

Select up to **12 tokens from this vocabulary** that match the question intent. Hard rules:

- Pick only tokens present in the graph vocabulary
- Do not invent synonyms from training memory
- If no tokens match → say plainly; stop

Print before traversal:

```text
Query expanded to: [token1, token2, ...]
```

### Step 3 — Traversal

| Mode | When |
|------|------|
| **BFS** (default) | Broad context — neighbors layer by layer, depth 3 |
| **DFS** (`--dfs`) | Trace a specific chain — depth max 6 |

1. Score learned nodes by token overlap; take top 1–3 start nodes
2. Traverse using link priority: `event-flow` > `shared-resource` > `shared-path` > `shared-symbol` > `cross-mention` > `domain-related`
3. Catalog nodes are never traversal targets

### Step 4 — Load memories (budget-aware)

For each traversed learned node, load `memory/<topic>.md`:

| Depth | Load |
|-------|------|
| Hub (degree ≥ 3) | Full memory, up to 40 lines |
| BFS depth 1 | `Files` + `Recipe` |
| BFS depth 2+ | Frontmatter + `Files` only |
| DFS chain | Full memory for nodes on the path |

Stop when `--budget` token estimate is reached (`chars / 4`).

### Step 5 — Answer

Reply in **user's language**. Cite memory paths and link types used. Quote events/paths from memories only.

If graph lacks enough information → say so; suggest `/fivem learn <topic>` or `/fivem graph`.

### Query rules

- **Do not** scan full codebase beyond loaded memory files
- **Do not** edit any files
- **Do not** invent edges or events not in graph/memories

---

## Mode: Path

Find the **shortest path** between two learned topics. Read-only.

Parse `$ARGUMENTS` after `path`: `<topic-a> <topic-b>` (e.g. `path craft inventario`).

### Step 1 — Load graph

Same as Query Step 1 (`knowledge-graph.json` → HTML fallback).

### Step 2 — Match nodes

Match each argument to best learned node by: exact `id`, canonical slug, `name`, or `triggers` overlap.

If either node not found → list closest learned matches; stop.

### Step 3 — Shortest path

Unweighted shortest path over learned-node links only.

When multiple equal-length paths exist, prefer paths with more `event-flow` and `shared-resource` hops.

### Step 4 — Explain

Reply in **user's language**:

1. Hop list: `craft --event-flow--> inventario --shared-resource--> webhook`
2. What each hop means (read linked memory files)
3. Key events/paths cited from memories

Suggest `/fivem explain <topic>` or `/fivem query "<follow-up>"` for deeper exploration.

### Path rules

- **Do not** edit files or invent connections not in the graph

---

## Mode: Explain

Describe a **single topic node** and its connections. Read-only.

Parse `$ARGUMENTS` after `explain`: `<topic>` slug or name.

### Step 1 — Load graph and memory

1. Load graph (same as Query Step 1)
2. Load `memory/<topic>.md` for matched node

### Step 2 — Match node

Find best learned node by exact `id`, canonical slug, `name`, or triggers.

If not found → list learned topics from graph; stop.

### Step 3 — Output

Reply in **user's language** (3–5 sentences):

1. What this topic does (from memory `Recipe` / `Files`)
2. Direct neighbors grouped by link type
3. Highest-value connection (`event-flow` first) and why it matters
4. Degree (connection count) and resource scope

Suggest `/fivem path <this> <neighbor>` for trace if useful.

### Explain rules

- **Do not** edit files or invent edges

---

## Mode: Reference

Generate or update **`reference.mdc` in the project root** (same level as `resources/`, `server.cfg`, or main `fxmanifest.lua`).

This file is a **Cursor rule** (`alwaysApply: true`) with project-specific paths, flows, and anti-bug notes for future sessions.

Keep it **lean**: detailed flows for recurring topics belong in `.fivem/memory/<topic>.md` via `/fivem learn <topic>` — do not paste full craft/item recipes here. Memory files use compact technical English (`lang: en-compact`); only link to them from this rule.

### Step 1 — Discover the project

Search and read (do not guess paths):

1. **Framework** — `fxmanifest.lua` dependencies, `resources/[System]/`, `qb-core`, `qbx_core`, `es_extended`, `vrp`
2. **Core config** — item lists, groups/jobs, economy, shops
3. **Custom resources** — `[Novos]`, `[Exclusive]`, `[Scripts]`, etc.
4. **Integrations** — `cacheaside`, `cerberus`, `oxmysql`, `ox_lib`, webhooks/Discord
5. **NUI** — React/Vite projects (`src/ui/project`, build output paths)
6. **Security patterns** — server validation, cooldowns, inventory validation
7. **Git** — submodules, monorepo layout

Use semantic search, grep, and file reads. Every path in the output must exist in the repo.

### Step 2 — Read existing context

- If **`reference.mdc`** exists at project root → read it and **merge/update** (preserve valid sections, replace outdated paths)
- Read **`.fivem/reference.template.mdc`** for section structure (installed by fivem-skill)
- Read **`.fivem/reference.example.mdc`** for format/depth only (fictional sample — do not copy its paths)

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
6. **Memórias por tópico** — table linking topics to `.fivem/memory/*.md` (filled by `/fivem learn`)
7. **Integrações** — cacheaside, cerberus (`SendFullSync` / `SendDeltaSync`, `SafeEvent`, `SetCooldown`), oxmysql patterns **as used here**
8. **NUI** — source folder + `pnpm run build` path if applicable
9. **Git / submodules** — if relevant
10. **Skills FiveM** — `.cursor/skills/`, `.opencode/skills/`, etc. paths installed in this project

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

0. **Before scanning the whole codebase** — read `.fivem/memory/_index.md`. If a memory exists for the detected topic (craft, item, loja, etc.), read **`memory/<topic>.md` first** and answer from it when sufficient. Memories are stored in **compact technical English** (`lang: en-compact`) for token efficiency — **translate/adapt to the user's language in your reply**, do not paste memory verbatim unless showing code paths.

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
   - Recurring project flow (craft, item, loja, NUI) → read `.fivem/memory/<topic>.md` if exists; else suggest `/fivem learn <topic>`
   - Architecture / cross-topic flow → suggest `/fivem query "<question>"` if `knowledge-graph.json` exists
   - Project conventions → Read **`reference.mdc`** at project root if it exists

2. **Read the relevant skill** from the agent skills directory (`.cursor/skills/`, `.gemini/skills/`, `.opencode/skills/`, etc.)

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
