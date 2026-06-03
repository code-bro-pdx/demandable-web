// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DWRegistry
 * @dev Decentralized directory of home service professionals in the Demandable Web (DW) ecosystem.
 * Holds factual, standardized, and vetted profiles to ensure a level playing field.
 */
contract DWRegistry is Ownable {
    struct Provider {
        address walletAddress;
        string name;
        string serviceCategory;
        int32 latitude;         // Lat scaled by 1e6
        int32 longitude;        // Lng scaled by 1e6
        uint16 radius;          // Operation radius in miles
        string metadataURI;     // IPFS hash of verified factual details/images
        bool isVerified;        // Admin/DAO credential verification status
        uint256 credentialExpiry; // Expiry timestamp of license/insurance
        uint256 jobsCompleted;  // Total jobs executed on-chain
        uint256 ratingSum;      // Sum of ratings received (1-5 stars)
        uint256 reviewCount;    // Total reviews received
    }

    mapping(address => Provider) public providers;
    mapping(address => bool) public authorizedCallers; // Contracts (like DWEscrow) allowed to update stats

    event ProviderRegistered(address indexed provider, string name, string category);
    event ProviderVetted(address indexed provider, uint256 expiry);
    event StatsUpdated(address indexed provider, uint256 rating, uint256 totalJobs);
    event CallerAuthorizationChanged(address indexed caller, bool status);

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "DWRegistry: unauthorized caller");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Set contract addresses (like DWEscrow) allowed to update provider job statistics
     */
    function setAuthorizedCaller(address caller, bool status) external onlyOwner {
        authorizedCallers[caller] = status;
        emit CallerAuthorizationChanged(caller, status);
    }

    /**
     * @dev Contractor self-registers. Stored metadata must be strictly factual.
     */
    function registerProvider(
        string calldata name,
        string calldata category,
        int32 latitude,
        int32 longitude,
        uint16 radius,
        string calldata metadataURI
    ) external {
        require(bytes(name).length > 0, "DWRegistry: name required");
        require(bytes(category).length > 0, "DWRegistry: category required");

        Provider storage p = providers[msg.sender];
        p.walletAddress = msg.sender;
        p.name = name;
        p.serviceCategory = category;
        p.latitude = latitude;
        p.longitude = longitude;
        p.radius = radius;
        p.metadataURI = metadataURI;

        emit ProviderRegistered(msg.sender, name, category);
    }

    /**
     * @dev DAO or vetting agent certifies license, insurance, and background checks.
     */
    function vetProvider(address providerAddress, uint256 expiry) external onlyOwner {
        require(providers[providerAddress].walletAddress != address(0), "DWRegistry: provider not registered");
        require(expiry > block.timestamp, "DWRegistry: expiry must be in future");

        providers[providerAddress].isVerified = true;
        providers[providerAddress].credentialExpiry = expiry;

        emit ProviderVetted(providerAddress, expiry);
    }

    /**
     * @dev Called by DWEscrow when a job completes to record rating & completion stats
     */
    function updateStats(address providerAddress, uint256 rating) external onlyAuthorized {
        Provider storage p = providers[providerAddress];
        require(p.walletAddress != address(0), "DWRegistry: provider not registered");
        require(rating >= 1 && rating <= 5, "DWRegistry: rating must be 1-5");

        p.jobsCompleted += 1;
        p.ratingSum += rating;
        p.reviewCount += 1;

        emit StatsUpdated(providerAddress, rating, p.jobsCompleted);
    }

    /**
     * @dev Check if a provider is vetted and currently active
     */
    function isProviderVetted(address providerAddress) external view returns (bool) {
        Provider memory p = providers[providerAddress];
        return p.isVerified && p.credentialExpiry > block.timestamp;
    }

    /**
     * @dev Get detailed provider info
     */
    function getProvider(address providerAddress) external view returns (Provider memory) {
        return providers[providerAddress];
    }
}
