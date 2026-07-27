// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Launchpad} from "../src/Launchpad.sol";
import {LaunchToken} from "../src/LaunchToken.sol";
import {UniV3Migrator} from "../src/UniV3Migrator.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface IUniV3FactoryView {
    function getPool(address, address, uint24) external view returns (address);
}

/// Fork test against the real Uniswap v3 deployment on Robinhood Chain.
/// Run explicitly with:
///   RUN_FORK=true forge test --match-contract UniV3MigratorFork -vv
contract UniV3MigratorForkTest is Test {
    address constant NPM = 0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3;
    address constant FACTORY = 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA;
    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;

    bool skipAll;
    Launchpad pad;
    UniV3Migrator mig;
    address treasury = makeAddr("treasury");
    address whale = makeAddr("whale");

    function setUp() public {
        if (!vm.envOr("RUN_FORK", false)) {
            skipAll = true;
            return;
        }
        vm.createSelectFork("https://rpc.mainnet.chain.robinhood.com");
        pad = new Launchpad(treasury);
        mig = new UniV3Migrator(address(pad), NPM, WETH);
        pad.setMigrator(address(mig));
        vm.deal(whale, 100 ether);
    }

    function test_fork_migrateCreatesLockedPool() public {
        if (skipAll) return;

        vm.startPrank(whale);
        address token = pad.createToken(
            "Fork Test", "FORK", 0,
            Launchpad.TokenMetadata("", "", "", "", "", "")
        );
        pad.buy{value: 50 ether}(token, 0); // crosses graduation, surplus refunded
        vm.stopPrank();

        (,,, uint256 sold, bool graduated,) = pad.curves(token);
        assertTrue(graduated);
        assertEq(sold, pad.CURVE_SUPPLY());

        // auto-migration ran inside the graduating buy
        // pool exists at the 1% tier and the position is locked in the migrator
        address pool = IUniV3FactoryView(FACTORY).getPool(token, WETH, 10_000);
        assertTrue(pool != address(0));
        assertGt(mig.positions(token), 0);

        // pool actually holds the liquidity
        assertGt(IERC20(token).balanceOf(pool), 0);
        assertGt(IERC20(WETH).balanceOf(pool), 3.9 ether);

        // launchpad kept nothing of the curve ETH for this token
        (,, uint256 realEthAfter,,,) = pad.curves(token);
        assertEq(realEthAfter, 0);
        vm.expectRevert(Launchpad.ZeroAmount.selector);
        pad.migrate(token); // nothing left for the manual path

        // collect works even with zero fees accrued
        mig.collectFees(token);
    }
}
