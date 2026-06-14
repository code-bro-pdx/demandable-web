// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DomesticoinStable
 * @dev Mock stablecoin ($DMCS) representing USD-pegged utility in the Demandable Web ecosystem.
 * Used for escrows, bidding, and flat-rate juror arbitration fees.
 */
contract DomesticoinStable is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Domesticoin Stable", "DMCS") Ownable(initialOwner) {
        // Mint 100,000,000 DMCS to the owner for initial test funding and distribution
        _mint(initialOwner, 100000000 * 10 ** decimals());
    }

    /**
     * @dev Faucet mint function to allow easy testing for homeowners and contractors
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
