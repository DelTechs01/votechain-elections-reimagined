const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Election duration (e.g., 7 days)
  const electionDuration = 7 * 24 * 60 * 60; // 7 days in seconds
  // Placeholder Merkle root (update after KYC approvals)
  const initialMerkleRoot = "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Election categories and roles
  const electionContracts = {
    national: [
      "mps",
      "governors",
      "mcas",
      "senators",
      "president"
    ],
    institutionalFirstRound: [
      "engineering_academicRep",
      "engineering_femaleRep",
      "engineering_maleRep",
      "pureAppliedScience_academicRep",
      "pureAppliedScience_femaleRep",
      "pureAppliedScience_maleRep",
      "healthScience_academicRep",
      "healthScience_femaleRep",
      "healthScience_maleRep",
      "education_academicRep",
      "education_femaleRep",
      "education_maleRep",
      "business_academicRep",
      "business_femaleRep",
      "business_maleRep"
    ],
    institutionalSecondRound: [
      "president_institutional",
      "financeSecretary",
      "academicSecretary",
      "entertainmentSecretary",
      "welfareSecretary",
      "secretaryGeneral",
      "vicePresident"
    ]
  };

  // Deploy MinimalForwarder using OpenZeppelin's contract
  const MinimalForwarder = await hre.ethers.getContractFactory(
    "@openzeppelin/contracts/metatx/MinimalForwarder.sol:MinimalForwarder"
  );
  const forwarder = await MinimalForwarder.deploy();
  await forwarder.waitForDeployment();
  const forwarderAddress = await forwarder.getAddress();
  console.log("MinimalForwarder deployed to:", forwarderAddress);

  // Deploy Voting contracts
  const Voting = await hre.ethers.getContractFactory("Voting");
  const contracts = {
    minimalForwarder: forwarderAddress
  };

  // Deploy national election contracts
  for (const category of electionContracts.national) {
    try {
      const voting = await Voting.deploy(electionDuration, initialMerkleRoot);
      await voting.waitForDeployment();
      const votingAddress = await voting.getAddress();
      console.log(`${category} deployed to:`, votingAddress);
      contracts[category] = votingAddress;
    } catch (error) {
      console.error(`Failed to deploy ${category}:`, error.message);
      throw error;
    }
  }

  // Deploy institutional first-round contracts
  for (const role of electionContracts.institutionalFirstRound) {
    try {
      const voting = await Voting.deploy(electionDuration, initialMerkleRoot);
      await voting.waitForDeployment();
      const votingAddress = await voting.getAddress();
      console.log(`${role} deployed to:`, votingAddress);
      contracts[role] = votingAddress;
    } catch (error) {
      console.error(`Failed to deploy ${role}:`, error.message);
      throw error;
    }
  }

  // Deploy institutional second-round contracts
  for (const role of electionContracts.institutionalSecondRound) {
    try {
      const voting = await Voting.deploy(electionDuration, initialMerkleRoot);
      await voting.waitForDeployment();
      const votingAddress = await voting.getAddress();
      console.log(`${role} deployed to:`, votingAddress);
      contracts[role] = votingAddress;
    } catch (error) {
      console.error(`Failed to deploy ${role}:`, error.message);
      throw error;
    }
  }

  // Save contract addresses to contracts.json
  const contractsPath = path.join(__dirname, "../src/contracts.json");
  fs.writeFileSync(contractsPath, JSON.stringify(contracts, null, 2));
  console.log("Contract addresses saved to:", contractsPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });