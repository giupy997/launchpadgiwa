// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {LaunchToken} from "./LaunchToken.sol";
import {IDexMigrator} from "./interfaces/IDexMigrator.sol";

/// @title Launchpad
/// @notice pump.fun-style launchpad: anyone creates a token, the full supply is
///         held by this contract and sold along a constant-product bonding
///         curve with virtual reserves. When the curve sells out, the token
///         "graduates": trading on the curve stops and the reserved supply plus
///         the raised ETH migrate to a DEX via a pluggable adapter.
///
///         Curve math (virtual reserves x = ETH, y = tokens, k = x * y):
///           buy:  tokensOut = y - k / (x + ethIn)
///           sell: ethOut    = x - k / (y + tokensIn)
contract Launchpad is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------- config

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e18; // 1B per token
    uint256 public constant CURVE_SUPPLY = 800_000_000e18; //   800M sold on curve
    uint256 public constant DEX_RESERVE = TOTAL_SUPPLY - CURVE_SUPPLY; // 200M for DEX

    /// virtual reserves at curve start; they set the initial price and the
    /// total ETH the curve raises (~ VIRTUAL_ETH * CURVE_SUPPLY / VIRTUAL_TOKEN
    /// at completion). With 1.25 ETH / 1.05B tokens the curve raises ~4 ETH.
    uint256 public constant VIRTUAL_ETH = 1.25 ether;
    uint256 public constant VIRTUAL_TOKEN = 1_050_000_000e18;

    uint256 public constant FEE_DENOMINATOR = 10_000;
    uint256 public feeBps = 100; // 1% on buys and sells
    /// Share of each fee that accrues to the token's creator (60%); the rest
    /// goes to the treasury. Creators withdraw with claimCreatorFees()
    /// (pull-based, so a misbehaving creator address can never block trades).
    uint256 public creatorFeeShareBps = 6_000;
    address public treasury;
    IDexMigrator public migrator;

    mapping(address creator => uint256) public creatorFees;

    // ---------------------------------------------------------------- state

    struct Curve {
        uint256 vEth; //     virtual ETH reserve
        uint256 vToken; //   virtual token reserve
        uint256 realEth; //  ETH actually held for this curve
        uint256 sold; //     tokens sold so far
        bool graduated;
        address creator;
    }

    /// Off-chain presentation data, stored on-chain so the frontend needs no
    /// indexer. logoURI should point to a square (1:1) image.
    struct TokenMetadata {
        string logoURI;
        string website;
        string twitter;
        string telegram;
    }

    mapping(address token => Curve) public curves;
    mapping(address token => TokenMetadata) public tokenMetadata;
    address[] public allTokens;

    // ---------------------------------------------------------------- events

    event TokenCreated(address indexed token, address indexed creator, string name, string symbol);
    event MetadataUpdated(address indexed token, string logoURI, string website, string twitter, string telegram);
    event Bought(address indexed token, address indexed buyer, uint256 ethIn, uint256 tokensOut, uint256 fee);
    event Sold(address indexed token, address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 fee);
    event Graduated(address indexed token, uint256 raisedEth);
    event Migrated(address indexed token, uint256 tokenAmount, uint256 ethAmount);
    event FeeUpdated(uint256 feeBps);
    event CreatorFeeShareUpdated(uint256 creatorFeeShareBps);
    event CreatorFeesClaimed(address indexed creator, uint256 amount);
    event TreasuryUpdated(address treasury);
    event MigratorUpdated(address migrator);

    // ---------------------------------------------------------------- errors

    error UnknownToken();
    error NotCreator();
    error AlreadyGraduated();
    error NotYetGraduated();
    error ZeroAmount();
    error Slippage();
    error FeeTooHigh();
    error MigratorNotSet();
    error EthTransferFailed();

    constructor(address treasury_) Ownable(msg.sender) {
        treasury = treasury_;
    }

    // ---------------------------------------------------------------- create

    /// @notice Deploy a new token and open its curve. Sending ETH performs an
    ///         initial buy for the creator in the same transaction.
    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 minTokensOut,
        TokenMetadata calldata meta
    ) external payable nonReentrant returns (address token) {
        token = address(new LaunchToken(name, symbol, TOTAL_SUPPLY));
        curves[token] = Curve({
            vEth: VIRTUAL_ETH,
            vToken: VIRTUAL_TOKEN,
            realEth: 0,
            sold: 0,
            graduated: false,
            creator: msg.sender
        });
        tokenMetadata[token] = meta;
        allTokens.push(token);
        emit TokenCreated(token, msg.sender, name, symbol);
        emit MetadataUpdated(token, meta.logoURI, meta.website, meta.twitter, meta.telegram);

        if (msg.value > 0) {
            _buy(token, msg.sender, msg.value, minTokensOut);
        }
    }

    /// @notice The token creator can update logo and links at any time.
    function updateMetadata(address token, TokenMetadata calldata meta) external {
        Curve storage c = curves[token];
        if (c.vEth == 0) revert UnknownToken();
        if (msg.sender != c.creator) revert NotCreator();
        tokenMetadata[token] = meta;
        emit MetadataUpdated(token, meta.logoURI, meta.website, meta.twitter, meta.telegram);
    }

    // ---------------------------------------------------------------- trade

    function buy(address token, uint256 minTokensOut) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        _buy(token, msg.sender, msg.value, minTokensOut);
    }

    function _buy(address token, address buyer, uint256 ethIn, uint256 minTokensOut) internal {
        Curve storage c = curves[token];
        if (c.vEth == 0) revert UnknownToken();
        if (c.graduated) revert AlreadyGraduated();

        uint256 fee = (ethIn * feeBps) / FEE_DENOMINATOR;
        uint256 ethForCurve = ethIn - fee;

        uint256 k = c.vEth * c.vToken;
        uint256 tokensOut = c.vToken - k / (c.vEth + ethForCurve);

        // Cap the final buy to what's left on the curve and refund the surplus.
        uint256 remaining = CURVE_SUPPLY - c.sold;
        uint256 refund = 0;
        if (tokensOut >= remaining) {
            tokensOut = remaining;
            // ETH needed to buy exactly `remaining`: x' = k / (y - out) - x
            uint256 ethNeeded = k / (c.vToken - tokensOut) - c.vEth + 1; // round against user
            if (ethNeeded < ethForCurve) {
                refund = ethForCurve - ethNeeded;
                ethForCurve = ethNeeded;
            }
            fee = (ethForCurve * feeBps) / (FEE_DENOMINATOR - feeBps); // fee on the used part
            // Rounding in the fee gross-up can exceed ethIn by a wei: saturate
            // instead of underflowing, so the graduating buy can never revert here.
            uint256 total = ethForCurve + fee;
            refund = ethIn > total ? ethIn - total : 0;
        }
        if (tokensOut == 0) revert ZeroAmount();
        if (tokensOut < minTokensOut) revert Slippage();

        c.vEth += ethForCurve;
        c.vToken -= tokensOut;
        c.realEth += ethForCurve;
        c.sold += tokensOut;

        IERC20(token).safeTransfer(buyer, tokensOut);
        _splitFee(c.creator, fee);
        if (refund > 0) _sendEth(buyer, refund);

        emit Bought(token, buyer, ethIn - refund, tokensOut, fee);

        if (c.sold == CURVE_SUPPLY) {
            c.graduated = true;
            LaunchToken(token).setGraduated();
            emit Graduated(token, c.realEth);
        }
    }

    function sell(address token, uint256 tokensIn, uint256 minEthOut) external nonReentrant {
        if (tokensIn == 0) revert ZeroAmount();
        Curve storage c = curves[token];
        if (c.vEth == 0) revert UnknownToken();
        if (c.graduated) revert AlreadyGraduated();

        uint256 k = c.vEth * c.vToken;
        uint256 ethOut = c.vEth - k / (c.vToken + tokensIn);
        // Rounding can push ethOut a wei past what the curve actually holds.
        if (ethOut > c.realEth) ethOut = c.realEth;
        uint256 fee = (ethOut * feeBps) / FEE_DENOMINATOR;
        uint256 ethToSeller = ethOut - fee;
        if (ethToSeller < minEthOut) revert Slippage();

        c.vEth -= ethOut;
        c.vToken += tokensIn;
        c.realEth -= ethOut;
        c.sold -= tokensIn;

        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);
        _splitFee(c.creator, fee);
        _sendEth(msg.sender, ethToSeller);

        emit Sold(token, msg.sender, tokensIn, ethToSeller, fee);
    }

    // ---------------------------------------------------------------- views

    /// @notice Tokens received for `ethIn` (after fee), ignoring the final-buy cap.
    function quoteBuy(address token, uint256 ethIn) external view returns (uint256) {
        Curve storage c = curves[token];
        if (c.vEth == 0) revert UnknownToken();
        uint256 ethForCurve = ethIn - (ethIn * feeBps) / FEE_DENOMINATOR;
        uint256 k = c.vEth * c.vToken;
        uint256 out = c.vToken - k / (c.vEth + ethForCurve);
        uint256 remaining = CURVE_SUPPLY - c.sold;
        return out > remaining ? remaining : out;
    }

    /// @notice ETH received (after fee) for selling `tokensIn`.
    function quoteSell(address token, uint256 tokensIn) external view returns (uint256) {
        Curve storage c = curves[token];
        if (c.vEth == 0) revert UnknownToken();
        uint256 k = c.vEth * c.vToken;
        uint256 ethOut = c.vEth - k / (c.vToken + tokensIn);
        return ethOut - (ethOut * feeBps) / FEE_DENOMINATOR;
    }

    /// @notice Current spot price in wei per whole token (1e18 units).
    function currentPrice(address token) external view returns (uint256) {
        Curve storage c = curves[token];
        if (c.vEth == 0) revert UnknownToken();
        return (c.vEth * 1e18) / c.vToken;
    }

    function tokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    // ---------------------------------------------------------------- migrate

    /// @notice After graduation anyone can trigger the migration: the reserved
    ///         supply and the raised ETH are handed to the DEX adapter.
    function migrate(address token) external nonReentrant {
        Curve storage c = curves[token];
        if (c.vEth == 0) revert UnknownToken();
        if (!c.graduated) revert NotYetGraduated();
        if (address(migrator) == address(0)) revert MigratorNotSet();

        uint256 ethAmount = c.realEth;
        if (ethAmount == 0) revert ZeroAmount(); // already migrated
        c.realEth = 0;

        IERC20(token).safeTransfer(address(migrator), DEX_RESERVE);
        migrator.migrate{value: ethAmount}(token, DEX_RESERVE);

        emit Migrated(token, DEX_RESERVE, ethAmount);
    }

    // ---------------------------------------------------------------- fees

    /// @notice Splits a trade fee: creator share accrues for pull-withdrawal,
    ///         the remainder goes straight to the treasury.
    function _splitFee(address creator, uint256 fee) internal {
        uint256 creatorCut = (fee * creatorFeeShareBps) / FEE_DENOMINATOR;
        if (creatorCut > 0) creatorFees[creator] += creatorCut;
        _sendEth(treasury, fee - creatorCut);
    }

    /// @notice Withdraw the fees accrued by all tokens you created.
    function claimCreatorFees() external nonReentrant {
        uint256 amount = creatorFees[msg.sender];
        if (amount == 0) revert ZeroAmount();
        creatorFees[msg.sender] = 0;
        _sendEth(msg.sender, amount);
        emit CreatorFeesClaimed(msg.sender, amount);
    }

    // ---------------------------------------------------------------- admin

    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > 500) revert FeeTooHigh(); // max 5%
        feeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    function setCreatorFeeShareBps(uint256 newShareBps) external onlyOwner {
        if (newShareBps > FEE_DENOMINATOR) revert FeeTooHigh();
        creatorFeeShareBps = newShareBps;
        emit CreatorFeeShareUpdated(newShareBps);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setMigrator(address newMigrator) external onlyOwner {
        migrator = IDexMigrator(newMigrator);
        emit MigratorUpdated(newMigrator);
    }

    function _sendEth(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }
}
