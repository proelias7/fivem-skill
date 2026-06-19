#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const http = require("http");
const { exec } = require("child_process");

const PACKAGE_ROOT = path.join(__dirname, "..");
const DATA_PLACEHOLDER = "/*__GRAPH_DATA__*/";
const LIVE_MODE_PLACEHOLDER = "/*__LIVE_MODE__*/";
const DEFAULT_PORT = 3939;

const AGENT_FIVEM_DIRS = {
  cursor: path.join(".cursor", "fivem"),
  gemini: path.join(".gemini", "fivem"),
};

function printHelp() {
  console.log(`
Build 3D knowledge graph from FiveM topic memories.

Usage (from FiveM project root — after fivem-skill install):
  node .cursor/fivem/build-knowledge-graph.js --target . --agent cursor
  node .gemini/fivem/build-knowledge-graph.js --target . --agent gemini

From fivem-skill repo:
  node scripts/build-knowledge-graph.js --target /path/to/fivem-project --agent cursor

Via npx (without local script copy):
  npx --package github:proelias7/fivem-skill fivem-graph --target . --agent cursor

Live mode (auto-refresh when memory/ changes — keep terminal open):
  node .cursor/fivem/build-knowledge-graph.js --target . --agent cursor --serve --open

Options:
  --target <dir>   Project root (default: current directory)
  --agent <name>   cursor | gemini (default: cursor)
  --serve          Start local server with live polling (recommended while learning)
  --open           Open default browser (--serve → http://127.0.0.1:PORT)
  --port <n>       Port for --serve (default: 3939)
  -h, --help       Show this help

Note: opening knowledge-graph.html via file:// is a static snapshot.
      Use --serve for real-time updates after /fivem learn.
`);
}

function parseArgs(argv) {
  const options = {
    target: process.cwd(),
    agent: "cursor",
    help: false,
    serve: false,
    open: false,
    port: DEFAULT_PORT,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "--target") {
      options.target = path.resolve(argv[i + 1] || "");
      i += 1;
      continue;
    }

    if (arg === "--agent") {
      options.agent = (argv[i + 1] || "cursor").trim().toLowerCase();
      i += 1;
      continue;
    }

    if (arg === "--serve") {
      options.serve = true;
      continue;
    }

    if (arg === "--open") {
      options.open = true;
      continue;
    }

    if (arg === "--port") {
      options.port = Number(argv[i + 1]) || DEFAULT_PORT;
      i += 1;
    }
  }

  return options;
}

function openBrowser(url) {
  const platform = process.platform;
  let command;

  if (platform === "win32") {
    command = `start "" "${url}"`;
  } else if (platform === "darwin") {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`Could not open browser automatically. Open manually: ${url}`);
    }
  });
}

function toFileUrl(filePath) {
  const resolved = path.resolve(filePath).replace(/\\/g, "/");
  return `file:///${resolved.startsWith("/") ? resolved.slice(1) : resolved}`;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const meta = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (kv) {
      meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  return meta;
}

function parseIndexTable(content) {
  const rows = new Map();
  const lines = content.split("\n");

  for (const line of lines) {
    if (!line.trim().startsWith("|")) {
      continue;
    }

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length < 2 || cells[0] === "Tópico" || cells[0].startsWith("---")) {
      continue;
    }

    if (cells[0].startsWith("_") || cells[0] === "—" || cells[0] === "-") {
      continue;
    }

    rows.set(cells[0].toLowerCase(), {
      topic: cells[0],
      file: cells[1] || "",
      triggers: cells[2] || "",
      updated: cells[3] || "",
    });
  }

  return rows;
}

function parseCatalogTable(content) {
  const rows = [];

  for (const line of content.split("\n")) {
    if (!line.trim().startsWith("|")) {
      continue;
    }

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length < 3 || cells[0] === "Tópico" || cells[0].startsWith("---")) {
      continue;
    }

    const slugMatch = cells[0].match(/`([^`]+)`/);
    if (!slugMatch) {
      continue;
    }

    rows.push({
      slug: slugMatch[1].toLowerCase(),
      label: slugMatch[1],
      triggers: cells[1] || "",
      searchHints: cells[2] || "",
    });
  }

  return rows;
}

function extractBacktickPaths(content) {
  const paths = new Set();
  const regex = /`([^`\n]+)`/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const value = match[1].trim();
    if (
      value.includes("/") ||
      value.includes("\\") ||
      value.endsWith(".lua") ||
      value.endsWith(".md") ||
      value.includes("config.")
    ) {
      paths.add(value.toLowerCase());
    }
  }

  return paths;
}

function tokenizeHints(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((token) => token.length >= 4);
}

function inferLinks(nodes) {
  const links = [];
  const seen = new Set();
  const learned = nodes.filter((node) => node.group === "learned");
  const catalog = nodes.filter((node) => node.group === "catalog");

  function addLink(source, target, type) {
    if (source === target) {
      return;
    }

    const key = [source, target].sort().join("::") + `::${type}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    links.push({ source, target, type });
  }

  for (let i = 0; i < learned.length; i += 1) {
    for (let j = i + 1; j < learned.length; j += 1) {
      const a = learned[i];
      const b = learned[j];

      for (const shared of a.paths) {
        if (b.paths.has(shared)) {
          addLink(a.id, b.id, "shared-path");
          break;
        }
      }

      const mentionRegex = new RegExp(`\\b${b.id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
      if (mentionRegex.test(a.content)) {
        addLink(a.id, b.id, "cross-mention");
      }

      const reverseRegex = new RegExp(`\\b${a.id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
      if (reverseRegex.test(b.content)) {
        addLink(a.id, b.id, "cross-mention");
      }
    }
  }

  for (const orphan of catalog) {
    const orphanTokens = new Set([
      ...tokenizeHints(orphan.triggers),
      ...tokenizeHints(orphan.searchHints),
    ]);

    for (const learnedNode of learned) {
      const learnedTokens = new Set([
        ...tokenizeHints(learnedNode.triggers),
        ...tokenizeHints(learnedNode.content),
        ...Array.from(learnedNode.paths).flatMap((p) => tokenizeHints(p)),
      ]);

      for (const token of orphanTokens) {
        if (learnedTokens.has(token)) {
          addLink(orphan.id, learnedNode.id, "catalog-hint");
          break;
        }
      }
    }
  }

  return links;
}

function buildGraphSignature(nodes, links) {
  const nodePart = nodes
    .map((node) => `${node.id}:${node.updated || ""}:${node.group}`)
    .sort()
    .join("|");
  return `${nodes.length}:${links.length}:${nodePart}`;
}

function buildGraphData(targetRoot, agentId) {
  const relativeDir = AGENT_FIVEM_DIRS[agentId];
  if (!relativeDir) {
    throw new Error(`Unknown agent: ${agentId}. Valid: ${Object.keys(AGENT_FIVEM_DIRS).join(", ")}`);
  }

  const fivemDir = path.join(targetRoot, relativeDir);
  const memoryDir = path.join(fivemDir, "memory");
  const indexPath = path.join(memoryDir, "_index.md");
  const catalogPath = path.join(fivemDir, "topic-catalog.md");

  const indexRows = fs.existsSync(indexPath)
    ? parseIndexTable(fs.readFileSync(indexPath, "utf8"))
    : new Map();

  const catalogRows = fs.existsSync(catalogPath)
    ? parseCatalogTable(fs.readFileSync(catalogPath, "utf8"))
    : [];

  const nodes = [];
  const learnedSlugs = new Set();

  if (fs.existsSync(memoryDir)) {
    for (const entry of fs.readdirSync(memoryDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "_index.md") {
        continue;
      }

      const slug = entry.name.replace(/\.md$/, "").toLowerCase();
      learnedSlugs.add(slug);

      const filePath = path.join(memoryDir, entry.name);
      const content = fs.readFileSync(filePath, "utf8");
      const meta = parseFrontmatter(content);
      const indexMeta = indexRows.get(slug) || {};

      nodes.push({
        id: slug,
        name: meta.topic || indexMeta.topic || slug,
        group: "learned",
        file: path.relative(targetRoot, filePath).replace(/\\/g, "/"),
        updated: meta.updated || indexMeta.updated || "",
        framework: meta.framework || "",
        triggers: indexMeta.triggers || "",
        paths: extractBacktickPaths(content),
        searchHints: "",
        rawContent: content,
      });
    }
  }

  for (const row of catalogRows) {
    if (learnedSlugs.has(row.slug)) {
      continue;
    }

    nodes.push({
      id: row.slug,
      name: row.label,
      group: "catalog",
      file: "",
      updated: "",
      framework: "",
      triggers: row.triggers,
      searchHints: row.searchHints,
      paths: extractBacktickPaths(row.searchHints),
      rawContent: `${row.triggers} ${row.searchHints}`,
    });
  }

  const links = inferLinks(
    nodes.map((node) => ({
      ...node,
      paths: node.paths instanceof Set ? node.paths : new Set(node.paths || []),
      content:
        (node.rawContent || "") +
        " " +
        (node.triggers || "") +
        " " +
        (node.searchHints || ""),
    })),
  );

  for (const node of nodes) {
    node.paths = Array.from(node.paths instanceof Set ? node.paths : node.paths || []);
    delete node.rawContent;
  }

  return {
    nodes,
    links,
    meta: {
      generatedAt: new Date().toISOString(),
      signature: buildGraphSignature(nodes, links),
      agent: agentId,
      fivemDir: relativeDir.replace(/\\/g, "/"),
      counts: {
        learned: nodes.filter((node) => node.group === "learned").length,
        catalog: nodes.filter((node) => node.group === "catalog").length,
        links: links.length,
      },
    },
  };
}

function resolveTemplatePath(fivemDir) {
  const candidates = [
    path.join(fivemDir, "knowledge-graph.template.html"),
    path.join(__dirname, "knowledge-graph.template.html"),
    path.join(PACKAGE_ROOT, "templates", "fivem", "knowledge-graph.template.html"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Template knowledge-graph.template.html not found. Re-run: npx github:proelias7/fivem-skill --cursor -y",
  );
}

function buildHtml(graphData, fivemDir, liveMode = false) {
  const templatePath = resolveTemplatePath(fivemDir);
  const template = fs.readFileSync(templatePath, "utf8");
  const json = JSON.stringify(graphData, null, 2);

  if (!template.includes(DATA_PLACEHOLDER)) {
    throw new Error(`Template missing placeholder: ${DATA_PLACEHOLDER}`);
  }

  if (!template.includes(LIVE_MODE_PLACEHOLDER)) {
    throw new Error(`Template missing placeholder: ${LIVE_MODE_PLACEHOLDER}`);
  }

  return template
    .replace(DATA_PLACEHOLDER, json)
    .replace(LIVE_MODE_PLACEHOLDER, liveMode ? "true" : "false");
}

function writeStaticGraph(options, fivemDir) {
  const graphData = buildGraphData(options.target, options.agent);
  const html = buildHtml(graphData, fivemDir, false);
  const outputPath = path.join(fivemDir, "knowledge-graph.html");

  fs.writeFileSync(outputPath, html, "utf8");

  const relOutput = path.relative(options.target, outputPath).replace(/\\/g, "/");
  console.log(`Knowledge graph written: ${relOutput}`);
  console.log(
    `  learned: ${graphData.meta.counts.learned} | catalog orphans: ${graphData.meta.counts.catalog} | links: ${graphData.meta.counts.links}`,
  );
  console.log(`Open snapshot: file://${outputPath.replace(/\\/g, "/")}`);
  console.log(
    "For live updates: add --serve --open and keep the terminal running.",
  );

  if (options.open) {
    openBrowser(toFileUrl(outputPath));
  }
}

function startLiveServer(options, fivemDir) {
  const memoryDir = path.join(fivemDir, "memory");
  let lastSignature = "";

  function currentSignature() {
    const parts = [];
    const files = [
      path.join(fivemDir, "topic-catalog.md"),
      path.join(memoryDir, "_index.md"),
    ];

    if (fs.existsSync(memoryDir)) {
      for (const name of fs.readdirSync(memoryDir).sort()) {
        if (name.endsWith(".md")) {
          files.push(path.join(memoryDir, name));
        }
      }
    }

    for (const filePath of files) {
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const stat = fs.statSync(filePath);
      parts.push(`${filePath}:${stat.mtimeMs}`);
    }

    return parts.join("|");
  }

  function logChange(label) {
    const data = buildGraphData(options.target, options.agent);
    console.log(
      `[${new Date().toLocaleTimeString()}] ${label} → learned: ${data.meta.counts.learned}, orphans: ${data.meta.counts.catalog}, links: ${data.meta.counts.links}`,
    );
    lastSignature = currentSignature();
  }

  const server = http.createServer((req, res) => {
    const url = (req.url || "/").split("?")[0];

    if (url === "/api/graph") {
      const data = buildGraphData(options.target, options.agent);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
      return;
    }

    if (url === "/" || url === "/index.html") {
      const data = buildGraphData(options.target, options.agent);
      const html = buildHtml(data, fivemDir, true);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(html);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });

  server.listen(options.port, "127.0.0.1", () => {
    lastSignature = currentSignature();
    const data = buildGraphData(options.target, options.agent);
    const liveUrl = `http://127.0.0.1:${options.port}`;
    console.log(`Live graph server: ${liveUrl}`);
    console.log(
      `  learned: ${data.meta.counts.learned} | catalog orphans: ${data.meta.counts.catalog} | links: ${data.meta.counts.links}`,
    );
    console.log("Polling every 3s — new /fivem learn topics appear automatically.");
    console.log("Press Ctrl+C to stop.");

    if (options.open) {
      setTimeout(() => openBrowser(liveUrl), 300);
    }
  });

  const watchTargets = [fivemDir];
  if (fs.existsSync(memoryDir)) {
    watchTargets.push(memoryDir);
  }

  for (const watchPath of watchTargets) {
    fs.watch(watchPath, { recursive: true }, (_event, filename) => {
      if (!filename) {
        return;
      }

      const normalized = filename.replace(/\\/g, "/");
      const relevant =
        normalized.includes("memory/") ||
        normalized.endsWith("topic-catalog.md") ||
        normalized.endsWith("_index.md") ||
        normalized.endsWith(".md");

      if (!relevant) {
        return;
      }

      const signature = currentSignature();
      if (signature !== lastSignature) {
        logChange(`updated (${normalized})`);
      }
    });
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!fs.existsSync(options.target)) {
    console.error(`Error: target directory does not exist: ${options.target}`);
    process.exit(1);
  }

  const relativeDir = AGENT_FIVEM_DIRS[options.agent];
  if (!relativeDir) {
    console.error(
      `Error: unknown agent "${options.agent}". Valid: ${Object.keys(AGENT_FIVEM_DIRS).join(", ")}`,
    );
    process.exit(1);
  }

  const fivemDir = path.join(options.target, relativeDir);
  if (!fs.existsSync(fivemDir)) {
    console.error(
      `Error: ${relativeDir} not found. Run fivem-skill installer first:\n` +
        "  npx github:proelias7/fivem-skill --cursor -y",
    );
    process.exit(1);
  }

  if (options.open && !options.serve) {
    options.serve = true;
  }

  if (options.serve) {
    startLiveServer(options, fivemDir);
    return;
  }

  writeStaticGraph(options, fivemDir);
}

main();
