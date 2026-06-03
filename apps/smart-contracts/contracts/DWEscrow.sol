// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DWGToken.sol";
import "./DWRegistry.sol";

/**
 * @title DWEscrow
 * @dev Escrow and dispute settlement system for the Demandable Web ecosystem.
 * Handles job payments, randomized peer oversight assignment, verification reward minting,
 * and dispute resolution.
 */
contract DWEscrow is Ownable {
    DWGToken public dwgToken;
    IERC20 public dwsToken;
    DWRegistry public registry;

    uint256 public constant JURY_VOTE_LOCK = 250 * 10**18; // $DWG locked for jury duty
    uint256 public constant INSPECTOR_LOCK = 100 * 10**18; // $DWG locked for milestone inspection
    uint256 public constant ARBITRATION_FEE_USD = 20 * 10**18; // $20 DWS flat arbitration fee per juror
    uint256 public constant INSPECTION_REWARD_DWG = 50 * 10**18; // $DWG rewards for inspection

    enum JobStatus { Active, Completed, Disputed, Resolved }
    enum MilestoneStatus { Pending, Requested, Approved, Rejected }

    struct Milestone {
        uint256 amount;
        MilestoneStatus status;
        address assignedInspector;
        uint256 requestedAt;
    }

    struct Job {
        uint256 id;
        address homeowner;
        address contractor;
        uint256 totalAmount;
        JobStatus status;
        uint256 currentMilestoneIndex;
        string contractMetadataURI; // Details of work order
        Milestone[] milestones;
    }

    struct Dispute {
        uint256 jobId;
        uint256 homeownerVotes;
        uint256 contractorVotes;
        uint256 disputeDeadline;
        bool resolved;
        address[] jurors;
        mapping(address => bool) votedForHomeowner;
        mapping(address => bool) hasVoted;
    }

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Dispute) public disputes;

    // Registered pools for inspectors
    address[] public inspectorPool;
    mapping(address => bool) public isInspectorRegistered;

    event JobCreated(uint256 indexed jobId, address indexed homeowner, address indexed contractor, uint256 totalAmount);
    event VerificationRequested(uint256 indexed jobId, uint256 indexed milestoneIndex);
    event InspectorAssigned(uint256 indexed jobId, uint256 indexed milestoneIndex, address indexed inspector);
    event MilestoneApproved(uint256 indexed jobId, uint256 indexed milestoneIndex, address indexed inspector);
    event MilestoneRejected(uint256 indexed jobId, uint256 indexed milestoneIndex, address indexed inspector);
    event DisputeRaised(uint256 indexed jobId);
    event JurorVoted(uint256 indexed jobId, address indexed juror, bool voteForHomeowner);
    event DisputeResolved(uint256 indexed jobId, address winner);

    constructor(
        address _dwgToken,
        address _dwsToken,
        address _registry,
        address initialOwner
    ) Ownable(initialOwner) {
        dwgToken = DWGToken(_dwgToken);
        dwsToken = IERC20(_dwsToken);
        registry = DWRegistry(_registry);
    }

    /**
     * @dev Service pros register themselves to be eligible for peer inspection duties
     */
    function registerAsInspector() external {
        require(!isInspectorRegistered[msg.sender], "DWEscrow: already registered");
        require(dwgToken.stakedBalanceOf(msg.sender) >= 500 * 10**18, "DWEscrow: must stake at least 500 DWG");
        
        inspectorPool.push(msg.sender);
        isInspectorRegistered[msg.sender] = true;
    }

    /**
     * @dev Homeowner creates a service contract and deposits DWS stablecoin into escrow
     */
    function createJob(
        address contractor,
        uint256[] calldata milestoneAmounts,
        string calldata metadataURI
    ) external returns (uint256) {
        require(contractor != address(0), "DWEscrow: invalid contractor");
        require(contractor != msg.sender, "DWEscrow: contractor cannot be homeowner");
        require(milestoneAmounts.length > 0, "DWEscrow: must have at least 1 milestone");
        require(registry.isProviderVetted(contractor), "DWEscrow: contractor is not vetted in registry");

        uint256 totalJobCost = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            totalJobCost += milestoneAmounts[i];
        }

        // Transfer DWS from homeowner to Escrow
        require(dwsToken.transferFrom(msg.sender, address(this), totalJobCost), "DWEscrow: deposit failed");

        uint256 jobId = ++jobCount;
        Job storage newJob = jobs[jobId];
        newJob.id = jobId;
        newJob.homeowner = msg.sender;
        newJob.contractor = contractor;
        newJob.totalAmount = totalJobCost;
        newJob.status = JobStatus.Active;
        newJob.contractMetadataURI = metadataURI;

        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            newJob.milestones.push(Milestone({
                amount: milestoneAmounts[i],
                status: MilestoneStatus.Pending,
                assignedInspector: address(0),
                requestedAt: 0
            }));
        }

        emit JobCreated(jobId, msg.sender, contractor, totalJobCost);
        return jobId;
    }

    /**
     * @dev Contractor requests validation for the active milestone
     */
    function requestVerification(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Active, "DWEscrow: job not active");
        require(msg.sender == job.contractor, "DWEscrow: only contractor can request verification");
        
        uint256 mIdx = job.currentMilestoneIndex;
        require(mIdx < job.milestones.length, "DWEscrow: all milestones completed");
        
        Milestone storage m = job.milestones[mIdx];
        require(m.status == MilestoneStatus.Pending || m.status == MilestoneStatus.Rejected, "DWEscrow: verification already requested or approved");

        m.status = MilestoneStatus.Requested;
        m.requestedAt = block.timestamp;

        emit VerificationRequested(jobId, mIdx);

        // Assign inspector pseudo-randomly
        _assignRandomInspector(jobId, mIdx);
    }

    /**
     * @dev Internal pseudo-random assignment of validator from registered inspector pool
     */
    function _assignRandomInspector(uint256 jobId, uint256 milestoneIndex) internal {
        require(inspectorPool.length > 0, "DWEscrow: no registered inspectors available");
        Job storage job = jobs[jobId];
        
        // Find a validator that is not the homeowner or the contractor
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, jobId, milestoneIndex)));
        uint256 inspectorIndex = seed % inspectorPool.length;
        address selectedInspector = inspectorPool[inspectorIndex];
        
        // Simple circular search if selected is party of the job
        uint256 iterations = 0;
        while ((selectedInspector == job.homeowner || selectedInspector == job.contractor) && iterations < inspectorPool.length) {
            inspectorIndex = (inspectorIndex + 1) % inspectorPool.length;
            selectedInspector = inspectorPool[inspectorIndex];
            iterations++;
        }

        require(selectedInspector != job.homeowner && selectedInspector != job.contractor, "DWEscrow: failed to find neutral inspector");
        
        // Lock inspector stake (anti-collusion collateral)
        dwgToken.lockStake(selectedInspector, INSPECTOR_LOCK);
        
        job.milestones[milestoneIndex].assignedInspector = selectedInspector;

        emit InspectorAssigned(jobId, milestoneIndex, selectedInspector);
    }

    /**
     * @dev Assigned inspector votes on the completed milestone (approve or reject)
     */
    function verifyMilestone(uint256 jobId, bool approve) external {
        Job storage job = jobs[jobId];
        uint256 mIdx = job.currentMilestoneIndex;
        require(mIdx < job.milestones.length, "DWEscrow: job complete");
        
        Milestone storage m = job.milestones[mIdx];
        require(msg.sender == m.assignedInspector, "DWEscrow: not the assigned inspector");
        require(m.status == MilestoneStatus.Requested, "DWEscrow: verification not pending");

        dwgToken.unlockStake(msg.sender, INSPECTOR_LOCK);

        if (approve) {
            m.status = MilestoneStatus.Approved;
            job.currentMilestoneIndex++;

            // Release payment to contractor
            require(dwsToken.transfer(job.contractor, m.amount), "DWEscrow: payment transfer failed");

            // Mint verification reward in DWG to inspector
            dwgToken.mint(msg.sender, INSPECTION_REWARD_DWG);

            emit MilestoneApproved(jobId, mIdx, msg.sender);

            if (job.currentMilestoneIndex == job.milestones.length) {
                job.status = JobStatus.Completed;
                registry.updateStats(job.contractor, 5); // Default 5 star for completed job
            }
        } else {
            m.status = MilestoneStatus.Rejected;
            emit MilestoneRejected(jobId, mIdx, msg.sender);
        }
    }

    /**
     * @dev Escalates a rejected milestone into a formal dispute. Requires flat arbitration fees from both.
     */
    function raiseDispute(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Active, "DWEscrow: job not active");
        require(msg.sender == job.homeowner || msg.sender == job.contractor, "DWEscrow: unauthorized");
        
        uint256 mIdx = job.currentMilestoneIndex;
        require(job.milestones[mIdx].status == MilestoneStatus.Rejected, "DWEscrow: milestone not in rejected state");

        job.status = JobStatus.Disputed;

        // Create Dispute struct
        Dispute storage d = disputes[jobId];
        d.jobId = jobId;
        d.disputeDeadline = block.timestamp + 7 days;
        d.resolved = false;

        // Escrow collects arbitration fee (flat fee in stable token)
        require(dwsToken.transferFrom(job.homeowner, address(this), ARBITRATION_FEE_USD), "DWEscrow: homeowner arbitration fee failed");
        require(dwsToken.transferFrom(job.contractor, address(this), ARBITRATION_FEE_USD), "DWEscrow: contractor arbitration fee failed");

        emit DisputeRaised(jobId);
    }

    /**
     * @dev Registered stakers cast votes on who is correct in the dispute
     */
    function voteOnDispute(uint256 jobId, bool voteForHomeowner) external {
        Dispute storage d = disputes[jobId];
        Job memory job = jobs[jobId];
        
        require(job.status == JobStatus.Disputed, "DWEscrow: dispute not active");
        require(block.timestamp < d.disputeDeadline, "DWEscrow: voting expired");
        require(isInspectorRegistered[msg.sender], "DWEscrow: must be a registered inspector to vote");
        require(msg.sender != job.homeowner && msg.sender != job.contractor, "DWEscrow: disputing parties cannot vote");
        require(!d.hasVoted[msg.sender], "DWEscrow: already voted");

        // Lock voting stake
        dwgToken.lockStake(msg.sender, JURY_VOTE_LOCK);

        d.hasVoted[msg.sender] = true;
        d.votedForHomeowner[msg.sender] = voteForHomeowner;
        d.jurors.push(msg.sender);

        if (voteForHomeowner) {
            d.homeownerVotes++;
        } else {
            d.contractorVotes++;
        }

        emit JurorVoted(jobId, msg.sender, voteForHomeowner);
    }

    /**
     * @dev Resolves the dispute after voting deadline. Distributes rewards & slashes minority.
     */
    function resolveDispute(uint256 jobId) external {
        Dispute storage d = disputes[jobId];
        Job storage job = jobs[jobId];

        require(job.status == JobStatus.Disputed, "DWEscrow: not in dispute");
        require(block.timestamp >= d.disputeDeadline || d.jurors.length >= 7, "DWEscrow: voting still in progress");
        require(!d.resolved, "DWEscrow: already resolved");

        d.resolved = true;
        job.status = JobStatus.Resolved;

        bool homeownerWon = d.homeownerVotes >= d.contractorVotes;
        address winner = homeownerWon ? job.homeowner : job.contractor;
        address loser = homeownerWon ? job.contractor : job.homeowner;

        // Distribute disputed milestone amount + loser's arbitration fee to the winner
        uint256 milestoneAmount = job.milestones[job.currentMilestoneIndex].amount;
        
        // Payout escrowed amount
        if (homeownerWon) {
            // Refund milestone amount back to homeowner
            require(dwsToken.transfer(job.homeowner, milestoneAmount), "DWEscrow: refund failed");
            registry.updateStats(job.contractor, 1); // 1-star penalty rating
        } else {
            // Release milestone amount to contractor
            require(dwsToken.transfer(job.contractor, milestoneAmount), "DWEscrow: payment failed");
            registry.updateStats(job.contractor, 5); // Cleared of charges
        }

        // Refund winner's arbitration fee
        require(dwsToken.transfer(winner, ARBITRATION_FEE_USD), "DWEscrow: winner fee refund failed");

        // Total fee pool to distribute to coherent jurors (loser's fee + any platform portion)
        // Let's distribute the loser's fee to majority jurors
        uint256 coherentCount = homeownerWon ? d.homeownerVotes : d.contractorVotes;
        uint256 feeShare = coherentCount > 0 ? ARBITRATION_FEE_USD / coherentCount : 0;

        // Game theory settlement: unlock stakers and slash minority
        for (uint256 i = 0; i < d.jurors.length; i++) {
            address juror = d.jurors[i];
            bool votedCorrectly = (d.votedForHomeowner[juror] == homeownerWon);

            if (votedCorrectly) {
                // Unlock voting stake
                dwgToken.unlockStake(juror, JURY_VOTE_LOCK);
                // Distribute DWS rewards
                if (feeShare > 0) {
                    require(dwsToken.transfer(juror, feeShare), "DWEscrow: fee distribution failed");
                }
            } else {
                // Slash 10% of locked vote stake
                uint256 slashAmount = JURY_VOTE_LOCK / 10;
                dwgToken.slashStake(juror, slashAmount);
                dwgToken.unlockStake(juror, JURY_VOTE_LOCK - slashAmount);
            }
        }

        emit DisputeResolved(jobId, winner);
    }
    
    // View function to inspect job milestone details
    function getMilestone(uint256 jobId, uint256 index) external view returns (Milestone memory) {
        return jobs[jobId].milestones[index];
    }
}
