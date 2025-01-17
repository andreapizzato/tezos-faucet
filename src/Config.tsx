import { NetworkType } from "@airgap/beacon-sdk";
import configData from './config.json';
import { ConfigType } from "./lib/Types";

let Config: ConfigType = configData;

const networkKeys = Object.keys(NetworkType) as [keyof typeof NetworkType];

let configNetwork = Config.network.name;
if (!configNetwork || configNetwork.trim() === "") {
    throw new Error(`config.json is missing the network.name property. Please set network.name to one of: ${networkKeys.map(x => `"${NetworkType[x].toLowerCase()}"` ).join(", ")}`)
}

configNetwork = configNetwork.toLowerCase();

Config.network.networkType = undefined;
Config.application.isBeaconWallet = false;

const network = networkKeys.find(x => NetworkType[x].toLowerCase() === configNetwork);
if (!network) {
    throw new Error(`Unknown network.name "${Config.network.name}" in config.json. If you did not make any typos, please consider updating Tezos support NPM packages to get latest networks support:\n - @airgap/beacon-sdk\n - @taquito/...`)
}

Config.network.networkType = NetworkType[network];
Config.application.isBeaconWallet = (Config.network.networkType !== undefined);

export default Config;