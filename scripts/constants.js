/** Install command strings — single source for docs and error messages. */
const GITHUB_PKG = "github:proelias7/fivem-skill";
const INSTALL_BIN = "fivem-skill";

function npxInstall(extraArgs = "-y") {
  const args = extraArgs ? ` ${extraArgs}` : "";
  return `npx --yes ${GITHUB_PKG}${args}`;
}

function globalInstall() {
  return `npm install -g ${GITHUB_PKG}`;
}

module.exports = {
  GITHUB_PKG,
  INSTALL_BIN,
  npxInstall,
  globalInstall,
};
