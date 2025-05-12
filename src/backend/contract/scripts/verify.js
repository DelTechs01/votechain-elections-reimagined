const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const contractsPath = path.join(__dirname, "../../src/contracts.json");
  const contracts = JSON.parse(fs.readFileSync(contractsPath, "utf8"));

  const duration = 7 * 24 * 60 * 60;
  const merkleRoot = "0x0000000000000000000000000000000000000000000000000000000000000000";

  console.log("Verifying MinimalForwarder...");
  await hre.run("verify:verify", {
    address: contracts.minimalForwarder,
    constructorArguments: [],
  });

  console.log("Verifying Voting contracts...");
  const votingContracts = Object.keys(contracts).filter(key => key !== "minimalForwarder");

  for (const key of votingContracts) {
    console.log(`Verifying Voting contract for ${key} at ${contracts[key]}...`);
    await hre.run("verify:verify", {
      address: contracts[key],
      constructorArguments: [duration, merkleRoot],
    });
  }

  console.log("Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });