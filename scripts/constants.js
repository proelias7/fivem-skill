/** Install command strings — single source for docs and error messages. */
const GITHUB_PKG = "github:proelias7/fivem-skill";
const INSTALL_BIN = "fivem-skill";
const GRAPH_BIN = "fivem-graph";

function npxInstall(extraArgs = "-y") {
  const args = extraArgs ? ` ${extraArgs}` : "";
  return `npx --yes ${GITHUB_PKG}${args}`;
}

function globalInstall() {
  return `npm install -g ${GITHUB_PKG}`;
}

function npxGraph(extraArgs = "") {
  const args = extraArgs ? ` ${extraArgs}` : "";
  return `npx --yes ${GITHUB_PKG} ${GRAPH_BIN}${args}`;
}

module.exports = {
  GITHUB_PKG,
  INSTALL_BIN,
  GRAPH_BIN,
  npxInstall,
  globalInstall,
  npxGraph,
};
