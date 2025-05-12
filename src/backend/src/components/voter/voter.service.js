const KYC = require("../models/kyc.model");
const ethers = require("ethers");

const getVoterData = async (walletAddress) => {
  const kyc = await KYC.findOne({ walletAddress });
  if (!kyc) throw new Error("Voter not found");
  return {
    kycHash: ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["address"], [walletAddress])).slice(2),
    merkleProof: kyc.merkleProof,
    verified: kyc.status === "approved",
    department: kyc.department,
    isFirstRoundWinner: kyc.isFirstRoundWinner,
  };
};

module.exports = { getVoterData };