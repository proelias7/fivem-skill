# FiveM Agent Skills — vRP, QBCore, Qbox & ESX

**Source of truth for FiveM patterns** — consumed by [fxmind](https://github.com/fx-mind/fxmind) as the `fivem` knowledge pack.

## Repo split

| Repo | Role |
|------|------|
| **[fivem-skill](https://github.com/proelias7/fivem-skill)** (this repo) | Agent **skills** — `fivem-development` (split refs), frameworks, NUI guides |
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
| `fivem-development` | Best practices — one skill, split refs (`communication` / `performance` / `architecture` / `style` / `security` / `api`) |
| `fivem-react-nui` | React + Vite NUI |
| `vrp-framework` | vRP Creative / vRPEX |
| `qbcore-framework` | QBCore |
| `qbox-framework` | Qbox (qbx_core) |
| `esx-framework` | ESX Legacy |

## Structure

```
skills/
├── fivem-development/
│   ├── SKILL.md              ← thin router
│   ├── best-practices.md     ← index (stable § links)
│   ├── communication.md      ← §1
│   ├── performance.md        ← §1.4–1.6.2, §2.1–2.2, §4.1–4.2, §4.5
│   ├── audit-passes.md       ← §2.3–2.5 (audit only)
│   ├── quality-gates.md      ← task-mode checklist
│   ├── architecture.md       ← §3.5–3.6, §3.8
│   ├── style.md              ← §3.1–3.4, §3.7, §3.9–3.10
│   ├── security.md           ← §4.6–4.8, §5.1–5.4
│   └── api.md                ← §4.3–4.4
├── fivem-react-nui/
├── vrp-framework/
├── qbcore-framework/
├── qbox-framework/
└── esx-framework/
```

## Audit workflow

1. Run **`/fxmind audit resources/[novos]/myresource`** in the FiveM project
2. Agent reads **`SKILL.md`** then on-demand: `audit-passes.md` §2.3–§2.5, `performance.md` §1.6.1, `security.md` §5.1
3. Report saved to **`.fxmind/audits/<resource>.md`** (template from fxmind pack)

Key audit rules: **§2.4** / **§2.5** in `audit-passes.md`, **§1.6.1** in `performance.md`, **§5.1** in `security.md`. Index: `best-practices.md`.

## Principles

fxmind installs `.fxmind/policy/fivem-principles.md` (IDs N1–N6, D1–D3, T1–T2, C1–C4). `SKILL.md` maps each ID to the sections here; corrections are folded into the matching section as a short `Rule (ID)` line — not appended as new "Learned rule" sections.

## License

MIT — [**proelias7**](https://github.com/proelias7)
