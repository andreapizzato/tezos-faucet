const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process')
const chalk = require('chalk');
const { NetworkType } = require("@airgap/beacon-sdk");

console.log(chalk.cyan("Validating src/config.json file...\n"));

function err(msg) {
  console.log(chalk.bold.red(msg));

  process.exit(1);
}

function warn(msg) {
  console.log(chalk.yellow(msg));
}

function isVersionStable(version) {
  return version.indexOf("rc") === -1 && version.indexOf("beta") === -1;
}

function checkForNPMPackageUpdate(_package) {
  let installed = undefined;

  const npmls = execSync(`npm list ${_package} --depth=0`).toLocaleString();
  const pkgVersionPrefix = `${_package}@`;
  const packageIndex = npmls.indexOf(pkgVersionPrefix);
  if (packageIndex > -1) {
    installed = npmls.substring(packageIndex + pkgVersionPrefix.length).trim();
  }
  
  const available = JSON.parse(execSync(`npm show ${_package} versions`).toLocaleString().replace(/'/g, "\""));
  let latestVersion = available[available.length - 1];

  const stableVersions = available.filter(x => isVersionStable(x));
  if (stableVersions && stableVersions.length > 0) {
    latestVersion = stableVersions[stableVersions.length - 1];
  }

  return {
    installed,
    latestVersion,
  }
}

function versionLtThan(version, than) {
  if (version === than) {
    return false;
  }

  if (!isVersionStable(version) || !isVersionStable(than)) {
    return null;
  }

  const versionComponents = version.split(".");
  const thanComponents = than.split(".");

  let versionComponent, thanComponent = 0;
  for (let i=0; i<versionComponents.length; i++) {
    versionComponent = parseInt(versionComponents[i], 10);
    thanComponent = parseInt(thanComponents[i], 10);
    
    if (isNaN(versionComponent) || isNaN(thanComponent)) {
      return null;
    }

    if (versionComponent < thanComponent) {
      return true;
    } else if (versionComponent > thanComponent) {
      return false;
    } // else if (versionComponanent === thanComponent) { continue; }
  }

  return false;
}

function suggestEventualPackageUpdate(_package) {
  const pkg = checkForNPMPackageUpdate(_package);

  const needsUpdate = versionLtThan(pkg.installed, pkg.latestVersion);
  if (needsUpdate === false) {
    return false;
  } else if (needsUpdate === null) {
    warn(`This script cannot determine if you have an update of ${_package} because either the installed or the latest version are betas. Please check for the update manually. Installed version: ${pkg.installed} - Latest version: ${pkg.latestVersion}`);
    return true;
  } else if (needsUpdate) {
    warn(`There is an update for ${_package}. Please update to get support for the latest Tezos networks. Installed version: ${pkg.installed} - Latest version: ${pkg.latestVersion}`);
    return true;
  }

  return false;
}

const CONFIG_FILE = path.resolve(__dirname, '../src/config.json');

if (!fs.existsSync(CONFIG_FILE)) {
  err("Unable to find src/config.json");
}

const Config = JSON.parse(fs.readFileSync(CONFIG_FILE).toString());
if (!Config) {
  err("src/config.json file is empty");
}

const networkKeys = Object.keys(NetworkType);

const configNetwork = Config.network.name.toLowerCase();
if (!configNetwork || configNetwork.trim() === "") {
    err(`config.json is missing the network.name property. Please set network.name to one of: ${networkKeys.map(x => `"${NetworkType[x].toLowerCase()}"` ).join(", ")}`)
}

Config.network.networkType = undefined;

const network = networkKeys.find(x => NetworkType[x].toLowerCase() === configNetwork);
if (network) { // Happy path: config verified with success
    console.log(chalk.green("Configuration is valid."));
    process.exit(0);
}

// Check for newer versions?
console.log(chalk.bold.red(`Unknown network.name "${Config.network.name}" specified in config.json.`));

const airgapUpdate = suggestEventualPackageUpdate("@airgap/beacon-sdk");
const taquitoUpdate = suggestEventualPackageUpdate("@taquito/taquito");

if (!airgapUpdate && !taquitoUpdate) {
  err(`There seems to be no updates for the Tezos network support NPM packages.\n\nPlease double check your entry, valid values are: ${networkKeys.map(x => `"${NetworkType[x].toLowerCase()}"` ).join(", ")}`);
}

process.exit(1);