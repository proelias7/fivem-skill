# FiveM Development Skill — vRP, QBCore, Qbox & ESX

Agent Skill specialized in FiveM development with support for **vRP**, **QBCore**, **Qbox**, and **ESX** frameworks.

## Installation

### Cursor, Claude Code & Codex — install to project (recommended)

From your **FiveM project root**, run:

```bash
# Interactive — select agents and skills with checkboxes
npx github:proelias7/fivem-skill

# Skip prompts, use defaults (vrp + fivem + react-nui, all agents)
npx github:proelias7/fivem-skill -y

# Non-interactive flags
npx github:proelias7/fivem-skill --codex --skills vrp-framework
npx github:proelias7/fivem-skill --all -y
```

This copies skills and the FiveM helper to:

| Agent | Skills | Helper |
|-------|--------|--------|
| Cursor | `.cursor/skills/` | `.cursor/commands/fivem-dev.md` → `/fivem-dev` |
| Claude Code | `.claude/skills/` | `.claude/commands/fivem-dev.md` → `/fivem-dev` |
| Codex | `.agents/skills/` + `.codex/skills/` | `fivem-dev/SKILL.md` → `$fivem-dev` |

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
| **Cerberus v2.0** | SafeEvent (server anti-exploit) + SetCooldown (client rate-limit) |
| **cacheaside** | In-memory cache with TTL for database queries |
| **NUI (React + Vite)** | Shared UI skill for all frameworks |

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
│   ├── best-practices.md       # Performance, security, cache, cerberus
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

.cursor/
└── commands/
    └── fivem-dev.md            # /fivem-dev slash command helper
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
- **Anti-exploit:** Cerberus v2.0 (shared)
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

Cursor, Claude Code, Codex, GitHub Copilot, Cline, Windsurf, Roo Code, Gemini CLI, Amp, and [30+ others](https://github.com/vercel-labs/skills#supported-agents).

## Author

**Elias Araújo**

## License

MIT
