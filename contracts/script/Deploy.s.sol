// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Launchpad} from "../src/Launchpad.sol";

/// Deploys the Launchpad. The treasury defaults to the deployer; the DEX
/// migrator is left unset (set it with setMigrator once a DEX adapter for the
/// target chain exists).
contract Deploy is Script {
    function run() external {
        address treasury = vm.envOr("TREASURY", msg.sender);

        vm.startBroadcast();
        Launchpad pad = new Launchpad(treasury);
        vm.stopBroadcast();

        console.log("Launchpad deployed at:", address(pad));
        console.log("Treasury:", treasury);
    }
}
