import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Decentralized Cab-Sharing System...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy Reputation contract
  console.log("Deploying Reputation...");
  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("✓ Reputation deployed to:", reputationAddress);

  // Deploy Deposits contract
  console.log("\nDeploying Deposits...");
  const minRiderDeposit = ethers.parseEther("0.01"); // 0.01 ETH
  const minDriverDeposit = ethers.parseEther("0.02"); // 0.02 ETH
  
  const Deposits = await ethers.getContractFactory("Deposits");
  const deposits = await Deposits.deploy(minRiderDeposit, minDriverDeposit);
  await deposits.waitForDeployment();
  const depositsAddress = await deposits.getAddress();
  console.log("✓ Deposits deployed to:", depositsAddress);

  // Deploy DPoSDelegateHub
  console.log("\nDeploying DPoSDelegateHub...");
  const minReputationThreshold = 50; // μ threshold
  
  const DPoSDelegateHub = await ethers.getContractFactory("DPoSDelegateHub");
  const dposHub = await DPoSDelegateHub.deploy(reputationAddress, minReputationThreshold);
  await dposHub.waitForDeployment();
  const dposHubAddress = await dposHub.getAddress();
  console.log("✓ DPoSDelegateHub deployed to:", dposHubAddress);

  // Deploy CabShareCore
  console.log("\nDeploying CabShareCore...");
  const CabShareCore = await ethers.getContractFactory("CabShareCore");
  const cabShareCore = await CabShareCore.deploy(
    reputationAddress,
    dposHubAddress,
    depositsAddress
  );
  await cabShareCore.waitForDeployment();
  const cabShareCoreAddress = await cabShareCore.getAddress();
  console.log("✓ CabShareCore deployed to:", cabShareCoreAddress);

  // Setup authorizations
  console.log("\n⚙️  Setting up contract authorizations...");
  
  await reputation.authorizeContract(cabShareCoreAddress);
  console.log("✓ CabShareCore authorized in Reputation");
  
  await reputation.authorizeContract(dposHubAddress);
  console.log("✓ DPoSDelegateHub authorized in Reputation");
  
  await deposits.authorizeContract(cabShareCoreAddress);
  console.log("✓ CabShareCore authorized in Deposits");
  
  await dposHub.authorizeContract(cabShareCoreAddress);
  console.log("✓ CabShareCore authorized in DPoSDelegateHub");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Reputation:       ", reputationAddress);
  console.log("Deposits:         ", depositsAddress);
  console.log("DPoSDelegateHub:  ", dposHubAddress);
  console.log("CabShareCore:     ", cabShareCoreAddress);
  console.log("=".repeat(60));

  // Save addresses to file
  const fs = require("fs");
  const addresses = {
    reputation: reputationAddress,
    deposits: depositsAddress,
    dposHub: dposHubAddress,
    cabShareCore: cabShareCoreAddress,
    network: "localhost",
    chainId: 31337,
  };

  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n✓ Addresses saved to deployments.json");

  // Create .env entries
  console.log("\n📝 Add these to your .env file:");
  console.log(`REPUTATION_ADDRESS=${reputationAddress}`);
  console.log(`DEPOSITS_ADDRESS=${depositsAddress}`);
  console.log(`DPOS_DELEGATE_HUB_ADDRESS=${dposHubAddress}`);
  console.log(`CABSHARE_CORE_ADDRESS=${cabShareCoreAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
