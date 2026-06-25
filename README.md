# FiveM Development Skill — vRP, QBCore, Qbox & ESX

Agent Skill specialized in FiveM development with support for **vRP**, **QBCore**, **Qbox**, and **ESX** frameworks.

## Installation

### Cursor, Claude Code, Codex & OpenCode — install to project (recommended)

From your **FiveM project root**, run:

```bash
# Interactive — select agents and skills with checkboxes
npx github:proelias7/fivem-skill

# Skip prompts, use defaults (vrp + fivem + react-nui, Cursor only)
npx github:proelias7/fivem-skill -y

# Non-interactive flags
npx github:proelias7/fivem-skill --gemini -y
npx github:proelias7/fivem-skill --opencode -y
npx github:proelias7/fivem-skill --codex --skills vrp-framework
npx github:proelias7/fivem-skill --all -y
```

Optional — install once globally, then run `fivem-skill -y` in any project:

```bash
npm install -g github:proelias7/fivem-skill
fivem-skill -y
```

This copies skills and the FiveM helper to:

| Agent | Skills | Helper |
|-------|--------|--------|
| Cursor | `.cursor/skills/` | `.cursor/commands/fivem.md` → `/fivem`, `/fivem reference`, `/fivem audit`, `/fivem learn`, `/fivem memory health`, `/fivem graph`, `/fivem query`, `/fivem path`, `/fivem explain` |
| Claude Code | `.claude/skills/` | `.claude/commands/fivem.md` → `/fivem` |
| Codex | `.agents/skills/` + `.codex/skills/` | `fivem/SKILL.md` → `$fivem` |
| Gemini CLI | `.gemini/skills/` (+ `.agents/skills/` alias) | `.gemini/commands/` → `/fivem`, `/fivem:reference`, `/fivem:audit`, `/fivem:learn`, `/fivem:memory`, `/fivem:graph`, `/fivem:query`, `/fivem:path`, `/fivem:explain` |
| OpenCode | `.opencode/skills/` | `.opencode/commands/fivem.md` → `/fivem`, `/fivem reference`, `/fivem audit`, `/fivem learn`, `/fivem memory health`, `/fivem graph`, `/fivem query`, `/fivem path`, `/fivem explain` |

**Shared project memory** (all agents): `.fivem/` at the project root — memories, graph, and templates. Skills/commands stay per-agent; memory is unified.

Templates for reference/audit/memory ship to **`.fivem/`** (once per project). After install on Gemini, run `/commands reload`.

### Shared memory (`.fivem/`)

Every agent reads and writes the **same** memory folder:

```
.fivem/
├── memory/
│   ├── _index.md           # topic router
│   └── <topic>.md          # compact English recipes
├── knowledge-graph.json    # graph snapshot
├── knowledge-graph.html    # 3D map
├── topic-catalog.md        # learn search hints
├── *.template.md           # audit/memory/health skeletons
└── reference.example.mdc   # sample reference format
```

**Migration:** Re-running `fivem-skill -y` merges legacy per-agent memories (`.cursor/fivem/memory/`, `.gemini/fivem/memory/`, `.opencode/fivem/memory/`) into `.fivem/memory/` — newer `updated` date wins. Legacy memory folders are kept until you remove them manually after validation.

**Tip:** Commit `.fivem/memory/` to git so your team and every agent share the same project knowledge.

**Layers:**

| Layer | Path | Role |
|-------|------|------|
| Reference | `reference.mdc` (project root) | Lean always-on map — paths, integrations, links to memories |
| Memory | `.fivem/memory/<topic>.md` | Shared compact recipe per topic — structured frontmatter + grep-verified literals |
| Graph | `.fivem/knowledge-graph.json` | Topic graph snapshot for agent retrieval (`query`, `path`, `explain`) |
| Skill | `<agent>/skills/fivem-development/` | Framework-agnostic best practices |

The `/fivem reference` subcommand instructs the agent to scan your project and write **`reference.mdc`** at the project root (Cursor rule with `alwaysApply: true`). Templates ship to `.fivem/` for structure and examples.

**Language policy:** chat and `reference.mdc` follow the user's/project language (often PT-BR). Topic memories under `.fivem/memory/` are stored in **compact technical English** (`lang: en-compact`) to reduce tokens when the agent loads them — the agent translates/adapts when replying to the user.

### Commands after install

| Command | Action |
|---------|--------|
| `/fivem como criar item usável?` | FiveM help (natives, framework, skills) |
| `/fivem reference` | Scan project → generate/update `reference.mdc` at project root |
| `/fivem audit` | Audit resource for security, performance, patterns → correction plan (includes **view cache / rebuild-on-send**, **globals cross-file check** §2.3, §3.6) |
| `/fivem audit resources/[Novos]/myresource` | Audit specific path only |
| `/fivem learn craft` | Scan codebase → save topic memory at `.fivem/memory/craft.md` |
| `/fivem learn list` | List learned topics (`.fivem/memory/_index.md`) + suggested catalog |
| `/fivem memory health` | Check memories vs codebase — stale paths, dead events, index/reference drift, token format |
| `/fivem memory health fix` | Same + auto-fix memories, sync index/reference, compact English rewrite |
| `/fivem memory health craft` | Health check for one topic (`craft`, `item`, …) |
| `/fivem graph` | Build `knowledge-graph.json` + 3D HTML map and open in browser |
| `/fivem query "como craft entrega item?"` | BFS traversal over topic graph, load memories with token budget |
| `/fivem query "fluxo webhook" --dfs` | DFS trace for specific event/export chains |
| `/fivem query "inventário" --budget 1200` | Cap loaded memory context at N tokens |
| `/fivem path craft inventario` | Shortest path between two learned topics |
| `/fivem explain webhook` | Explain a topic node and its connections |

Re-run `/fivem reference` when you add major systems — the agent merges with the existing file.

Re-run `/fivem learn <topic>` when configs or handlers for that topic change.

Run `/fivem memory health` after refactors or deletes — catches stale paths/events still referenced in memories. Use `/fivem memory health fix` to prune dead refs, rewrite compact English, and sync `_index.md` / `reference.mdc`.

Re-run `/fivem graph` after learning new topics to refresh `.fivem/knowledge-graph.json` and the 3D map. Use `/fivem query` for agent retrieval without rescanning the repo.

`/fivem audit` is **read-only** and **assertive** (§2.4, §5.1): full resource from `fxmanifest`, manager events matrix, view-cache matrix V-a–V-i, globals cross-file grep, cooldown ≠ permission, severity aligned to phases. Output: `.fivem/audit-<resource>.md`. Does not edit code until you approve.

`/fivem learn` is **scan + markdown only**: writes `.fivem/memory/<topic>.md` (compact English, ~25–60 lines), updates `_index.md`, and adds a link row in `reference.mdc` — does not edit Lua/JS.

`/fivem memory health [fix] [topic]` is **verify + optional markdown repair**: writes `.fivem/memory-health.md`, validates paths/events against repo, checks index/reference sync and token format; `fix` rewrites memories to compact English without touching Lua/JS.

`/fivem graph` reads topic memories, writes `.fivem/knowledge-graph.json` and `.fivem/knowledge-graph.html`, and opens the HTML in the browser. Re-run after `/fivem learn` to refresh.

`/fivem query`, `/fivem path`, and `/fivem explain` are **read-only graph retrieval**: traverse the topic graph, load only relevant memories with a token budget, and answer in the user's language. Task mode uses the graph automatically when `.fivem/knowledge-graph.json` exists.

Local development (from this repo):

```bash
node scripts/install.js --target /path/to/your-fivem-project
```

### Via skills CLI (installs to `.agents/skills/`)

```bash
# Install via npx skills (Cursor, Claude Code, Codex, Copilot, etc.)
npx skills add proelias7/fivem-skill

# Install globally (available in all projects)
npx skills add proelias7/fivem-skill -g

# Install only for Cursor
npx skills add proelias7/fivem-skill -a cursor

# List available skills
npx skills add proelias7/fivem-skill --list
```

## Features

| Feature | Description |
|---------|-------------|
| **Best Practices** | Performance, security, client/server communication (framework-agnostic) |
| **Asset Discovery** | PlebMasters Forge integration + common props, vehicles, peds, weapons |
| **Framework Bridge** | Auto-detection of vRP, QBCore, Qbox, ESX + abstraction layer |
| **Dynamic Docs Fetch** | Anti-hallucination policy + WebFetch from official sources |
| **Cerberus** | Modular: `SendFullSync` / `SendDeltaSync`, `SafeEvent`, `SetCooldown` |
| **cacheaside** | In-memory cache with TTL for database queries |
| **NUI (React + Vite)** | Shared UI skill for all frameworks |
| **Project Reference** | `/fivem reference` generates `reference.mdc` with paths, flows, and anti-bug notes |
| **Topic Memory** | `/fivem learn <topic>` scans the repo and saves compact English memory with structured frontmatter (~25–60 lines) |
| **Memory Health** | `/fivem memory health [fix]` verifies memories vs codebase, frontmatter arrays, graph drift; optional auto-fix |
| **3D Knowledge Graph** | `/fivem graph` builds `.fivem/knowledge-graph.json` + static HTML map of learned + catalog topics |
| **Graph Query** | `/fivem query` — BFS/DFS retrieval over topic graph with token budget |
| **Graph Path / Explain** | `/fivem path <a> <b>` and `/fivem explain <topic>` for flow tracing |
| **Code Audit** | `/fivem audit` scans for security, performance, and pattern issues + correction plan |

## Supported Frameworks

### 1. vRP (Creative / vRPEX) — skill `vrp-framework`
| Area | Description |
|------|-----------|
| **Core** | Proxy/Tunnel architecture, Passport/Source/Datatable |
| **API** | Player, Money, Inventory, Groups, Survival, Database |
| **Modules** | Identity, Inventory, Vehicles, Groups, Money |

### 2. QBCore Framework — skill `qbcore-framework`
| Area | Description |
|------|-----------|
| **Core** | `GetCoreObject()`, PlayerData, MetaData |
| **API** | `QBCore.Functions`, `Player.Functions`, Callbacks |
| **Modules** | Jobs, Gangs, Items, Commands, Events |

### 3. Qbox Project (qbx_core) — skill `qbox-framework`
| Area | Description |
|------|-----------|
| **Core** | Exports-first (`exports.qbx_core`), Modules, Bridge |
| **API** | `GetPlayer`, `Notify`, `UpsertPlayerData` |
| **Ox Integration** | `ox_lib`, `ox_inventory`, `oxmysql` |

### 4. ESX Framework (Legacy) — skill `esx-framework`
| Area | Description |
|------|-----------|
| **Core** | `ESX.GetCoreObject()`, xPlayer, Shared Object |
| **API** | `xPlayer.addMoney`, `xPlayer.setJob`, `ESX.RegisterServerCallback` |
| **Features** | Menu-based UI, Ox Inventory support, OneSync |

## File Structure

```
skills/
├── fivem-development/          # Best practices (framework-agnostic)
│   ├── SKILL.md                # Entry point + fetch policy + performance rules
│   ├── best-practices.md       # Performance, cache, cerberus (load balance + SafeEvent), security
│   ├── asset-discovery.md      # PlebMasters + props/vehicles/peds/weapons
│   └── framework-detection.md  # Auto-detection + multi-framework bridge
│
├── vrp-framework/              # vRP Creative Network
│   ├── SKILL.md                # vRP Entry point + API summary
│   ├── reference.md            # Full vRP reference
│   ├── examples.md             # vRP code examples
│   ├── templates.md            # vRP resource templates
│   └── patterns.md             # vRP patterns and conventions
│
├── fivem-react-nui/            # NUI Interface (React + Vite) — shared by all frameworks
│   ├── SKILL.md                # NUI Entry point
│   └── ui-guide.md             # React + Vite UI Guide
│
├── qbcore-framework/           # QBCore Framework
│   ├── SKILL.md
│   ├── reference.md
│   └── templates.md
│
├── qbox-framework/             # Qbox Framework
│   ├── SKILL.md
│   ├── reference.md
│   └── templates.md
│
└── esx-framework/              # ESX Framework
    ├── SKILL.md
    ├── reference.md
    ├── examples.md
    ├── templates.md
    └── best-practices.md

templates/
├── commands/
│   ├── fivem.md                # Cursor / Claude / OpenCode command template
│   └── gemini/                 # Gemini CLI TOML commands
│       ├── fivem.toml          # /fivem
│       └── fivem/
│           ├── reference.toml  # /fivem:reference
│           ├── audit.toml      # /fivem:audit
│           ├── learn.toml      # /fivem:learn
│           ├── graph.toml      # /fivem:graph
│           ├── query.toml      # /fivem:query
│           ├── path.toml       # /fivem:path
│           └── explain.toml    # /fivem:explain
├── fivem/
│   ├── audit.template.md
│   ├── memory.template.md
│   ├── memory-index.template.md
│   ├── memory-health.template.md
│   ├── topic-catalog.md
│   └── knowledge-graph.html    # install seeds .fivem/knowledge-graph.json in target project
├── scripts/
│   └── install.js
└── rules/
    ├── reference.template.mdc  # skeleton for /fivem reference
    └── reference.example.mdc   # fictional sample showing expected depth/format
```

## Stack Covered

- **Language:** Lua 5.4 (server/client) + TypeScript/React (NUI)
- **Frameworks:**
    - vRP Creative Network (Proxy/Tunnel) — `vrp-framework`
    - QBCore Framework (Core Object/Callbacks) — `qbcore-framework`
    - Qbox Project (Exports/Ox Lib) — `qbox-framework`
    - ESX Framework (Shared Object/xPlayer) — `esx-framework`
- **Database:** oxmysql (All)
- **Cache:** cacheaside (shared)
- **Network sync:** cerberus load balance (`SendFullSync`, `SendDeltaSync`)
- **Security:** cerberus `SafeEvent` / `SetCooldown` (shared)
- **UI:** React 18 + Vite + Tailwind CSS v3 + Zustand (`fivem-react-nui`)

## Documentation Sources

| Source | URL | Usage |
|--------|-----|-------|
| FiveM Natives | https://docs.fivem.net/natives/ | Native functions |
| Native Mirror | https://github.com/proelias7/fivem-natives | Offline reference |
| QBox | https://docs.qbox.re/ | QBox framework |
| QBCore | https://docs.qbcore.org/ | QBCore framework |
| ESX | https://docs.esx-framework.org/ | ESX framework |
| ox_lib | https://overextended.dev/ox_lib | Utility library |
| PlebMasters | https://forge.plebmasters.de/ | GTA V assets |

## Compatibility

This skill works with any agent that supports the [Agent Skills standard](https://agentskills.io):

Cursor, Claude Code, Codex, OpenCode, GitHub Copilot, Cline, Windsurf, Roo Code, Gemini CLI, Amp, and [30+ others](https://github.com/vercel-labs/skills#supported-agents).

## Author

**Elias Araújo**

## License

MIT
