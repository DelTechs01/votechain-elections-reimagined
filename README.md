
# VoteChain - Blockchain-Based Voting DApp

VoteChain is a decentralized application that enables secure, transparent, and tamper-proof voting using blockchain technology. It features KYC verification, position-based voting, real-time vote tracking, and administrative capabilities for election management.

## Features

- **Position-Based Voting**: Vote for candidates in different positions (President, Senator, etc.)
- **Blockchain-Based System**: Secure and transparent voting system
- **KYC Verification**: Identity verification to prevent fraud
- **Admin Dashboard**: Manage positions, candidates, and verify KYC documents
- **Real-Time Vote Tracking**: Watch votes being counted in real-time
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

### Smart Contract (Optional)
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
```

### 5. Start the Backend Server

```bash
# From the backend directory
cd src/backend
node server.js
```

The server will start on port 5000 (or the port specified in your .env file).

### 6. Start the Frontend Development Server

In a new terminal window:

```bash
# From the project root
npm run dev
```

The frontend will start on port 3000 and open in your browser.

### 7. Connect MetaMask

- Install the MetaMask browser extension
- Create or import a wallet
- Connect to the application when prompted

## Smart Contract Integration (Optional)

For complete blockchain functionality:

1. Deploy the VoteChain smart contract to an Ethereum network (local, testnet, or mainnet)
2. Update the contract address in your environment configuration

### Simple Smart Contract Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract VoteChain {
    struct Voter {
        bool isRegistered;
        mapping(string => bool) hasVotedForPosition;
    }
    
    struct Candidate {
        uint256 id;
        string name;
        string party;
        string position;
        uint256 voteCount;
    }
    
    address public admin;
    mapping(address => Voter) public voters;
    mapping(uint256 => Candidate) public candidates;
    uint256 public candidateCount;
    
    event VoteCast(address indexed voter, uint256 candidateId, string position);
    event CandidateAdded(uint256 candidateId, string name, string position);
    event VoterRegistered(address voterAddress);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    function registerVoter(address _voterAddress) public onlyAdmin {
        voters[_voterAddress].isRegistered = true;
        emit VoterRegistered(_voterAddress);
    }
    
    function addCandidate(string memory _name, string memory _party, string memory _position) public onlyAdmin {
        candidateCount++;
        candidates[candidateCount] = Candidate(
            candidateCount,
            _name,
            _party,
            _position,
            0
        );
        emit CandidateAdded(candidateCount, _name, _position);
    }
    
    function vote(uint256 _candidateId, string memory _position) public {
        require(voters[msg.sender].isRegistered, "Voter is not registered");
        require(!voters[msg.sender].hasVotedForPosition[_position], "Voter already voted for this position");
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate ID");
        require(keccak256(abi.encodePacked(candidates[_candidateId].position)) == keccak256(abi.encodePacked(_position)), "Candidate is not running for this position");
        
        candidates[_candidateId].voteCount++;
        voters[msg.sender].hasVotedForPosition[_position] = true;
        
        emit VoteCast(msg.sender, _candidateId, _position);
    }
    
    function getVoterStatus(address _voterAddress, string memory _position) public view returns(bool, bool) {
        return (voters[_voterAddress].isRegistered, voters[_voterAddress].hasVotedForPosition[_position]);
    }
    
    function isAdmin(address _address) public view returns(bool) {
        return _address == admin;
    }
}
```

## Project Structure

```
votechain/
├── public/
├── src/
│   ├── backend/
│   │   ├── scripts/
│   │   ├── uploads/
│   │   ├── .env
│   │   └── server.js
│   ├── components/
│   ├── context/
│   ├── pages/
│   └── ...
└── package.json
```

## License

MIT License

## Troubleshooting

- **MongoDB Connection Issues**: Ensure MongoDB is running on the specified port and that your connection string is correct.
- **MetaMask Errors**: Make sure you're connected to the correct network in MetaMask.
- **Missing Files**: The `uploads` directory in the backend is created automatically when the first KYC document is uploaded.
