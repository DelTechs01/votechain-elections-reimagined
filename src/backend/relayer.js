const ethers = require('ethers');
const mongoose = require('mongoose');
require('dotenv').config();

// Configuration
const PROVIDER_URL = process.env.PROVIDER_URL || 'https://goerli.base.org';  // Using Base Goerli testnet
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;  // Should be set in .env

// Create provider and wallet
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

// ABI for the voting contract
const contractABI = [
  "function executeMetaTransaction(address userAddress, bytes memory functionSignature, bytes32 sigR, bytes32 sigS, uint8 sigV) public returns (bytes memory)",
  "function getNonce(address user) public view returns (uint256 nonce)"
];

// Contract address
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const votingContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, relayerWallet);

// Function to verify the meta transaction signature
const verifySignature = async (metaTx) => {
  const { from, functionSignature, nonce, r, s, v } = metaTx;
  
  // Create the message hash
  const messageHash = ethers.utils.solidityKeccak256(
    ['address', 'address', 'bytes', 'uint256'],
    [from, CONTRACT_ADDRESS, functionSignature, nonce]
  );
  
  // Recover the signer address
  const messageHashBytes = ethers.utils.arrayify(messageHash);
  const recoveredAddress = ethers.utils.recoverAddress(messageHashBytes, {
    r, s, v
  });
  
  // Check if the recovered address matches the from address
  if (recoveredAddress.toLowerCase() !== from.toLowerCase()) {
    throw new Error('Signature verification failed');
  }
  
  // Check if nonce is valid
  const currentNonce = await votingContract.getNonce(from);
  if (currentNonce.toString() !== nonce.toString()) {
    throw new Error('Invalid nonce');
  }
  
  return true;
};

// Function to execute the meta transaction
const executeMetaTransaction = async (metaTx) => {
  try {
    // Verify the signature
    await verifySignature(metaTx);
    
    // Execute the meta transaction
    const tx = await votingContract.executeMetaTransaction(
      metaTx.from,
      metaTx.functionSignature,
      metaTx.r,
      metaTx.s,
      metaTx.v
    );
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    return receipt.transactionHash;
  } catch (error) {
    console.error('Error executing meta transaction:', error);
    throw error;
  }
};

module.exports = { executeMetaTransaction };