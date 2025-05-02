
# VoteChain Backend Setup

This document provides instructions for setting up and running the VoteChain backend with MongoDB integration.

## Prerequisites

- Node.js (v18.x or later)
- MongoDB (v6.x or later) - Local installation or MongoDB Atlas account
- npm or yarn

## Setup Instructions

### 1. Install MongoDB

#### Local Installation:

- **Windows**: Download and install from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
- **macOS**: Use Homebrew: `brew tap mongodb/brew && brew install mongodb-community`
- **Linux**: Follow distribution-specific instructions on the MongoDB website

After installation, start MongoDB:
- Windows: MongoDB runs as a service
- macOS/Linux: Run `mongod` in a terminal

#### MongoDB Atlas (Cloud):

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a new cluster
3. Set up a database user with read/write permissions
4. Configure network access (allow access from your IP)
5. Get your connection string

### 2. Environment Setup

Create a `.env` file in the backend directory with the following variables:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/votechain
# Or if using Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/votechain?retryWrites=true&w=majority
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Backend Server

```bash
node server.js
```

The server will run on http://localhost:5000 by default.

## Connecting Frontend to Backend

Update the frontend KYC component to use the real backend API endpoints:

1. Uncomment the fetch API calls in the KYC component
2. Replace the mock data with actual API calls

## Working with Real Data

### Importing Real Candidate Data

Create a CSV file with candidate information (example format):

```
name,party,bio,imageUrl
John Doe,Progressive Party,Experienced leader with 10 years in public service,http://example.com/john.jpg
Jane Smith,Conservative Union,Business leader and community advocate,http://example.com/jane.jpg
```

Run the data import script:

```bash
node scripts/import-candidates.js --file path/to/your/candidates.csv
```

### Viewing MongoDB Data

To view and manage your MongoDB data:

1. **MongoDB Compass**: A GUI tool for MongoDB
   - Download from [MongoDB Compass](https://www.mongodb.com/products/compass)
   - Connect using your MongoDB URI

2. **MongoDB Shell**:
   - Connect: `mongosh "mongodb://localhost:27017/votechain"`
   - List collections: `show collections`
   - Query data: `db.kycs.find()`

## API Endpoints

### KYC Management

- `POST /api/kyc/submit` - Submit a new KYC document
- `GET /api/kyc/status/:walletAddress` - Get KYC status for a wallet
- `GET /api/kyc/all` - Get all KYC submissions (admin only)
- `PUT /api/kyc/:id` - Update KYC status (admin only)

## Troubleshooting

### MongoDB Connection Issues

- Check if MongoDB is running: `ps aux | grep mongod`
- Verify your connection string in the `.env` file
- Ensure network permissions are set correctly (firewall, Atlas IP whitelist)

### File Upload Problems

- Check upload directory permissions
- Verify file size limits
- Inspect server logs for detailed error messages
