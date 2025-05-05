
import { ethers } from 'ethers';

// Types for meta transactions
interface MetaTransaction {
  from: string;
  to: string;
  functionSignature: string;
  nonce: number;
  r: string;
  s: string;
  v: number;
}

// Function to create a meta transaction
export const createMetaTransaction = async (
  signer: ethers.Signer,
  to: string,
  data: string,
  nonce: number
): Promise<MetaTransaction> => {
  // Get the wallet address
  const from = await signer.getAddress();
  
  // Create the message for signing
  const messageHash = ethers.utils.solidityKeccak256(
    ['address', 'address', 'bytes', 'uint256'],
    [from, to, data, nonce]
  );
  
  // Sign the message
  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
  
  // Split the signature
  const sig = ethers.utils.splitSignature(signature);
  
  return {
    from,
    to,
    functionSignature: data,
    nonce,
    r: sig.r,
    s: sig.s,
    v: sig.v
  };
};

// Function to execute a meta transaction through a relayer
export const executeMetaTransaction = async (
  metaTx: MetaTransaction,
  relayerUrl: string
): Promise<string> => {
  try {
    const response = await fetch(relayerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaTx),
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to execute meta transaction');
    }
    
    return data.transactionHash;
  } catch (error) {
    console.error('Error executing meta transaction:', error);
    throw error;
  }
};
