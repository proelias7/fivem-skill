# FiveM Agent Skills — vRP, QBCore, Qbox & ESX

Knowledge pack **`fivem`** for [fxmind](https://github.com/fx-mind/fxmind) — Agent Skills for **FiveM** development.

## Install via fxmind

```bash
# Interactive — select fivem pack (and skills) in the menu
npx github:fx-mind/fxmind

# Non-interactive — fivem pack + default skills
npx github:fx-mind/fxmind --pack fivem -y
```

Or skills only via [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add proelias7/fivem-skill
```

## Skills

| Skill | Description |
|-------|-------------|
| `fivem-development` | Best practices, natives, performance, security |
| `fivem-react-nui` | React + Vite NUI |
| `vrp-framework` | vRP Creative / vRPEX |
| `qbcore-framework` | QBCore |
| `qbox-framework` | Qbox (qbx_core) |
| `esx-framework` | ESX Legacy |

## Structure

```
skills/
├── fivem-development/
├── fivem-react-nui/
├── vrp-framework/
├── qbcore-framework/
├── qbox-framework/
└── esx-framework/
```

This repo is the **skills source** for the `fivem` knowledge pack. Templates (audit, topic catalog) live in [fxmind/packs/fivem](https://github.com/fx-mind/fxmind/tree/main/packs/fivem).

## License

MIT — **proelias7**
