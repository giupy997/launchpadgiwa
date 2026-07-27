// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {UniV3Migrator} from "../src/UniV3Migrator.sol";

/// Deploys the Uniswap v3 graduation migrator for Robinhood Chain.
/// Requires LAUNCHPAD env var. After deploying, wire it with:
///   cast send <launchpad> "setMigrator(address)" <migrator>
contract DeployMigrator is Script {
    address constant NPM = 0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3;
    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;

    function run() external {
        address launchpad = vm.envAddress("LAUNCHPAD");
        vm.startBroadcast();
        UniV3Migrator mig = new UniV3Migrator(launchpad, NPM, WETH);
        vm.stopBroadcast();
        console.log("UniV3Migrator deployed at:", address(mig));
        console.log("Now run: cast send", launchpad, "'setMigrator(address)'", address(mig));
    }
}
