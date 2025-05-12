const ethers = require("ethers");
require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_NODE_URL || "https://mainnet.base.org");
const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
const contracts = require("../contracts.json");

const contractABI = [
  {
    "inputs": [
      {"internalType": "address","name": "userAddress","type": "address"},
      {"internalType": "bytes","name": "functionSignature","type": "bytes"},
      {"internalType": "bytes32","name": "sigR","type": "bytes32"},
      {"internalType": "bytes32","name": "sigS","type": "bytes32"},
      {"internalType": "uint8","name": "sigV","type": "uint8"}
    ],
    "name": "executeMetaTransaction",
    "outputs": [{"internalType": "bytes","name": "","type": "bytes"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getNonce",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "voter","type": "address"},
      {"internalType": "uint256","name": "_candidateId","type": "uint256"},
      {"internalType": "bytes32[]","name": "_merkleProof","type": "bytes32[]"}
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const verifySignature = async (metaTx, contractAddress) => {
  const { from, functionSignature, nonce, r, s, v } = metaTx;
  const contract = new ethers.Contract(contractAddress, contractABI, provider);
  const messageHash = ethers.utils.solidityKeccak256(
    ["address", "address", "bytes", "uint256"],
    [from, contractAddress, functionSignature, nonce]
  );
  const messageHashBytes = ethers.utils.arrayify(messageHash);
  const recoveredAddress = ethers.utils.recoverAddress(messageHashBytes, { r, s, v });
  if (recoveredAddress.toLowerCase() !== from.toLowerCase()) {
    throw new Error("Signature verification failed");
  }
  const currentNonce = await contract.getNonce(from);
  if (currentNonce.toString() !== nonce.toString()) {
    throw new Error("Invalid nonce");
  }
  return true;
};

const executeMetaTransaction = async (metaTx, position) => {
  const contractKey = position.includes("_") ? position : position.toLowerCase();
  const contractAddress = contracts[contractKey];
  if (!contractAddress) throw new Error("No contract for this position");
  await verifySignature(metaTx, contractAddress);
  const contract = new ethers.Contract(contractAddress, contractABI, relayerWallet);
  const tx = await contract.executeMetaTransaction(
    metaTx.from,
    metaTx.functionSignature,
    metaTx.r,
    metaTx.s,
    metaTx.v
  );
  const receipt = await tx.wait();
  return receipt.transactionHash;
};

module.exports = { executeMetaTransaction };