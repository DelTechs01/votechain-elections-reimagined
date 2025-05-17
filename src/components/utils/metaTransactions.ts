
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
    console.log(`Sending meta transaction to relayer: ${relayerUrl}`);
    console.log(`Transaction data:`, JSON.stringify(metaTx, null, 2));
    
    const response = await fetch(relayerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaTx),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from relayer (${response.status}):`, errorText);
      throw new Error(`Failed to execute meta transaction: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.transactionHash;
  } catch (error) {
    console.error('Error executing meta transaction:', error);
    throw error;
  }
};
