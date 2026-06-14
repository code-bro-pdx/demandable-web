const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=================================================");
  console.log("Deploying Domesticoin & DW Smart Contracts...");
  console.log("Deployer Address:", deployer.address);
  console.log("Account Balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  console.log("=================================================\n");

  // 1. Deploy DomesticoinUtility (Utility & Governance - DMCU)
  console.log("Deploying DomesticoinUtility...");
  const DomesticoinUtility = await ethers.getContractFactory("DomesticoinUtility");
  const dmcuToken = await DomesticoinUtility.deploy(deployer.address);
  await dmcuToken.waitForDeployment();
  const dmcuAddress = await dmcuToken.getAddress();
  console.log(`DomesticoinUtility deployed to: ${dmcuAddress}\n`);

  // 2. Deploy DomesticoinStable (USD Stablecoin - DMCS)
  console.log("Deploying DomesticoinStable...");
  const DomesticoinStable = await ethers.getContractFactory("DomesticoinStable");
  const dmcsToken = await DomesticoinStable.deploy(deployer.address);
  await dmcsToken.waitForDeployment();
  const dmcsAddress = await dmcsToken.getAddress();
  console.log(`DomesticoinStable deployed to: ${dmcsAddress}\n`);

  // 3. Deploy DWRegistry (Static Factual Database)
  console.log("Deploying DWRegistry...");
  const DWRegistry = await ethers.getContractFactory("DWRegistry");
  const registry = await DWRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`DWRegistry deployed to: ${registryAddress}\n`);

  // 4. Deploy DWEscrow (Escrows, Inspections, and Disputes)
  console.log("Deploying DWEscrow...");
  const DWEscrow = await ethers.getContractFactory("DWEscrow");
  const escrow = await DWEscrow.deploy(
    dmcuAddress,
    dmcsAddress,
    registryAddress,
    deployer.address
  );
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`DWEscrow deployed to: ${escrowAddress}\n`);

  // 5. Link Smart Contracts (Set Authorized Minters & Callers)
  console.log("Linking smart contracts...");
  
  // Set DWEscrow as minter on DomesticoinUtility
  const tx1 = await dmcuToken.setMinter(escrowAddress, true);
  await tx1.wait();
  console.log("- DWEscrow authorized to mint rewards on DomesticoinUtility.");

  // Set DWEscrow as authorized caller on DWRegistry
  const tx2 = await registry.setAuthorizedCaller(escrowAddress, true);
  await tx2.wait();
  console.log("- DWEscrow authorized to update contractor reputation on DWRegistry.");

  console.log("\n=================================================");
  console.log("Deployment and linking completed successfully!");
  console.log("Copy these addresses to your DApp configuration:");
  console.log(`- DomesticoinUtility (DMCU): ${dmcuAddress}`);
  console.log(`- DomesticoinStable (DMCS): ${dmcsAddress}`);
  console.log(`- DWRegistry: ${registryAddress}`);
  console.log(`- DWEscrow: ${escrowAddress}`);
  console.log("=================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
