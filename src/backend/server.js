const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
  }
});

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
// Get all positions
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
// Get all candidates
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

// Add new candidate (admin only)
app.post('/api/candidates', async (req, res) => {
  try {
    const { name, party, position, imageUrl } = req.body;
    
    if (!name || !position) {
      return res.status(400).json({ message: 'Name and position are required' });
    }
    
    const newCandidate = new Candidate({
      name,
      party: party || 'Independent',
      position,
      imageUrl: imageUrl || '/placeholder.svg'
    });
    
    await newCandidate.save();
    
    res.status(201).json(newCandidate);
  } catch (error) {
    console.error('Error adding candidate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Vote API endpoints
// Cast vote for a candidate in a position
app.post('/api/votes', async (req, res) => {
  try {
    const { voterAddress, candidateId, position } = req.body;
    
    if (!voterAddress || !candidateId || !position) {
      return res.status(400).json({ message: 'Voter address, candidate ID, and position are required' });
    }
    
    // Check if voter has already voted for this position
    const existingVote = await Vote.findOne({ voterAddress, position });
    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted for this position' });
    }
    
    // Create new vote
    const newVote = new Vote({
      voterAddress,
      candidateId,
      position
    });
    
    await newVote.save();
    
    // Increment candidate vote count
    await Candidate.findByIdAndUpdate(
      candidateId,
      { $inc: { voteCount: 1 } }
    );
    
    res.status(201).json({ message: 'Vote cast successfully' });
  } catch (error) {
    console.error('Error casting vote:', error);
    if (error.code === 11000) { // Duplicate key error
      res.status(400).json({ message: 'You have already voted for this position' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
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
