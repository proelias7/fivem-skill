# FiveM Development Skill — vRP, QBCore, Qbox & ESX

Agent Skill specialized in FiveM development with support for **vRP**, **QBCore**, **Qbox**, and **ESX** frameworks.

## Installation

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

## Supported Frameworks

### 1. vRP (Creative / vRPEX)
| Area | Description |
|------|-----------|
| **Core** | Proxy/Tunnel architecture, Passport/Source/Datatable |
| **API** | Player, Money, Inventory, Groups, Survival, Database |
| **Features** | Dynamic sleep, cacheaside, Cerberus v2.0 security |
| **Modules** | Identity, Inventory, Vehicles, Groups, Money |

### 2. QBCore Framework
| Area | Description |
|------|-----------|
| **Core** | `GetCoreObject()`, PlayerData, MetaData |
| **API** | `QBCore.Functions`, `Player.Functions`, Callbacks |
| **Features** | Server Callbacks, Useable Items, Job Loops |
| **Modules** | Jobs, Gangs, Items, Commands, Events |

### 3. Qbox Project (qbx_core)
| Area | Description |
|------|-----------|
| **Core** | Exports-first (`exports.qbx_core`), Modules, Bridge |
| **API** | `GetPlayer`, `Notify`, `UpsertPlayerData` |
| **Ox Integration** | `ox_lib` (UI/Callbacks), `ox_inventory`, `oxmysql` |

### 4. ESX Framework (Legacy)
| Area | Description |
|------|-----------|
| **Core** | `ESX.GetCoreObject()`, xPlayer, Shared Object |
| **API** | `xPlayer.addMoney`, `xPlayer.setJob`, `ESX.RegisterServerCallback` |
| **Features** | Menu-based UI (default), Ox Inventory support, OneSync |

## File Structure

```
skills/
├── fivem-development/          # vRP Framework (Legacy name: fivem-development)
│   ├── SKILL.md                # vRP Entry point
│   ├── reference.md            # vRP Full reference
│   └── ui-guide.md             # React + Vite UI Guide
│
├── qbcore-framework/           # QBCore Framework
│   ├── SKILL.md                # QBCore Entry point
│   ├── reference.md            # QBCore API reference
│   └── templates.md            # QBCore Templates
│
├── qbox-framework/             # Qbox Framework
│   ├── SKILL.md                # Qbox Entry point
│   ├── reference.md            # Qbox API reference
│   └── templates.md            # Qbox Templates
│
└── esx-framework/              # ESX Framework
    ├── SKILL.md                # ESX Entry point
    ├── reference.md            # ESX API reference
    ├── examples.md             # ESX Code examples
    ├── templates.md            # ESX Resource templates
    └── best-practices.md       # ESX Best practices
```

## Stack Covered

- **Language:** Lua 5.4 (server/client) + TypeScript/React (NUI)
- **Frameworks:**
    - vRP Creative Network (Proxy/Tunnel)
    - QBCore Framework (Core Object/Callbacks)
    - Qbox Project (Exports/Ox Lib)
    - ESX Framework (Shared Object/xPlayer)
- **Database:** oxmysql (All)
- **Cache:** cacheaside (vRP)
- **Anti-exploit:** Cerberus v2.0
- **UI:** React 18 + Vite + Tailwind CSS + Zustand

## Compatibility

This skill works with any agent that supports the [Agent Skills standard](https://agentskills.io):

Cursor, Claude Code, Codex, GitHub Copilot, Cline, Windsurf, Roo Code, Gemini CLI, Amp, and [30+ others](https://github.com/vercel-labs/skills#supported-agents).

## Author

**Elias Araújo**

## License

MIT
