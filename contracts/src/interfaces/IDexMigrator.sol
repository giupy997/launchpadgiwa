// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDexMigrator
/// @notice Adapter that receives a graduated token's reserved supply plus the
///         ETH raised on the curve and seeds liquidity on a DEX. One adapter
///         per chain keeps the Launchpad itself chain-agnostic (GIWA today,
///         other EVM chains later).
interface IDexMigrator {
    /// @param token        the graduated token
    /// @param tokenAmount  tokens transferred to the migrator for liquidity
    /// @dev   the ETH for the pool is sent as msg.value
    function migrate(address token, uint256 tokenAmount) external payable;
}
