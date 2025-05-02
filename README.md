
# VoteChain - Blockchain-Based Voting DApp

VoteChain is a decentralized application that enables secure, transparent, and tamper-proof voting using blockchain technology. It features KYC verification, real-time vote tracking, and administrative capabilities for election management.

## Features

- **Blockchain-Based Voting**: Secure and transparent voting system
- **KYC Verification**: Identity verification to prevent fraud
- **Admin Dashboard**: Manage candidates, elections, and verify KYC documents
- **Real-Time Vote Tracking**: Watch votes being counted in real-time
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js v14.x or later
- npm v6.x or later
- MongoDB v4.x or later
- MetaMask browser extension

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

### 5. Seed Initial Data

```bash
# Run the seed script to populate initial candidates
node src/backend/scripts/seed-data.js
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

## Smart Contract Integration

For complete functionality, deploy the VoteChain smart contract to an Ethereum network (local, testnet, or mainnet). Update the contract address in your environment configuration.

### Required Libraries

- **Frontend**:
  - React.js
  - ethers.js
  - axios
  - tailwindcss
  - lucide-react
  - sonner (for notifications)

- **Backend**:
  - express
  - mongoose
  - multer (for file uploads)
  - cors
  - dotenv

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

## Real-World Data Integration

To use real-world data:

1. Prepare a CSV file with candidate information (name, party, image URL)
2. Create appropriate import scripts based on your data format
3. Run the import scripts to populate the MongoDB database

## License

MIT License

## Troubleshooting

- **MongoDB Connection Issues**: Ensure MongoDB is running on the specified port and that your connection string is correct.
- **MetaMask Errors**: Make sure you're connected to the correct network in MetaMask.
- **Missing Files**: The `uploads` directory in the backend is created automatically when the first KYC document is uploaded.
