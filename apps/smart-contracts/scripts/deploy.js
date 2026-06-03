const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=================================================");
  console.log("Deploying Demandable Web (DW) Smart Contracts...");
  console.log("Deployer Address:", deployer.address);
  console.log("Account Balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  console.log("=================================================\n");

  // 1. Deploy DWGToken (Utility & Governance)
  console.log("Deploying DWGToken...");
  const DWGToken = await ethers.getContractFactory("DWGToken");
  const dwgToken = await DWGToken.deploy(deployer.address);
  await dwgToken.waitForDeployment();
  const dwgAddress = await dwgToken.getAddress();
  console.log(`DWGToken deployed to: ${dwgAddress}\n`);

  // 2. Deploy DWSToken (Simulated USD Stablecoin)
  console.log("Deploying DWSToken...");
  const DWSToken = await ethers.getContractFactory("DWSToken");
  const dwsToken = await DWSToken.deploy(deployer.address);
  await dwsToken.waitForDeployment();
  const dwsAddress = await dwsToken.getAddress();
  console.log(`DWSToken deployed to: ${dwsAddress}\n`);

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
    dwgAddress,
    dwsAddress,
    registryAddress,
    deployer.address
  );
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`DWEscrow deployed to: ${escrowAddress}\n`);

  // 5. Link Smart Contracts (Set Authorized Minters & Callers)
  console.log("Linking smart contracts...");
  
  // Set DWEscrow as minter on DWGToken
  const tx1 = await dwgToken.setMinter(escrowAddress, true);
  await tx1.wait();
  console.log("- DWEscrow authorized to mint rewards on DWGToken.");

  // Set DWEscrow as authorized caller on DWRegistry
  const tx2 = await registry.setAuthorizedCaller(escrowAddress, true);
  await tx2.wait();
  console.log("- DWEscrow authorized to update contractor reputation on DWRegistry.");

  console.log("\n=================================================");
  console.log("Deployment and linking completed successfully!");
  console.log("Copy these addresses to your DApp configuration:");
  console.log(`- DWGToken: ${dwgAddress}`);
  console.log(`- DWSToken: ${dwsAddress}`);
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
