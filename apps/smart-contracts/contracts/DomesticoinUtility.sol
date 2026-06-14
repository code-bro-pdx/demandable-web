// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DomesticoinUtility
 * @dev Dynamic emission and staking utility token for the Demandable Web ecosystem.
 * Represents $DMCU token, used for validator bounds, dispute stakers, and rewards.
 */
contract DomesticoinUtility is ERC20, Ownable {
    mapping(address => bool) public isMinter;

    // Staking tracking
    mapping(address => uint256) private _stakedBalances;
    mapping(address => uint256) private _lockedBalances; // Staked tokens locked in active jobs/disputes

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Slashed(address indexed user, uint256 amount);
    event MinterStatusChanged(address indexed minter, bool status);

    modifier onlyMinter() {
        require(isMinter[msg.sender] || msg.sender == owner(), "DomesticoinUtility: caller is not authorized");
        _;
    }

    constructor(address initialOwner) ERC20("Domesticoin Utility", "DMCU") Ownable(initialOwner) {
        // Mint 10,000,000 DMCU tokens to the initial owner for liquidity/ecosystem rewards
        _mint(initialOwner, 10000000 * 10 ** decimals());
    }

    /**
     * @dev Grant or revoke minter permissions (used for Escrow and Dispute contracts)
     */
    function setMinter(address minter, bool status) external onlyOwner {
        isMinter[minter] = status;
        emit MinterStatusChanged(minter, status);
    }

    /**
     * @dev Mint dynamic rewards for peer verifications or dispute resolutions
     */
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    /**
     * @dev User stakes DMCU tokens to qualify as an inspector or dispute voter
     */
    function stake(uint256 amount) external {
        require(amount > 0, "DomesticoinUtility: stake amount must be > 0");
        _transfer(msg.sender, address(this), amount);
        _stakedBalances[msg.sender] += amount;
        emit Staked(msg.sender, amount);
    }

    /**
     * @dev User unstakes DMCU tokens (only available unlocked balance can be withdrawn)
     */
    function unstake(uint256 amount) external {
        require(amount > 0, "DomesticoinUtility: unstake amount must be > 0");
        require(
            _stakedBalances[msg.sender] - _lockedBalances[msg.sender] >= amount,
            "DomesticoinUtility: insufficient unlocked stake"
        );
        _stakedBalances[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Locks a portion of user's stake when they are assigned a job or dispute
     */
    function lockStake(address account, uint256 amount) external onlyMinter {
        require(
            _stakedBalances[account] - _lockedBalances[account] >= amount,
            "DomesticoinUtility: insufficient available stake to lock"
        );
        _lockedBalances[account] += amount;
    }

    /**
     * @dev Unlocks stake after job/dispute completion
     */
    function unlockStake(address account, uint256 amount) external onlyMinter {
        require(_lockedBalances[account] >= amount, "DomesticoinUtility: insufficient locked balance");
        _lockedBalances[account] -= amount;
    }

    /**
     * @dev Slashes staked tokens due to poor oversight, fraud, or incorrect dispute votes
     */
    function slashStake(address account, uint256 amount) external onlyMinter {
        require(_stakedBalances[account] >= amount, "DomesticoinUtility: insufficient staked balance to slash");
        
        // Adjust locked balances
        if (_lockedBalances[account] >= amount) {
            _lockedBalances[account] -= amount;
        } else {
            _lockedBalances[account] = 0;
        }
        
        _stakedBalances[account] -= amount;
        _burn(address(this), amount); // Burn slashed tokens to create deflationary pressure
        
        emit Slashed(account, amount);
    }

    // Getters for staked balances
    function stakedBalanceOf(address account) external view returns (uint256) {
        return _stakedBalances[account];
    }

    // Locked balance view
    function lockedBalanceOf(address account) external view returns (uint256) {
        return _lockedBalances[account];
    }

    // Available stake view
    function availableStakeOf(address account) external view returns (uint256) {
        return _stakedBalances[account] - _lockedBalances[account];
    }
}
