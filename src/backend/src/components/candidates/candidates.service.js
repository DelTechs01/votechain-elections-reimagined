const Candidate = require("../models/candidate.model");
const Position = require("../models/position.model");
const ethers = require("ethers");
const contracts = require("../contracts.json");

const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_NODE_URL);
const contractABI = [
  {
    "inputs": [],
    "name": "addCandidate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "_id","type": "uint256"}],
    "name": "getCandidate",
    "outputs": [
      {"internalType": "uint256","name": "id","type": "uint256"},
      {"internalType": "uint256","name": "voteCount","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const getCandidates = async () => {
  return await Candidate.find({ isActive: true }).populate("position");
};

const getCandidatesByPosition = async (positionId) => {
  return await Candidate.find({ position: positionId, isActive: true });
};

const getCandidatesByDepartment = async (department) => {
  const positions = await Position.find({ department, electionType: "institutional", isActive: true });
  return await Candidate.find({
    position: { $in: positions.map((p) => p._id) },
    isActive: true,
  }).populate("position");
};

const addCandidate = async ({ name, party, position, imageUrl, bio, onChainId }) => {
  const positionExists = await Position.findById(position);
  if (!positionExists) throw new Error("Invalid position ID");
  const contractKey = positionExists.department ? `${positionExists.department}_${positionExists.name}` : positionExists.name;
  const contractAddress = contracts[contractKey];
  if (!contractAddress) throw new Error("No contract for this position");
  const contract = new ethers.Contract(contractAddress, contractABI, provider);
  const candidate = await contract.getCandidate(onChainId);
  if (candidate.id.toNumber() !== onChainId) throw new Error("Candidate ID mismatch");
  const newCandidate = new Candidate({
    name,
    party: party || "Independent",
    position,
    imageUrl: imageUrl || "/placeholder.svg",
    bio,
    onChainId,
    voteCount: 0,
  });
  return await newCandidate.save();
};

const updateCandidate = async (id, { name, party, position, imageUrl, bio }) => {
  const positionExists = await Position.findById(position);
  if (!positionExists) throw new Error("Invalid position ID");
  const candidate = await Candidate.findByIdAndUpdate(
    id,
    { name, party, position, imageUrl, bio },
    { new: true }
  );
  if (!candidate) throw new Error("Candidate not found");
  return candidate;
};

const deleteCandidate = async (id) => {
  const candidate = await Candidate.findByIdAndDelete(id);
  if (!candidate) throw new Error("Candidate not found");
  return { message: "Candidate deleted" };
};

const disqualifyCandidate = async (id) => {
  const candidate = await Candidate.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!candidate) throw new Error("Candidate not found");
  return candidate;
};

module.exports = {
  getCandidates,
  getCandidatesByPosition,
  getCandidatesByDepartment,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  disqualifyCandidate,
};