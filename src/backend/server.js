
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

// Get all KYC submissions (admin only - would need authentication in production)
app.get('/api/kyc/all', async (req, res) => {
  try {
    const kycSubmissions = await KYC.find().sort({ createdAt: -1 });
    
    res.status(200).json(kycSubmissions);
    
  } catch (error) {
    console.error('Error fetching KYC submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update KYC status (admin only - would need authentication in production)
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
