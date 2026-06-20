#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { npxInstall, globalInstall } = require("./constants");

const PACKAGE_ROOT = path.join(__dirname, "..");

const DEFAULT_SKILLS = [
  "vrp-framework",
  "fivem-development",
  "fivem-react-nui",
];

const DEFAULT_AGENTS = ["cursor"];

const COMMAND_FILE = "fivem.md";
const COMMAND_SKILL_NAME = "fivem";
const COMMAND_TEMPLATE = path.join("templates", "commands", COMMAND_FILE);
const LEGACY_COMMAND_FILE = "fivem-dev.md";
const LEGACY_COMMAND_SKILL = "fivem-dev";
const REFERENCE_TEMPLATES_DIR = path.join("templates", "rules");
const FIVEM_TEMPLATES_DIR = path.join("templates", "fivem");
const GEMINI_COMMANDS_DIR = path.join("templates", "commands", "gemini");
const FIVEM_TEMPLATE_FILES = [
  "reference.template.mdc",
  "reference.example.mdc",
  "audit.template.md",
  "memory.template.md",
  "memory-index.template.md",
  "memory-health.template.md",
  "topic-catalog.md",
  "knowledge-graph.html",
];
const LEGACY_FIVEM_FILES = [
  "knowledge-graph.template.html",
  "knowledge-graph.data.json",
  "knowledge-graph.live.json",
  "graph-data.json",
  "live-graph.json",
  "build-knowledge-graph.js",
  "build-knowledge-graph.mjs",
  "build-knowledge-graph.cjs",
  "build-knowledge-graph.py",
  "generate-knowledge-graph.js",
  "generate-knowledge-graph.py",
  "update-knowledge-graph.js",
  "update-knowledge-graph.py",
  path.join("scripts", "build-knowledge-graph.js"),
  path.join("scripts", "build-knowledge-graph.mjs"),
  path.join("scripts", "build-knowledge-graph.cjs"),
  path.join("scripts", "build-knowledge-graph.py"),
  path.join("scripts", "generate-knowledge-graph.js"),
  path.join("scripts", "generate-knowledge-graph.py"),
  path.join("scripts", "update-knowledge-graph.js"),
  path.join("scripts", "update-knowledge-graph.py"),
];
const AGENT_FIVEM_DIRS = {
  cursor: path.join(".cursor", "fivem"),
  gemini: path.join(".gemini", "fivem"),
};

const AGENTS = {
  cursor: {
    label: "Cursor",
    skillsDir: path.join(".cursor", "skills"),
    commandsDir: path.join(".cursor", "commands"),
    commandMode: "file",
    fivemTemplatesDir: AGENT_FIVEM_DIRS.cursor,
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
  gemini: {
    label: "Gemini CLI",
    skillsDir: path.join(".gemini", "skills"),
    altSkillsDir: path.join(".agents", "skills"),
    commandsDir: path.join(".gemini", "commands"),
    commandMode: "toml",
    fivemTemplatesDir: AGENT_FIVEM_DIRS.gemini,
  },
};

function printHelp() {
  console.log(`
Install FiveM skills for Cursor, Claude Code, Codex, and/or Gemini CLI.

Recommended (install once globally, then use short command):
  ${globalInstall()}
  fivem-skill -y

Without global install:
  ${npxInstall()}              Interactive mode (checkbox menus)
  ${npxInstall("-y")}          Skip prompts, use defaults
  ${npxInstall("--all")}       Install every skill
  ${npxInstall("--gemini -y")} Gemini only

Local dev (from this repo):
  node scripts/install.js --target ./my-fivem-resource

Options:
  --target <dir>     Project root (default: current directory)
  --skills <list>    Comma-separated skill names (skips interactive)
  --all              Install every skill (skips interactive)
  --cursor           Install for Cursor only
  --claude           Install for Claude Code only
  --codex            Install for Codex only
  --gemini           Install for Gemini CLI only
  --agent <list>     Comma-separated: cursor, claude, codex, gemini
  --no-command       Skip /fivem helper
  -i, --interactive  Force interactive mode
  -y, --yes          Skip prompts, use defaults
  -h, --help         Show this help

Interactive mode (default in terminal):
  1. Select agents (Cursor, Claude, Codex, Gemini CLI)
  2. Select skills to install
  3. Confirm /fivem helper
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

    if (arg === "--gemini") {
      options.agents = ["gemini"];
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

function ensureNonInteractiveChoice(options) {
  if (options.yes || options.explicitAgents) {
    return;
  }

  if (process.stdin.isTTY && process.stdout.isTTY) {
    return;
  }

  console.error(
    "Non-interactive terminal detected. Choose one:\n" +
      `  ${npxInstall("-y")}\n` +
      `  ${npxInstall("--cursor")}\n` +
      `  ${npxInstall("--agent cursor,claude,gemini")}\n`,
  );
  process.exit(1);
}

function getManagedSkillNames(skills, includeCommand) {
  const names = new Set(skills);
  if (includeCommand) {
    names.add(COMMAND_SKILL_NAME);
    names.add(LEGACY_COMMAND_SKILL);
  }
  return names;
}

function isDirEmpty(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return false;
  }

  return fs.readdirSync(dirPath).length === 0;
}

function pruneEmptyDirsUpward(dirPath, stopAt) {
  let current = dirPath;

  while (current.startsWith(stopAt) && current !== stopAt) {
    if (!fs.existsSync(current) || !isDirEmpty(current)) {
      break;
    }

    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

function removeFivemFiles(targetRoot, relativeDestDir, fileNames) {
  const removed = [];

  for (const fileName of fileNames) {
    const filePath = path.join(targetRoot, relativeDestDir, fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    fs.rmSync(filePath, { recursive: true, force: true });
    removed.push(path.relative(targetRoot, filePath));
  }

  pruneEmptyDirsUpward(path.join(targetRoot, relativeDestDir), targetRoot);
  return removed;
}

function cleanLegacyFivemFiles(targetRoot, relativeDestDir) {
  return removeFivemFiles(targetRoot, relativeDestDir, LEGACY_FIVEM_FILES);
}

function cleanUnselectedAgents(targetRoot, selectedAgentIds, managedSkills) {
  for (const [agentId, agent] of Object.entries(AGENTS)) {
    if (selectedAgentIds.includes(agentId)) {
      continue;
    }

    if (agent.commandsDir && agent.commandMode === "file") {
      for (const fileName of [COMMAND_FILE, LEGACY_COMMAND_FILE]) {
        const commandPath = path.join(targetRoot, agent.commandsDir, fileName);
        if (fs.existsSync(commandPath)) {
          fs.unlinkSync(commandPath);
        }
      }

      pruneEmptyDirsUpward(
        path.join(targetRoot, agent.commandsDir),
        targetRoot,
      );
    }

    if (agent.commandsDir && agent.commandMode === "toml") {
      const commandPaths = [
        path.join(targetRoot, agent.commandsDir, "fivem.toml"),
        path.join(targetRoot, agent.commandsDir, "fivem"),
      ];

      for (const commandPath of commandPaths) {
        if (fs.existsSync(commandPath)) {
          fs.rmSync(commandPath, { recursive: true, force: true });
        }
      }

      pruneEmptyDirsUpward(
        path.join(targetRoot, agent.commandsDir),
        targetRoot,
      );
    }

    if (agent.fivemTemplatesDir) {
      cleanFivemTemplates(targetRoot, agent.fivemTemplatesDir);
    }

    const skillRoots = [path.join(targetRoot, agent.skillsDir)];
    if (agent.altSkillsDir) {
      skillRoots.push(path.join(targetRoot, agent.altSkillsDir));
    }

    for (const skillRoot of skillRoots) {
      for (const skillName of managedSkills) {
        const skillPath = path.join(skillRoot, skillName);
        if (fs.existsSync(skillPath)) {
          fs.rmSync(skillPath, { recursive: true, force: true });
        }
      }

      pruneEmptyDirsUpward(skillRoot, targetRoot);
    }
  }
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
  const { CancelPromptError } = await import("@inquirer/core");
  const allSkills = listAllSkills();

  console.log("FiveM Skills Installer\n");
  console.log("Tip: Space to toggle, Enter to confirm.\n");

  try {
    const selectedAgents = await checkbox({
      message: "Select agents",
      choices: Object.entries(AGENTS).map(([value, agent]) => ({
        name: agent.label,
        value,
        checked: value === "cursor",
      })),
      loop: false,
      required: true,
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
      required: true,
    });

    if (selectedSkills.length === 0) {
      return null;
    }

    const installCommand = await confirm({
      message:
        "Install /fivem helper (/fivem, /fivem reference, /fivem audit, /fivem learn, /fivem memory health, /fivem graph)?",
      default: true,
    });

    return {
      agents: [...new Set(selectedAgents)],
      skills: [...new Set(selectedSkills)],
      command: installCommand,
    };
  } catch (error) {
    if (error instanceof CancelPromptError) {
      return null;
    }
    throw error;
  }
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
  const src = path.join(PACKAGE_ROOT, COMMAND_TEMPLATE);
  if (!fs.existsSync(src)) {
    throw new Error(`Command template not found: ${COMMAND_TEMPLATE}`);
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

function removeLegacyCommand(targetRoot, agent) {
  if (agent.commandsDir && agent.commandMode === "file") {
    const legacyPath = path.join(targetRoot, agent.commandsDir, LEGACY_COMMAND_FILE);
    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath);
    }
  }

  const legacySkillRoots = [path.join(targetRoot, agent.skillsDir)];
  if (agent.altSkillsDir) {
    legacySkillRoots.push(path.join(targetRoot, agent.altSkillsDir));
  }

  for (const skillRoot of legacySkillRoots) {
    const legacySkillPath = path.join(skillRoot, LEGACY_COMMAND_SKILL);
    if (fs.existsSync(legacySkillPath)) {
      fs.rmSync(legacySkillPath, { recursive: true, force: true });
    }
  }
}

function installFivemTemplates(targetRoot, relativeDestDir) {
  const destDir = path.join(targetRoot, relativeDestDir);
  const removed = cleanLegacyFivemFiles(targetRoot, relativeDestDir);
  const templates = FIVEM_TEMPLATE_FILES.map((fileName) => [
    fileName.startsWith("reference.") ? REFERENCE_TEMPLATES_DIR : FIVEM_TEMPLATES_DIR,
    fileName,
  ]);
  const installed = [];

  for (const [srcDir, fileName] of templates) {
    const src = path.join(PACKAGE_ROOT, srcDir, fileName);
    if (!fs.existsSync(src)) {
      continue;
    }

    const dest = path.join(destDir, fileName);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (fileName === "knowledge-graph.html") {
      const agentKey = relativeDestDir.includes("gemini") ? "gemini" : "cursor";
      const fivemDir = relativeDestDir.replace(/\\/g, "/");
      const emptyGraph = JSON.stringify(
        {
          nodes: [],
          links: [],
          meta: {
            generatedAt: "",
            agent: agentKey,
            fivemDir,
            counts: { learned: 0, catalog: 0, links: 0, tokens: 0 },
          },
        },
        null,
        2,
      );
      const html = fs
        .readFileSync(src, "utf8")
        .replace("/*__GRAPH_DATA__*/", emptyGraph);
      fs.writeFileSync(dest, html, "utf8");
    } else {
      fs.copyFileSync(src, dest);
    }

    installed.push(path.relative(targetRoot, dest));
  }

  const memoryIndex = seedMemoryIndex(targetRoot, relativeDestDir);
  if (memoryIndex) {
    installed.push(memoryIndex);
  }

  return { installed, removed };
}

function seedMemoryIndex(targetRoot, relativeDestDir) {
  const memoryDir = path.join(targetRoot, relativeDestDir, "memory");
  const indexPath = path.join(memoryDir, "_index.md");

  if (fs.existsSync(indexPath)) {
    return null;
  }

  const templatePath = path.join(
    PACKAGE_ROOT,
    FIVEM_TEMPLATES_DIR,
    "memory-index.template.md",
  );

  if (!fs.existsSync(templatePath)) {
    return null;
  }

  fs.mkdirSync(memoryDir, { recursive: true });
  fs.copyFileSync(templatePath, indexPath);

  return path.relative(targetRoot, indexPath);
}

function cleanFivemTemplates(targetRoot, relativeDestDir) {
  removeFivemFiles(
    targetRoot,
    relativeDestDir,
    [...FIVEM_TEMPLATE_FILES, ...LEGACY_FIVEM_FILES],
  );

  // Never delete user-generated memory/*.md — only prune empty memory/ if no files left
  const memoryDir = path.join(targetRoot, relativeDestDir, "memory");
  if (fs.existsSync(memoryDir) && isDirEmpty(memoryDir)) {
    fs.rmdirSync(memoryDir);
  }

  pruneEmptyDirsUpward(path.join(targetRoot, relativeDestDir), targetRoot);
}

function installTomlCommands(targetRoot, agent) {
  const src = path.join(PACKAGE_ROOT, GEMINI_COMMANDS_DIR);
  const dest = path.join(targetRoot, agent.commandsDir);

  if (!fs.existsSync(src)) {
    throw new Error(`Gemini command templates not found: ${GEMINI_COMMANDS_DIR}`);
  }

  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });

  const installed = [];

  function collect(relativeDir) {
    const current = path.join(dest, relativeDir);
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const nextRelative = relativeDir
        ? path.join(relativeDir, entry.name)
        : entry.name;

      if (entry.isDirectory()) {
        collect(nextRelative);
        continue;
      }

      if (entry.name.endsWith(".toml")) {
        installed.push(
          path.join(agent.commandsDir, nextRelative).replace(/\\/g, "/"),
        );
      }
    }
  }

  collect("");
  return installed;
}

function installCommand(targetRoot, agent) {
  removeLegacyCommand(targetRoot, agent);

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

  if (agent.commandMode === "toml") {
    return installTomlCommands(targetRoot, agent);
  }

  const dest = path.join(targetRoot, agent.commandsDir, COMMAND_FILE);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(PACKAGE_ROOT, COMMAND_TEMPLATE), dest);

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

    console.log(
      `\nSelected: ${selections.agents.map((id) => AGENTS[id].label).join(", ")}`,
    );
    console.log(`Skills: ${selections.skills.join(", ")}`);
    console.log(`Helper /fivem: ${selections.command ? "yes" : "no"}\n`);
  } else {
    ensureNonInteractiveChoice(options);

    if (!options.agents) {
      options.agents = [...DEFAULT_AGENTS];
    }

    if (options.all) {
      options.skills = listAllSkills();
    }
  }

  const skills = options.skills;
  const agents = resolveAgents(options.agents);
  const managedSkills = getManagedSkillNames(skills, options.command);

  if (skills.length === 0) {
    console.error("Error: no skills selected.");
    process.exit(1);
  }

  cleanUnselectedAgents(
    options.target,
    agents.map((agent) => agent.id),
    managedSkills,
  );

  console.log(`\nInstalling to: ${options.target}`);
  console.log(
    `Agents: ${agents.map((agent) => agent.label).join(", ")}\n`,
  );

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

      if (agent.fivemTemplatesDir) {
        const refs = installFivemTemplates(options.target, agent.fivemTemplatesDir);
        for (const dest of refs.removed) {
          console.log(`  ✓ cleanup  → ${dest}`);
        }
        for (const dest of refs.installed) {
          console.log(`  ✓ template → ${dest}`);
        }
      }
    }

    console.log("");
  }

  console.log("Done.");
  console.log("Restart your agent IDE/CLI or open a new session.");
  console.log(`Update anytime: ${npxInstall("-y")}  (or after global: fivem-skill -y)`);
  console.log(
    "Cursor/Claude: /fivem  |  Codex: $fivem  |  Gemini: /fivem, /fivem:reference, /fivem:audit, /fivem:learn, /fivem:memory, /fivem:graph",
  );
  console.log("Gemini: run /commands reload after install.");
  console.log(
    "Run /fivem reference (or /fivem:reference) to generate reference.mdc at project root.",
  );
  console.log("Run /fivem audit [scope] for security/perf/pattern audit + fix plan.");
  console.log(
    "Run /fivem learn <topic> to scan the codebase and save compact English topic memory under <agent>/fivem/memory/.",
  );
  console.log(
    "Run /fivem memory health [fix] [topic] to verify memories vs codebase and optionally compact-rewrite stale topics.",
  );
  console.log(
    "Run /fivem graph to build a static 3D knowledge map and open it in the browser.",
  );
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
