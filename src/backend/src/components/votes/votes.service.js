const Candidate = require("../models/candidate.model");
const Vote = require("../models/vote.model");
const KYC = require("../models/kyc.model");
const Position = require("../models/position.model");
const ElectionSettings = require("../models/election.model");
const { executeMetaTransaction } = require("../relayer/relayer.service");

const castVote = async (metaTx) => {
  const settings = await ElectionSettings.findOne();
  if (!settings || new Date() < settings.startTime || new Date() > settings.endTime) {
    throw new Error("Election not active");
  }
  const kyc = await KYC.findOne({ walletAddress: metaTx.from });
  if (!kyc || kyc.status !== "approved") throw new Error("KYC not approved");

  const candidateIdMatch = metaTx.functionSignature.match(/candidateId=(\d+)/);
  const positionMatch = metaTx.functionSignature.match(/position=([^&]+)/);
  if (!candidateIdMatch || !positionMatch) throw new Error("Invalid meta-transaction data");

  const candidateId = candidateIdMatch[1];
  const position = positionMatch[1];
  const candidate = await Candidate.findOne({ onChainId: parseInt(candidateId) });
  if (!candidate) throw new Error("Candidate not found");

  const positionData = await Position.findById(candidate.position);
  if (positionData.name !== position) throw new Error("Invalid position");
  if (positionData.electionType === "institutional" && positionData.department !== kyc.department) {
    throw new Error("Invalid department");
  }
  if (
    positionData.electionType === "institutional" &&
    ["president", "financeSecretary", "academicSecretary", "entertainmentSecretary", "welfareSecretary", "secretaryGeneral", "vicePresident"].includes(position) &&
    !kyc.isFirstRoundWinner
  ) {
    throw new Error("Not a first-round winner");
  }

  const txHash = await executeMetaTransaction(metaTx, position);
  const newVote = new Vote({
    voterAddress: metaTx.from,
    candidateId: candidate._id,
    position,
    txHash,
  });
  await newVote.save();
  await Candidate.findByIdAndUpdate(candidate._id, { $inc: { voteCount: 1 } });
  return { transactionHash: txHash, message: "Vote cast successfully" };
};

const getAllVotes = async () => {
  return await Vote.find()
    .populate("candidateId", "name party position")
    .sort({ timestamp: -1 });
};

const getVoterStatus = async (voterAddress) => {
  const votes = await Vote.find({ voterAddress });
  const positions = await Position.find({ isActive: true });
  const votedPositions = votes.map((vote) => vote.position);
  return positions.map((position) => ({
    position: position.name,
    hasVoted: votedPositions.includes(position.name),
  }));
};

module.exports = { castVote, getAllVotes, getVoterStatus };