#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const PACKAGE_ROOT = path.join(__dirname, "..");

const DEFAULT_SKILLS = [
  "vrp-framework",
  "fivem-development",
  "fivem-react-nui",
];

const DEFAULT_AGENTS = ["cursor", "claude", "codex"];

const COMMAND_FILE = "fivem-dev.md";
const COMMAND_SKILL_NAME = "fivem-dev";

const AGENTS = {
  cursor: {
    label: "Cursor",
    skillsDir: path.join(".cursor", "skills"),
    commandsDir: path.join(".cursor", "commands"),
    commandMode: "file",
  },
  claude: {
    label: "Claude Code",
    skillsDir: path.join(".claude", "skills"),
    commandsDir: path.join(".claude", "commands"),
    commandMode: "file",
  },
  codex: {
    label: "Codex",
    skillsDir: path.join(".agents", "skills"),
    altSkillsDir: path.join(".codex", "skills"),
    commandMode: "skill",
  },
};

function printHelp() {
  console.log(`
Install FiveM skills for Cursor, Claude Code, and/or Codex.

Usage:
  npx github:proelias7/fivem-skill              Interactive mode (checkbox menus)
  npx github:proelias7/fivem-skill -y           Skip prompts, use defaults
  npx github:proelias7/fivem-skill --all
  npx github:proelias7/fivem-skill --skills vrp-framework,fivem-react-nui
  node scripts/install.js --target ./my-fivem-resource

Options:
  --target <dir>     Project root (default: current directory)
  --skills <list>    Comma-separated skill names (skips interactive)
  --all              Install every skill (skips interactive)
  --cursor           Install for Cursor only
  --claude           Install for Claude Code only
  --codex            Install for Codex only
  --agent <list>     Comma-separated: cursor, claude, codex
  --no-command       Skip fivem-dev helper
  -i, --interactive  Force interactive mode
  -y, --yes          Skip prompts, use defaults
  -h, --help         Show this help

Interactive mode (default in terminal):
  1. Select agents (Cursor, Claude, Codex)
  2. Select skills to install
  3. Confirm fivem-dev helper
`);
}

function parseArgs(argv) {
  const options = {
    target: process.cwd(),
    skills: [...DEFAULT_SKILLS],
    agents: null,
    all: false,
    command: true,
    help: false,
    yes: false,
    interactive: false,
    explicitSkills: false,
    explicitAgents: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "-y" || arg === "--yes") {
      options.yes = true;
      continue;
    }

    if (arg === "-i" || arg === "--interactive") {
      options.interactive = true;
      continue;
    }

    if (arg === "--all") {
      options.all = true;
      options.explicitSkills = true;
      continue;
    }

    if (arg === "--no-command") {
      options.command = false;
      continue;
    }

    if (arg === "--cursor") {
      options.agents = ["cursor"];
      options.explicitAgents = true;
      continue;
    }

    if (arg === "--claude") {
      options.agents = ["claude"];
      options.explicitAgents = true;
      continue;
    }

    if (arg === "--codex") {
      options.agents = ["codex"];
      options.explicitAgents = true;
      continue;
    }

    if (arg === "--agent" || arg === "-a") {
      const value = argv[i + 1] || "";
      options.agents = value
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      options.explicitAgents = true;
      i += 1;
      continue;
    }

    if (arg === "--target") {
      options.target = path.resolve(argv[i + 1] || "");
      i += 1;
      continue;
    }

    if (arg === "--skills") {
      const value = argv[i + 1] || "";
      options.skills = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      options.explicitSkills = true;
      i += 1;
      continue;
    }
  }

  return options;
}

function wantsInteractive(options) {
  if (options.yes) return false;
  if (options.interactive) return true;
  if (options.explicitSkills || options.explicitAgents) return false;
  if (process.env.CI === "true" || process.env.CI === "1") return false;
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function getSkillDescription(skillName) {
  const skillPath = path.join(PACKAGE_ROOT, "skills", skillName, "SKILL.md");

  if (!fs.existsSync(skillPath)) {
    return skillName;
  }

  const content = fs.readFileSync(skillPath, "utf8");
  const match = content.match(/^description:\s*(.+)$/m);

  if (!match) {
    return skillName;
  }

  return match[1].trim().replace(/^["']|["']$/g, "");
}

async function promptSelections() {
  const { checkbox, confirm } = await import("@inquirer/prompts");
  const allSkills = listAllSkills();

  console.log("FiveM Skills Installer\n");

  const selectedAgents = await checkbox({
    message: "Select agents",
    choices: Object.entries(AGENTS).map(([value, agent]) => ({
      name: agent.label,
      value,
      checked: DEFAULT_AGENTS.includes(value),
    })),
    loop: false,
  });

  if (selectedAgents.length === 0) {
    return null;
  }

  const selectedSkills = await checkbox({
    message: "Select skills to install",
    choices: allSkills.map((name) => ({
      name: truncate(`${name} — ${getSkillDescription(name)}`, 90),
      value: name,
      checked: DEFAULT_SKILLS.includes(name),
    })),
    loop: false,
  });

  if (selectedSkills.length === 0) {
    return null;
  }

  const installCommand = await confirm({
    message: "Install fivem-dev helper (/fivem-dev or $fivem-dev)?",
    default: true,
  });

  return {
    agents: selectedAgents,
    skills: selectedSkills,
    command: installCommand,
  };
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function resolveAgents(agentNames) {
  const resolved = [];

  for (const name of agentNames) {
    if (!AGENTS[name]) {
      throw new Error(
        `Unknown agent: ${name}. Valid: ${Object.keys(AGENTS).join(", ")}`,
      );
    }
    resolved.push({ id: name, ...AGENTS[name] });
  }

  return resolved;
}

function listAllSkills() {
  const skillsDir = path.join(PACKAGE_ROOT, "skills");
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) =>
      fs.existsSync(path.join(skillsDir, name, "SKILL.md")),
    )
    .sort();
}

function copyDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function readCommandSource() {
  const src = path.join(PACKAGE_ROOT, ".cursor", "commands", COMMAND_FILE);
  if (!fs.existsSync(src)) {
    throw new Error(`Command file not found: ${COMMAND_FILE}`);
  }
  return fs.readFileSync(src, "utf8");
}

function toCodexSkillContent(content) {
  if (/^---[\s\S]*?name:/m.test(content)) {
    return content;
  }

  return content.replace(
    /^---\n/,
    `---\nname: ${COMMAND_SKILL_NAME}\n`,
  );
}

function installSkill(skillName, targetRoot, agent) {
  const src = path.join(PACKAGE_ROOT, "skills", skillName);

  if (!fs.existsSync(src)) {
    throw new Error(`Skill not found in package: ${skillName}`);
  }

  if (!fs.existsSync(path.join(src, "SKILL.md"))) {
    throw new Error(`Invalid skill (missing SKILL.md): ${skillName}`);
  }

  const destinations = [path.join(targetRoot, agent.skillsDir, skillName)];

  if (agent.altSkillsDir) {
    destinations.push(path.join(targetRoot, agent.altSkillsDir, skillName));
  }

  for (const dest of destinations) {
    copyDir(src, dest);
  }

  return destinations.map((dest) => path.relative(targetRoot, dest));
}

function installCommand(targetRoot, agent) {
  const content = readCommandSource();

  if (agent.commandMode === "skill") {
    const skillContent = toCodexSkillContent(content);
    const destinations = [
      path.join(
        targetRoot,
        agent.skillsDir,
        COMMAND_SKILL_NAME,
        "SKILL.md",
      ),
    ];

    if (agent.altSkillsDir) {
      destinations.push(
        path.join(
          targetRoot,
          agent.altSkillsDir,
          COMMAND_SKILL_NAME,
          "SKILL.md",
        ),
      );
    }

    for (const dest of destinations) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, skillContent, "utf8");
    }

    return destinations.map((dest) => path.relative(targetRoot, dest));
  }

  const dest = path.join(targetRoot, agent.commandsDir, COMMAND_FILE);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(
    path.join(PACKAGE_ROOT, ".cursor", "commands", COMMAND_FILE),
    dest,
  );

  return [path.relative(targetRoot, dest)];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!fs.existsSync(options.target)) {
    console.error(`Error: target directory does not exist: ${options.target}`);
    process.exit(1);
  }

  if (wantsInteractive(options)) {
    const selections = await promptSelections();

    if (!selections) {
      console.log("Installation cancelled.");
      process.exit(0);
    }

    options.agents = selections.agents;
    options.skills = selections.skills;
    options.command = selections.command;
  } else {
    if (!options.agents) {
      options.agents = [...DEFAULT_AGENTS];
    }

    if (options.all) {
      options.skills = listAllSkills();
    }
  }

  const skills = options.skills;
  const agents = resolveAgents(options.agents);

  if (skills.length === 0) {
    console.error("Error: no skills selected.");
    process.exit(1);
  }

  console.log(`\nInstalling to: ${options.target}\n`);

  for (const agent of agents) {
    console.log(`[${agent.label}]`);

    for (const skill of skills) {
      const dests = installSkill(skill, options.target, agent);
      for (const dest of dests) {
        console.log(`  ✓ skill   → ${dest}`);
      }
    }

    if (options.command) {
      const dests = installCommand(options.target, agent);
      for (const dest of dests) {
        console.log(`  ✓ command → ${dest}`);
      }
    }

    console.log("");
  }

  console.log("Done.");
  console.log("Restart Cursor / Claude Code / Codex or open a new session.");
  console.log("Use /fivem-dev (Cursor, Claude) or $fivem-dev (Codex) for help.");
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
