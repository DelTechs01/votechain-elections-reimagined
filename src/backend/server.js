const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { executeMetaTransaction } = require('./relayer');
require('dotenv').config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/votechain')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

// Create KYC model schema
const kycSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true
  },
  idPath: {
    type: String, 
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  feedback: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const KYC = mongoose.model('KYC', kycSchema);

// Create Position model schema
const positionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const Position = mongoose.model('Position', positionSchema);

// Create Candidate model schema with position field
const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  party: {
    type: String,
    default: 'Independent'
  },
  position: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: '/placeholder.svg'
  },
  voteCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  onChainId: {
    type: Number,
    required: true
  }
});

const Candidate = mongoose.model('Candidate', candidateSchema);

// Create Vote model schema to track votes by position
const voteSchema = new mongoose.Schema({
  voterAddress: {
    type: String,
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  position: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  txHash: {
    type: String
  }
});

// Add Election settings model
const electionSettingsSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  resultsPublished: {
    type: Boolean,
    default: false
  },
  realTimeResults: {
    type: Boolean,
    default: false
  }
});

const ElectionSettings = mongoose.model('ElectionSettings', electionSettingsSchema);

// Compound index to prevent multiple votes for the same position by the same voter
voteSchema.index({ voterAddress: 1, position: 1 }, { unique: true });
const Vote = mongoose.model('Vote', voteSchema);

// Configure storage for ID documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'id-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG and PDF files are allowed'));
    }
  }
});

// KYC submission endpoint
app.post('/api/kyc/submit', upload.single('idDocument'), async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress || !req.file) {
      return res.status(400).json({ message: 'Missing wallet address or ID document' });
    }
    
    // Check if KYC already exists for this wallet
    const existingKYC = await KYC.findOne({ walletAddress });
    
    if (existingKYC) {
      // Remove the uploaded file if KYC already exists
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'KYC already submitted for this wallet' });
    }
    
    // Create new KYC entry
    const newKYC = new KYC({
      walletAddress,
      idPath: req.file.path,
      status: 'pending'
    });
    
    await newKYC.save();
    
    res.status(201).json({ 
      message: 'KYC submitted successfully',
      status: 'pending'
    });
    
  } catch (error) {
    console.error('Error submitting KYC:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get KYC status endpoint
app.get('/api/kyc/status/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const kyc = await KYC.findOne({ walletAddress });
    
    if (!kyc) {
      return res.status(404).json({ message: 'No KYC found for this wallet' });
    }
    
    res.status(200).json({ 
      status: kyc.status,
      feedback: kyc.feedback,
      submittedAt: kyc.createdAt
    });
    
  } catch (error) {
    console.error('Error fetching KYC status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all KYC submissions (admin only)
app.get('/api/kyc/all', async (req, res) => {
  try {
    const kycSubmissions = await KYC.find().sort({ createdAt: -1 });
    
    res.status(200).json(kycSubmissions);
    
  } catch (error) {
    console.error('Error fetching KYC submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update KYC status (admin only)
app.put('/api/kyc/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const kyc = await KYC.findByIdAndUpdate(
      id, 
      { status, feedback },
      { new: true }
    );
    
    if (!kyc) {
      return res.status(404).json({ message: 'KYC not found' });
    }
    
    res.status(200).json(kyc);
    
  } catch (error) {
    console.error('Error updating KYC status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Position API endpoints
app.get('/api/positions', async (req, res) => {
  try {
    const positions = await Position.find({ isActive: true });
    res.status(200).json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new position (admin only)
app.post('/api/positions', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Position name is required' });
    }
    
    const newPosition = new Position({
      name,
      description
    });
    
    await newPosition.save();
    
    res.status(201).json(newPosition);
  } catch (error) {
    console.error('Error adding position:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Candidate API endpoints
app.get('/api/candidates', async (req, res) => {
  try {
    const candidates = await Candidate.find({ isActive: true });
    res.status(200).json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get candidates by position
app.get('/api/candidates/position/:position', async (req, res) => {
  try {
    const { position } = req.params;
    const candidates = await Candidate.find({ position, isActive: true });
    res.status(200).json(candidates);
  } catch (error) {
    console.error('Error fetching candidates by position:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update candidate API to track on-chain ID
app.post('/api/candidates', async (req, res) => {
  try {
    const { name, party, position, imageUrl, onChainId } = req.body;
    
    if (!name || !position || !onChainId) {
      return res.status(400).json({ message: 'Name, position, and onChainId are required' });
    }
    
    const newCandidate = new Candidate({
      name,
      party: party || 'Independent',
      position,
      imageUrl: imageUrl || '/placeholder.svg',
      isActive: true,
      onChainId
    });
    
    await newCandidate.save();
    
    res.status(201).json(newCandidate);
  } catch (error) {
    console.error('Error adding candidate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API to disqualify a candidate
app.put('/api/candidates/:id/disqualify', async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    res.status(200).json(candidate);
  } catch (error) {
    console.error('Error disqualifying candidate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Relayer endpoint for gasless voting
app.post('/api/relay/vote', async (req, res) => {
  try {
    const metaTx = req.body;
    
    // Validate the meta transaction
    if (!metaTx.from || !metaTx.functionSignature || !metaTx.nonce || !metaTx.r || !metaTx.s || metaTx.v === undefined) {
      return res.status(400).json({ message: 'Invalid meta transaction data' });
    }
    
    // Execute the meta transaction
    const txHash = await executeMetaTransaction(metaTx);
    
    // Extract the candidateId and position from the function signature
    // Note: In a production app, you'd need a proper decoder for the function signature
    // This is a simplified example
    const candidateIdMatch = metaTx.functionSignature.match(/candidateId=(\d+)/);
    const positionMatch = metaTx.functionSignature.match(/position=([^&]+)/);
    
    if (candidateIdMatch && positionMatch) {
      const candidateId = candidateIdMatch[1];
      const position = positionMatch[1];
      
      // Find the candidate in MongoDB
      const candidate = await Candidate.findOne({ onChainId: parseInt(candidateId) });
      
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
      
      // Create a vote record in MongoDB
      const newVote = new Vote({
        voterAddress: metaTx.from,
        candidateId: candidate._id,
        position: position,
        txHash: txHash
      });
      
      await newVote.save();
      
      // Increment candidate vote count in MongoDB
      await Candidate.findByIdAndUpdate(
        candidate._id,
        { $inc: { voteCount: 1 } }
      );
    }
    
    res.status(200).json({
      transactionHash: txHash,
      message: 'Vote cast successfully'
    });
  } catch (error) {
    console.error('Error processing meta transaction:', error);
    res.status(500).json({ message: 'Failed to process meta transaction' });
  }
});

// Election settings endpoints
app.post('/api/election/settings', async (req, res) => {
  try {
    const { startTime, endTime, resultsPublished, realTimeResults } = req.body;
    
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'Start time and end time are required' });
    }
    
    // Find existing settings or create new ones
    let settings = await ElectionSettings.findOne();
    
    if (settings) {
      settings.startTime = new Date(startTime);
      settings.endTime = new Date(endTime);
      if (resultsPublished !== undefined) settings.resultsPublished = resultsPublished;
      if (realTimeResults !== undefined) settings.realTimeResults = realTimeResults;
      
      await settings.save();
    } else {
      settings = new ElectionSettings({
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        resultsPublished: resultsPublished || false,
        realTimeResults: realTimeResults || false
      });
      
      await settings.save();
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error updating election settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/election/settings', async (req, res) => {
  try {
    const settings = await ElectionSettings.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: 'Election settings not found' });
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching election settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if user can view results
app.get('/api/election/can-view-results/:voterAddress', async (req, res) => {
  try {
    const { voterAddress } = req.params;
    const settings = await ElectionSettings.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: 'Election settings not found' });
    }
    
    // If results are published or real-time results are enabled, anyone can view
    if (settings.resultsPublished || settings.realTimeResults) {
      return res.status(200).json({ canView: true });
    }
    
    // Check if the voter has voted
    const vote = await Vote.findOne({ voterAddress });
    
    res.status(200).json({ canView: !!vote });
  } catch (error) {
    console.error('Error checking result visibility:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all votes (admin only)
app.get('/api/votes/all', async (req, res) => {
  try {
    const votes = await Vote.find()
      .populate('candidateId', 'name party position')
      .sort({ timestamp: -1 });
    
    res.status(200).json(votes);
  } catch (error) {
    console.error('Error fetching all votes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check voter status (if they've voted for specific positions)
app.get('/api/votes/status/:voterAddress', async (req, res) => {
  try {
    const { voterAddress } = req.params;
    
    const votes = await Vote.find({ voterAddress });
    const positions = await Position.find({ isActive: true });
    
    const votedPositions = votes.map(vote => vote.position);
    
    const voterStatus = positions.map(position => ({
      position: position.name,
      hasVoted: votedPositions.includes(position.name)
    }));
    
    res.status(200).json(voterStatus);
  } catch (error) {
    console.error('Error checking voter status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get election results (by position)
app.get('/api/results/:position', async (req, res) => {
  try {
    const { position } = req.params;
    const candidates = await Candidate.find({ position, isActive: true }).sort({ voteCount: -1 });
    
    res.status(200).json(candidates);
  } catch (error) {
    console.error('Error fetching election results:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
