# FiveM Agent Skills — vRP, QBCore, Qbox & ESX

**Source of truth for FiveM patterns** — consumed by [fxmind](https://github.com/fx-mind/fxmind) as the `fivem` knowledge pack.

## Repo split

| Repo | Role |
|------|------|
| **[fivem-skill](https://github.com/proelias7/fivem-skill)** (this repo) | Agent **skills** — `best-practices.md`, frameworks, NUI guides |
| **[fxmind](https://github.com/fx-mind/fxmind)** | **Tooling** — install, `/fxmind audit`, memory, graph, audit templates |

Skills install to `.fxmind/skills/` in the FiveM project. Audit reports write to `.fxmind/audits/`.

## Install

**Via fxmind (recommended):**

```bash
npx github:fx-mind/fxmind --pack fivem -y
```

Uses sibling path `../fivem-skill/skills` or clones from GitHub (`pack.json`).

**Skills CLI only:**

```bash
npx skills add proelias7/fivem-skill
```

## Skills

| Skill | Description |
|-------|-------------|
| `fivem-development` | Best practices (§1.6.1 broadcast, §2 view cache, §4 cerberus, §5.1 manager auth) |
| `fivem-react-nui` | React + Vite NUI |
| `vrp-framework` | vRP Creative / vRPEX |
| `qbcore-framework` | QBCore |
| `qbox-framework` | Qbox (qbx_core) |
| `esx-framework` | ESX Legacy |

## Structure

```
skills/
├── fivem-development/   ← best-practices.md, SKILL.md
├── fivem-react-nui/
├── vrp-framework/
├── qbcore-framework/
├── qbox-framework/
└── esx-framework/
```

## Audit workflow

1. Run **`/fxmind audit resources/[novos]/myresource`** in the FiveM project
2. Agent reads **`.fxmind/skills/fivem-development/best-practices.md`**
3. Report saved to **`.fxmind/audits/<resource>.md`** (template from fxmind pack)

Key audit rules live in `best-practices.md` **§2.4** (matrices V-a–V-j) and **§1.6.1** (`source` vs `-1` vs cerberus).

## License

MIT — [**proelias7**](https://github.com/proelias7)
