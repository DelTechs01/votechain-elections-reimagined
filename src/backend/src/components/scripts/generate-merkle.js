const mongoose = require("mongoose");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
require("dotenv").config({ path: "../.env" });

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/votechain")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

const KYC = require("../models/kyc.model");

async function generateMerkleTree() {
  try {
    const kycRecords = await KYC.find({ status: "approved" });
    const leaves = kycRecords.map((kyc) => keccak256(kyc.walletAddress));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = tree.getHexRoot();
    console.log("Merkle Root:", merkleRoot);
    for (const kyc of kycRecords) {
      const leaf = keccak256(kyc.walletAddress);
      const proof = tree.getHexProof(leaf);
      await KYC.findOneAndUpdate({ walletAddress: kyc.walletAddress }, { merkleProof: proof });
      console.log(`Updated proof for ${kyc.walletAddress}`);
    }
    console.log("Merkle tree generated and proofs updated");
    await mongoose.connection.close();
  } catch (error) {
    console.error("Error generating Merkle tree:", error);
    process.exit(1);
  }
}

generateMerkleTree();