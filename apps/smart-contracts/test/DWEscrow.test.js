const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Demandable Web (DW) Platform Tests", function () {
  let dmcuToken, dmcsToken, registry, escrow;
  let owner, homeowner, contractor, inspector, juror1, juror2, juror3;

  beforeEach(async function () {
    [owner, homeowner, contractor, inspector, juror1, juror2, juror3] = await ethers.getSigners();

    // 1. Deploy Tokens & Registry
    const DomesticoinUtility = await ethers.getContractFactory("DomesticoinUtility");
    dmcuToken = await DomesticoinUtility.deploy(owner.address);
    await dmcuToken.waitForDeployment();

    const DomesticoinStable = await ethers.getContractFactory("DomesticoinStable");
    dmcsToken = await DomesticoinStable.deploy(owner.address);
    await dmcsToken.waitForDeployment();

    const DWRegistry = await ethers.getContractFactory("DWRegistry");
    registry = await DWRegistry.deploy(owner.address);
    await registry.waitForDeployment();

    // 2. Deploy Escrow
    const DWEscrow = await ethers.getContractFactory("DWEscrow");
    escrow = await DWEscrow.deploy(
      await dmcuToken.getAddress(),
      await dmcsToken.getAddress(),
      await registry.getAddress(),
      owner.address
    );
    await escrow.waitForDeployment();

    // 3. Set Permissions
    await dmcuToken.setMinter(await escrow.getAddress(), true);
    await registry.setAuthorizedCaller(await escrow.getAddress(), true);

    // 4. Distribute stable tokens for tests
    await dmcsToken.mint(homeowner.address, ethers.parseEther("5000"));
    await dmcsToken.mint(contractor.address, ethers.parseEther("1000"));

    // 5. Distribute utility tokens for staking
    await dmcuToken.transfer(inspector.address, ethers.parseEther("1000"));
    await dmcuToken.transfer(juror1.address, ethers.parseEther("1000"));
    await dmcuToken.transfer(juror2.address, ethers.parseEther("1000"));
    await dmcuToken.transfer(juror3.address, ethers.parseEther("1000"));
  });

  describe("Contractor Registration & Vetting", function () {
    it("should allow a contractor to register and owner to vet them", async function () {
      await registry.connect(contractor).registerProvider(
        "Bob Roofing",
        "Roofing",
        37774900, // Lat scaled
        -122419400, // Lng scaled
        25, // radius
        "ipfs://factual-profile-data"
      );

      let isVetted = await registry.isProviderVetted(contractor.address);
      expect(isVetted).to.be.false;

      // Vet contractor for 1 year
      const oneYear = 365 * 24 * 60 * 60;
      await registry.vetProvider(contractor.address, (await ethers.provider.getBlock("latest")).timestamp + oneYear);

      isVetted = await registry.isProviderVetted(contractor.address);
      expect(isVetted).to.be.true;
    });
  });

  describe("Escrow Value Loop", function () {
    beforeEach(async function () {
      // Register & Vet contractor
      await registry.connect(contractor).registerProvider(
        "Bob Roofing",
        "Roofing",
        37774900,
        -122419400,
        25,
        "ipfs://factual-profile-data"
      );
      const expiry = (await ethers.provider.getBlock("latest")).timestamp + 365 * 24 * 60 * 60;
      await registry.vetProvider(contractor.address, expiry);

      // Register inspector (locks 500 DMCU stake)
      await dmcuToken.connect(inspector).stake(ethers.parseEther("500"));
      await escrow.connect(inspector).registerAsInspector();
    });

    it("should process a milestone creation, validation, and release successfully", async function () {
      const milestones = [ethers.parseEther("600"), ethers.parseEther("400")];

      // Approve stable token spending for homeowner
      await dmcsToken.connect(homeowner).approve(await escrow.getAddress(), ethers.parseEther("1000"));

      // Create Job
      await escrow.connect(homeowner).createJob(
        contractor.address,
        milestones,
        "ipfs://job-specifications"
      );

      // Contractor requests verification
      await escrow.connect(contractor).requestVerification(1);

      // Verify inspector was assigned
      const milestone = await escrow.getMilestone(1, 0);
      expect(milestone.assignedInspector).to.equal(inspector.address);
      expect(milestone.status).to.equal(1); // Requested

      // Inspector approves
      const inspectorDMCUBefore = await dmcuToken.balanceOf(inspector.address);
      const contractorDMCSBefore = await dmcsToken.balanceOf(contractor.address);

      await escrow.connect(inspector).verifyMilestone(1, true);

      // Verify contractor received payment
      const contractorDMCSAfter = await dmcsToken.balanceOf(contractor.address);
      expect(contractorDMCSAfter - contractorDMCSBefore).to.equal(ethers.parseEther("600"));

      // Verify inspector earned reward in DMCU
      const inspectorDMCUAfter = await dmcuToken.balanceOf(inspector.address);
      expect(inspectorDMCUAfter - inspectorDMCUBefore).to.equal(ethers.parseEther("50"));
    });
  });

  describe("Dispute Game Theory & Slashing", function () {
    beforeEach(async function () {
      // Register & Vet contractor
      await registry.connect(contractor).registerProvider(
        "Bob Roofing",
        "Roofing",
        37774900,
        -122419400,
        25,
        "ipfs://factual-profile-data"
      );
      await registry.vetProvider(contractor.address, (await ethers.provider.getBlock("latest")).timestamp + 100000);

      // Register inspector Bob
      await dmcuToken.connect(inspector).stake(ethers.parseEther("500"));
      await escrow.connect(inspector).registerAsInspector();

      // Approve DMCS spending
      await dmcsToken.connect(homeowner).approve(await escrow.getAddress(), ethers.parseEther("1000"));
      
      // Create Job
      await escrow.connect(homeowner).createJob(
        contractor.address,
        [ethers.parseEther("1000")],
        "ipfs://job-specifications"
      );

      // Request verification and reject it (Bob is the only inspector in the pool at this point, so he is assigned)
      await escrow.connect(contractor).requestVerification(1);
      await escrow.connect(inspector).verifyMilestone(1, false); // Reject milestone
    });

    it("should raise a dispute, collect fees, process jury votes, and slash incorrect jurors", async function () {
      // Register jurors now so they can vote on the dispute
      await dmcuToken.connect(juror1).stake(ethers.parseEther("1000"));
      await escrow.connect(juror1).registerAsInspector();

      await dmcuToken.connect(juror2).stake(ethers.parseEther("1000"));
      await escrow.connect(juror2).registerAsInspector();

      await dmcuToken.connect(juror3).stake(ethers.parseEther("1000"));
      await escrow.connect(juror3).registerAsInspector();

      // Raise dispute - both must approve arbitration fee
      await dmcsToken.connect(homeowner).approve(await escrow.getAddress(), ethers.parseEther("20"));
      await dmcsToken.connect(contractor).approve(await escrow.getAddress(), ethers.parseEther("20"));

      await escrow.connect(contractor).raiseDispute(1);

      // Jurors vote: Juror 1 & Juror 2 vote for Homeowner. Juror 3 votes for Contractor.
      await escrow.connect(juror1).voteOnDispute(1, true); // Homeowner
      await escrow.connect(juror2).voteOnDispute(1, true); // Homeowner
      await escrow.connect(juror3).voteOnDispute(1, false); // Contractor

      // Fast forward time to expire dispute voting
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Verify stakes are locked before resolution
      const juror3LockedBefore = await dmcuToken.lockedBalanceOf(juror3.address);
      expect(juror3LockedBefore).to.equal(ethers.parseEther("250")); // locked for vote

      // Resolve Dispute (Homeowner wins 2 vs 1)
      const homeownerDMCSBefore = await dmcsToken.balanceOf(homeowner.address);
      await escrow.resolveDispute(1);

      // Homeowner gets refunded milestones ($1000) + winner's fee ($20)
      const homeownerDMCSAfter = await dmcsToken.balanceOf(homeowner.address);
      expect(homeownerDMCSAfter - homeownerDMCSBefore).to.equal(ethers.parseEther("1020"));

      // Juror 1 & 2 (correct voters) receive arbitration fee share
      // Fee share = 20 DMCS / 2 jurors = 10 DMCS each
      const juror1DMCS = await dmcsToken.balanceOf(juror1.address);
      expect(juror1DMCS).to.equal(ethers.parseEther("10"));

      // Juror 3 (minority voter) gets slashed 10% of their 250 locked DMCU = 25 DMCU slashed
      const juror3StakedAfter = await dmcuToken.stakedBalanceOf(juror3.address);
      expect(juror3StakedAfter).to.equal(ethers.parseEther("975")); // 1000 - 25 slashed

      const juror3LockedAfter = await dmcuToken.lockedBalanceOf(juror3.address);
      expect(juror3LockedAfter).to.equal(0); // released remaining
    });
  });
});
