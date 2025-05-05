
# VoteChain - Blockchain-Based Voting DApp

VoteChain is a decentralized application that enables secure, transparent, and tamper-proof voting using blockchain technology. It features KYC verification, position-based voting, real-time vote tracking, and administrative capabilities for election management.

## Features

- **Gasless Voting**: Vote without needing ETH or any tokens through meta-transactions
- **Position-Based Voting**: Vote for candidates in different positions (President, Senator, etc.)
- **Blockchain-Based System**: Secure and transparent voting system
- **KYC Verification**: Identity verification to prevent fraud
- **Admin Dashboard**: Manage positions, candidates, and verify KYC documents
- **Real-Time Vote Tracking**: Watch votes being counted in real-time
- **Configurable Result Visibility**: Admin can control who sees results and when
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js v14.x or later
- npm v6.x or later
- MongoDB v4.x or later
- MetaMask browser extension

## Required Libraries

### Frontend
- React.js & React DOM
- react-router-dom (for navigation)
- ethers.js (for blockchain interactions)
- axios (for API requests)
- framer-motion (for animations)
- tailwindcss (for styling)
- shadcn/ui components
- lucide-react (for icons)
- recharts (for data visualization)
- react-hook-form & zod (for form handling & validation)
- sonner (for notifications)

### Backend
- express (for the API server)
- mongoose (for MongoDB interactions)
- multer (for file uploads)
- cors (for handling Cross-Origin Resource Sharing)
- dotenv (for environment variables)

### Smart Contract
- Solidity
- Hardhat or Foundry (for smart contract development)
- OpenZeppelin Contracts (for standard contract implementations)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd votechain
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd src/backend
npm install
cd ../..
```

### 3. MongoDB Setup

- Install MongoDB locally or create a MongoDB Atlas account
- Create a database named `votechain`

### 4. Environment Configuration

```bash
# Copy example environment file
cd src/backend
cp .env.example .env
```

Edit the `.env` file with your MongoDB connection string and other settings:

```
MONGODB_URI=mongodb://localhost:27017/votechain
PORT=5000
JWT_SECRET=your_secret_here
PROVIDER_URL=https://goerli.base.org
RELAYER_PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=your_contract_address_here
```

### 5. Smart Contract Deployment

1. Deploy the `VoteChain.sol` contract to the Base Chain (or your preferred network)
2. Update the contract address in your `.env` file

```bash
# If using Hardhat
npx hardhat run scripts/deploy.js --network base-goerli

# If using Foundry
forge create --rpc-url https://goerli.base.org --private-key $PRIVATE_KEY src/contracts/VoteChain.sol:VoteChain
```

### 6. Start the Backend Server

```bash
# From the backend directory
cd src/backend
node server.js
```

The server will start on port 5000 (or the port specified in your .env file).

### 7. Start the Frontend Development Server

In a new terminal window:

```bash
# From the project root
npm run dev
```

The frontend will start on port 3000 and open in your browser.

### 8. Connect MetaMask

- Install the MetaMask browser extension
- Create or import a wallet
- Connect to the application when prompted

## Admin Setup

1. Deploy the contract using your admin wallet
2. The deploying address automatically becomes the admin
3. Access the admin dashboard at `/admin` with your admin wallet connected

## Gasless Transactions

VoteChain uses meta-transactions to enable voting without gas fees:

1. Users sign messages with their private key
2. Our relayer service submits the signed transaction to the blockchain
3. The relayer pays the gas fees, allowing users to vote for free

## Security Features

- KYC verification for voters prevents fraud
- Admin-only functions for critical operations
- Vote data stored immutably on-chain
- MongoDB for fast indexing and detailed analytics
- Real-time synchronization between blockchain and database

## License

MIT License

## Troubleshooting

- **MongoDB Connection Issues**: Ensure MongoDB is running on the specified port and that your connection string is correct.
- **MetaMask Errors**: Make sure you're connected to the correct network in MetaMask.
- **Missing Files**: The `uploads` directory in the backend is created automatically when the first KYC document is uploaded.
- **Relayer Errors**: Check that your relayer is properly funded with ETH to pay for gas fees.
