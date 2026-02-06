# FiveM Development Skill — vRP

Agent Skill especializada em desenvolvimento FiveM com o framework **vRP**.

## Instalação

```bash
# Instalar via npx skills (Cursor, Claude Code, Codex, Copilot, etc.)
npx skills add proelias7/fivem-skill

# Instalar globalmente (disponível em todos os projetos)
npx skills add proelias7/fivem-skill -g

# Instalar apenas para o Cursor
npx skills add proelias7/fivem-skill -a cursor

# Listar skills disponíveis
npx skills add proelias7/fivem-skill --list
```

## O que esta skill cobre

| Área | Descrição |
|------|-----------|
| **Framework vRP** | Arquitetura, Proxy/Tunnel, Passport/Source/Datatable |
| **API Completa** | Player, Money, Inventory, Groups, Survival, Database |
| **Comunicação** | Eventos, Tunnel, NUI callbacks, fire-and-forget |
| **Segurança** | Cerberus v2.0 (SafeEvent, SetCooldown), validações server-side |
| **Performance** | Sleep dinâmico, cache (cacheaside), payloads, lookup tables |
| **UI (NUI)** | React + Vite + Tailwind, proporções in-game, restrições do CEF |
| **Templates** | Boilerplates prontos para resources (server, client+server, NUI) |
| **Padrões** | Nomenclatura, estrutura de pastas, anti-padrões |

## Estrutura dos Arquivos

```
skills/fivem-development/
├── SKILL.md            # Entrada principal — visão geral e API resumida
├── reference.md        # Referência completa do framework (tabelas, queries, estados)
├── examples.md         # 13 exemplos práticos de código
├── templates.md        # 4 templates de resources prontos para uso
├── patterns.md         # Convenções, padrões de código e anti-padrões
├── best-practices.md   # Performance, cache, comunicação e segurança detalhada
└── ui-guide.md         # Guia completo de UI com React + Vite para FiveM
```

## Stack Coberta

- **Linguagem:** Lua 5.4 (server/client) + TypeScript/React (NUI)
- **Framework:** vRP Creative Network
- **Banco de dados:** oxmysql
- **Cache:** cacheaside
- **Anti-exploit:** Cerberus v2.0
- **UI:** React 18 + Vite + Tailwind CSS + Zustand

## Compatibilidade

Esta skill funciona com qualquer agente que suporte o [padrão Agent Skills](https://agentskills.io):

Cursor, Claude Code, Codex, GitHub Copilot, Cline, Windsurf, Roo Code, Gemini CLI, Amp, e [30+ outros](https://github.com/vercel-labs/skills#supported-agents).

## Autor

**Elias Araújo**

## Licença

MIT
