// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDexMigrator
/// @notice Adapter that receives a graduated token's reserved supply plus the
///         quote raised on the curve and seeds liquidity on a DEX. One adapter
///         per chain keeps the Launchpad itself chain-agnostic.
interface IDexMigrator {
    /// @param token        the graduated token
    /// @param tokenAmount  tokens transferred to the migrator for liquidity
    /// @param quoteAsset   address(0) for native ETH (sent as msg.value),
    ///                     otherwise the ERC-20 already transferred here
    /// @param quoteAmount  amount of the quote asset provided
    function migrate(address token, uint256 tokenAmount, address quoteAsset, uint256 quoteAmount)
        external
        payable;
}
