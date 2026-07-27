// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @title LaunchToken
/// @notice ERC-20 created by the Launchpad. The full supply is minted to the
///         launchpad, which sells it along a bonding curve. Transfers between
///         third parties are blocked until the token graduates, so liquidity
///         cannot be moved to a DEX before the curve completes.
contract LaunchToken is ERC20 {
    address public immutable launchpad;
    bool public graduated;

    error OnlyLaunchpad();
    error NotGraduated();

    constructor(string memory name_, string memory symbol_, uint256 supply_) ERC20(name_, symbol_) {
        launchpad = msg.sender;
        _mint(msg.sender, supply_);
    }

    function setGraduated() external {
        if (msg.sender != launchpad) revert OnlyLaunchpad();
        graduated = true;
    }

    function _update(address from, address to, uint256 value) internal override {
        // Pre-graduation, only flows through the launchpad (curve buys/sells,
        // mint, and the migration transfer) are allowed.
        if (!graduated && from != launchpad && to != launchpad && from != address(0)) {
            revert NotGraduated();
        }
        super._update(from, to, value);
    }
}
