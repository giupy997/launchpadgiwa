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
            telegram: "https://t.me/test",
            livestream: ""
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
        (string memory logo, string memory site,, string memory tg,) = pad.tokenMetadata(token);
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
        (string memory logo,,,,) = pad.tokenMetadata(token);
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
        // 1% fee: 60% accrues to the creator (alice), 40% to treasury
        assertEq(treasury.balance, 0.004 ether);
        assertEq(pad.creatorFees(alice), 0.006 ether);
        (,, uint256 realEth,,,) = pad.curves(token);
        assertEq(realEth, 0.99 ether);
    }

    function test_creatorFeeAccruesOnSellToo() public {
        address token = _create();
        vm.startPrank(bob);
        pad.buy{value: 1 ether}(token, 0);
        uint256 bal = LaunchToken(token).balanceOf(bob);
        LaunchToken(token).approve(address(pad), bal);
        pad.sell(token, bal, 0);
        vm.stopPrank();
        // fees from both legs accrued to alice, none lost
        assertGt(pad.creatorFees(alice), 0.006 ether); // buy fee + sell fee
    }

    function test_claimCreatorFees() public {
        address token = _create();
        vm.prank(bob);
        pad.buy{value: 1 ether}(token, 0);

        uint256 accrued = pad.creatorFees(alice);
        uint256 before = alice.balance;
        vm.prank(alice);
        pad.claimCreatorFees();

        assertEq(alice.balance - before, accrued);
        assertEq(pad.creatorFees(alice), 0);
    }

    function test_claimRevertsWhenNothingAccrued() public {
        vm.prank(bob);
        vm.expectRevert(Launchpad.ZeroAmount.selector);
        pad.claimCreatorFees();
    }

    function test_feeRedirectAccruesToRecipient() public {
        address token = _create();
        address vault = makeAddr("vault");
        vm.prank(alice);
        pad.setFeeRecipient(token, vault);

        vm.prank(bob);
        pad.buy{value: 1 ether}(token, 0);

        assertEq(pad.creatorFees(vault), 0.006 ether);
        assertEq(pad.creatorFees(alice), 0);

        // vault can claim
        uint256 before = vault.balance;
        vm.prank(vault);
        pad.claimCreatorFees();
        assertEq(vault.balance - before, 0.006 ether);
    }

    function test_feeRedirectResetToCreator() public {
        address token = _create();
        address vault = makeAddr("vault");
        vm.startPrank(alice);
        pad.setFeeRecipient(token, vault);
        pad.setFeeRecipient(token, address(0));
        vm.stopPrank();

        vm.prank(bob);
        pad.buy{value: 1 ether}(token, 0);
        assertEq(pad.creatorFees(alice), 0.006 ether);
    }

    function test_onlyCreatorSetsFeeRecipient() public {
        address token = _create();
        vm.prank(bob);
        vm.expectRevert(Launchpad.NotCreator.selector);
        pad.setFeeRecipient(token, bob);
    }

    function test_livestreamStoredInMetadata() public {
        address token = _create();
        Launchpad.TokenMetadata memory m = _meta();
        m.livestream = "https://youtube.com/live/abc";
        vm.prank(alice);
        pad.updateMetadata(token, m);
        (,,,, string memory live) = pad.tokenMetadata(token);
        assertEq(live, "https://youtube.com/live/abc");
    }

    function test_creatorFeeShareCapAndOwner() public {
        vm.expectRevert(Launchpad.FeeTooHigh.selector);
        pad.setCreatorFeeShareBps(10_001);
        pad.setCreatorFeeShareBps(5_000);
        assertEq(pad.creatorFeeShareBps(), 5_000);
        vm.prank(alice);
        vm.expectRevert();
        pad.setCreatorFeeShareBps(1_000);
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

    /// Regression: buys that cross graduation must never revert on the
    /// refund math, whatever the rounding of the fee gross-up.
    function testFuzz_graduatingBuyNeverReverts(uint96 extra) public {
        extra = uint96(bound(extra, 0, 2 ether));
        address token = _create();

        // bring the curve close to graduation
        vm.prank(bob);
        pad.buy{value: 4 ether}(token, 0);
        (,,, uint256 sold, bool grad,) = pad.curves(token);
        if (!grad) {
            // ETH needed to finish the curve, then cross it with a fuzzed surplus
            uint256 remaining = pad.CURVE_SUPPLY() - sold;
            (uint256 vEth, uint256 vToken,,,,) = pad.curves(token);
            uint256 ethNeeded = (vEth * vToken) / (vToken - remaining) - vEth + 1;
            uint256 gross = (ethNeeded * 10_000) / 9_900 + uint256(extra);
            vm.deal(bob, gross);
            vm.prank(bob);
            pad.buy{value: gross}(token, 0);
        }
        (,,,, grad,) = pad.curves(token);
        assertTrue(grad);
    }

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
