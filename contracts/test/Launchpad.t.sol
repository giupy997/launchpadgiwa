// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Launchpad} from "../src/Launchpad.sol";
import {LaunchToken} from "../src/LaunchToken.sol";
import {IDexMigrator} from "../src/interfaces/IDexMigrator.sol";

contract MockMigrator is IDexMigrator {
    address public lastToken;
    uint256 public lastTokenAmount;
    uint256 public lastEthAmount;

    function migrate(address token, uint256 tokenAmount) external payable {
        lastToken = token;
        lastTokenAmount = tokenAmount;
        lastEthAmount = msg.value;
    }
}

contract LaunchpadTest is Test {
    Launchpad pad;
    MockMigrator migrator;
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        pad = new Launchpad(treasury);
        migrator = new MockMigrator();
        pad.setMigrator(address(migrator));
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function _meta() internal pure returns (Launchpad.TokenMetadata memory) {
        return Launchpad.TokenMetadata({
            logoURI: "https://example.com/logo.png",
            website: "https://example.com",
            twitter: "https://x.com/test",
            telegram: "https://t.me/test"
        });
    }

    function _create() internal returns (address) {
        vm.prank(alice);
        return pad.createToken("Test Coin", "TEST", 0, _meta());
    }

    // ------------------------------------------------------------- creation

    function test_createToken() public {
        address token = _create();
        assertEq(pad.tokenCount(), 1);
        assertEq(LaunchToken(token).balanceOf(address(pad)), pad.TOTAL_SUPPLY());
        assertEq(LaunchToken(token).name(), "Test Coin");
    }

    function test_createWithInitialBuy() public {
        vm.prank(alice);
        address token = pad.createToken{value: 0.1 ether}("Test", "TST", 0, _meta());
        assertGt(LaunchToken(token).balanceOf(alice), 0);
    }

    function test_metadataStoredOnCreate() public {
        address token = _create();
        (string memory logo, string memory site,, string memory tg) = pad.tokenMetadata(token);
        assertEq(logo, "https://example.com/logo.png");
        assertEq(site, "https://example.com");
        assertEq(tg, "https://t.me/test");
    }

    function test_creatorCanUpdateMetadata() public {
        address token = _create();
        Launchpad.TokenMetadata memory m = _meta();
        m.logoURI = "ipfs://newlogo";
        vm.prank(alice);
        pad.updateMetadata(token, m);
        (string memory logo,,,) = pad.tokenMetadata(token);
        assertEq(logo, "ipfs://newlogo");
    }

    function test_nonCreatorCannotUpdateMetadata() public {
        address token = _create();
        vm.prank(bob);
        vm.expectRevert(Launchpad.NotCreator.selector);
        pad.updateMetadata(token, _meta());
    }

    // ------------------------------------------------------------- buying

    function test_buyTransfersTokensAndFee() public {
        address token = _create();
        uint256 quoted = pad.quoteBuy(token, 1 ether);

        vm.prank(bob);
        pad.buy{value: 1 ether}(token, quoted);

        assertEq(LaunchToken(token).balanceOf(bob), quoted);
        assertEq(treasury.balance, 0.01 ether); // 1% fee
        (,, uint256 realEth,,,) = pad.curves(token);
        assertEq(realEth, 0.99 ether);
    }

    function test_priceIncreasesWithBuys() public {
        address token = _create();
        uint256 p0 = pad.currentPrice(token);
        vm.prank(bob);
        pad.buy{value: 1 ether}(token, 0);
        uint256 p1 = pad.currentPrice(token);
        assertGt(p1, p0);
    }

    function test_buySlippageReverts() public {
        address token = _create();
        uint256 quoted = pad.quoteBuy(token, 1 ether);
        vm.prank(bob);
        vm.expectRevert(Launchpad.Slippage.selector);
        pad.buy{value: 1 ether}(token, quoted + 1);
    }

    // ------------------------------------------------------------- selling

    function test_sellRoundTrip() public {
        address token = _create();
        vm.startPrank(bob);
        pad.buy{value: 1 ether}(token, 0);
        uint256 bal = LaunchToken(token).balanceOf(bob);
        uint256 ethBefore = bob.balance;

        LaunchToken(token).approve(address(pad), bal);
        pad.sell(token, bal, 0);
        vm.stopPrank();

        assertEq(LaunchToken(token).balanceOf(bob), 0);
        uint256 got = bob.balance - ethBefore;
        // Round trip returns slightly less than 0.99 ETH * 0.99 (two 1% fees).
        assertGt(got, 0.97 ether);
        assertLt(got, 1 ether);
    }

    function test_curveStateResetsAfterFullSell() public {
        address token = _create();
        vm.startPrank(bob);
        pad.buy{value: 1 ether}(token, 0);
        uint256 bal = LaunchToken(token).balanceOf(bob);
        LaunchToken(token).approve(address(pad), bal);
        pad.sell(token, bal, 0);
        vm.stopPrank();

        (,, uint256 realEth, uint256 sold,,) = pad.curves(token);
        assertEq(sold, 0);
        // realEth keeps only rounding dust
        assertLt(realEth, 1e6);
    }

    // ------------------------------------------------------------- transfers

    function test_transfersBlockedBeforeGraduation() public {
        address token = _create();
        vm.startPrank(bob);
        pad.buy{value: 1 ether}(token, 0);
        vm.expectRevert(LaunchToken.NotGraduated.selector);
        LaunchToken(token).transfer(alice, 1e18);
        vm.stopPrank();
    }

    // ------------------------------------------------------------- graduation

    function _graduate(address token) internal {
        // Way more ETH than the curve needs; the surplus must be refunded.
        vm.prank(bob);
        pad.buy{value: 50 ether}(token, 0);
    }

    function test_graduationOnCurveSellout() public {
        address token = _create();
        _graduate(token);

        (,,, uint256 sold, bool graduated,) = pad.curves(token);
        assertTrue(graduated);
        assertEq(sold, pad.CURVE_SUPPLY());
        assertTrue(LaunchToken(token).graduated());
        // Bob paid only what the curve needed (~4 ETH + fee), rest refunded.
        assertGt(bob.balance, 45 ether);
    }

    function test_noTradingAfterGraduation() public {
        address token = _create();
        _graduate(token);

        vm.prank(alice);
        vm.expectRevert(Launchpad.AlreadyGraduated.selector);
        pad.buy{value: 1 ether}(token, 0);
    }

    function test_transfersFreeAfterGraduation() public {
        address token = _create();
        _graduate(token);
        vm.prank(bob);
        LaunchToken(token).transfer(alice, 1e18);
        assertEq(LaunchToken(token).balanceOf(alice), 1e18);
    }

    // ------------------------------------------------------------- migration

    function test_migrateSendsReserveAndEth() public {
        address token = _create();
        _graduate(token);
        (,, uint256 raised,,,) = pad.curves(token);

        pad.migrate(token);

        assertEq(migrator.lastToken(), token);
        assertEq(migrator.lastTokenAmount(), pad.DEX_RESERVE());
        assertEq(migrator.lastEthAmount(), raised);
        assertEq(LaunchToken(token).balanceOf(address(migrator)), pad.DEX_RESERVE());
    }

    function test_migrateRevertsBeforeGraduation() public {
        address token = _create();
        vm.expectRevert(Launchpad.NotYetGraduated.selector);
        pad.migrate(token);
    }

    function test_migrateOnlyOnce() public {
        address token = _create();
        _graduate(token);
        pad.migrate(token);
        vm.expectRevert(Launchpad.ZeroAmount.selector);
        pad.migrate(token);
    }

    // ------------------------------------------------------------- admin

    function test_feeCapEnforced() public {
        vm.expectRevert(Launchpad.FeeTooHigh.selector);
        pad.setFeeBps(501);
    }

    function test_onlyOwnerSetsFee() public {
        vm.prank(alice);
        vm.expectRevert();
        pad.setFeeBps(200);
    }

    // ------------------------------------------------------------- fuzz

    function testFuzz_buySellNeverProfits(uint96 ethIn) public {
        ethIn = uint96(bound(ethIn, 0.001 ether, 3 ether));
        address token = _create();

        vm.startPrank(bob);
        uint256 before = bob.balance;
        pad.buy{value: ethIn}(token, 0);
        uint256 bal = LaunchToken(token).balanceOf(bob);
        LaunchToken(token).approve(address(pad), bal);
        pad.sell(token, bal, 0);
        vm.stopPrank();

        assertLe(bob.balance, before); // fees make round trips strictly lossy
    }
}
