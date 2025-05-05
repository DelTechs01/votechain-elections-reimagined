const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { executeMetaTransaction } = require("./relayer");
require("dotenv").config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.ENABLE_CORS === 'true' ? '*' : process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

<<<<<<< HEAD
// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/votechain")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));
=======
// Improved MongoDB connection with retry logic
const connectWithRetry = () => {
  console.log('MongoDB connection with retry');
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/votechain';
  
  mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log(`Using database: ${mongoURI}`);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  });
};

// Initial connection attempt
connectWithRetry();

// Monitor connection for errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  setTimeout(connectWithRetry, 5000);
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
  });
});
>>>>>>> bbd201934e532daf4c7d163f05ec29686d4a6f06

// Schemas
const kycSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  idPath: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  feedback: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const positionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
});

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  party: { type: String, default: "Independent" },
  position: { type: mongoose.Schema.Types.ObjectId, ref: "Position", required: true },
  imageUrl: { type: String, default: "/placeholder.svg" },
  voteCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  onChainId: { type: Number }, // Optional to align with frontend
});

const voteSchema = new mongoose.Schema({
  voterAddress: { type: String, required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
  position: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  txHash: { type: String },
});

const electionSettingsSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  resultsPublished: { type: Boolean, default: false },
  realTimeResults: { type: Boolean, default: false },
});

// Models
const KYC = mongoose.model("KYC", kycSchema);
const Position = mongoose.model("Position", positionSchema);
const Candidate = mongoose.model("Candidate", candidateSchema);
const Vote = mongoose.model("Vote", voteSchema);
const ElectionSettings = mongoose.model("ElectionSettings", electionSettingsSchema);

// Compound index for votes
voteSchema.index({ voterAddress: 1, position: 1 }, { unique: true });

// Multer storage for KYC documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "Uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "id-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and PDF files are allowed"));
    }
  },
});

// KYC Endpoints
app.post("/api/kyc/submit", upload.single("idDocument"), async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !req.file) {
      return res.status(400).json({ error: "Missing wallet address or ID document" });
    }
    const existingKYC = await KYC.findOne({ walletAddress });
    if (existingKYC) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "KYC already submitted for this wallet" });
    }
    const newKYC = new KYC({
      walletAddress,
      idPath: req.file.path,
      status: "pending",
    });
    await newKYC.save();
    res.status(201).json({ message: "KYC submitted successfully", status: "pending" });
  } catch (error) {
    console.error("Error submitting KYC:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/kyc/status/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const kyc = await KYC.findOne({ walletAddress });
    if (!kyc) {
      return res.status(404).json({ error: "No KYC found for this wallet" });
    }
    res.status(200).json({
      status: kyc.status,
      feedback: kyc.feedback,
      submittedAt: kyc.createdAt,
    });
  } catch (error) {
    console.error("Error fetching KYC status:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/kyc/all", async (req, res) => {
  try {
    const kycSubmissions = await KYC.find().sort({ createdAt: -1 });
    res.status(200).json(kycSubmissions);
  } catch (error) {
    console.error("Error fetching KYC submissions:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/kyc/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const kyc = await KYC.findByIdAndUpdate(id, { status, feedback }, { new: true });
    if (!kyc) {
      return res.status(404).json({ error: "KYC not found" });
    }
    res.status(200).json(kyc);
  } catch (error) {
    console.error("Error updating KYC status:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/kyc/:id/document", async (req, res) => {
  try {
    const { id } = req.params;
    const kyc = await KYC.findById(id);
    if (!kyc || !kyc.idPath) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.sendFile(path.resolve(kyc.idPath));
  } catch (error) {
    console.error("Error fetching KYC document:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Position Endpoints
app.get("/api/positions", async (req, res) => {
  try {
    const positions = await Position.find({ isActive: true });
    res.status(200).json(positions);
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/positions", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Position name is required" });
    }
    const newPosition = new Position({ name, description });
    await newPosition.save();
    res.status(201).json(newPosition);
  } catch (error) {
    console.error("Error adding position:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Candidate Endpoints
app.get("/api/candidates", async (req, res) => {
  try {
    const candidates = await Candidate.find({ isActive: true });
    res.status(200).json(candidates);
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});

app.get("/api/candidates/position/:position", async (req, res) => {
  try {
    const { position } = req.params;
    const candidates = await Candidate.find({ position, isActive: true });
    res.status(200).json(candidates);
  } catch (error) {
    console.error("Error fetching candidates by position:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/candidates", async (req, res) => {
  try {
    const { name, party, position, imageUrl, onChainId } = req.body;
    if (!name || !position) {
      return res.status(400).json({ error: "Name and position are required" });
    }
    const positionExists = await Position.findById(position);
    if (!positionExists) {
      return res.status(400).json({ error: "Invalid position ID" });
    }
    const candidate = new Candidate({
      name,
      party: party || "Independent",
      position,
      imageUrl: imageUrl || "/placeholder.svg",
      voteCount: 0,
      onChainId,
    });
    await candidate.save();
    res.status(201).json(candidate);
  } catch (error) {
    console.error("Error adding candidate:", error);
    res.status(500).json({ error: "Failed to add candidate" });
  }
});

app.put("/api/candidates/:id", async (req, res) => {
  try {
    const { name, party, position, imageUrl } = req.body;
    const positionExists = await Position.findById(position);
    if (!positionExists) {
      return res.status(400).json({ error: "Invalid position ID" });
    }
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { name, party, position, imageUrl },
      { new: true }
    );
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    res.json(candidate);
  } catch (error) {
    console.error("Error updating candidate:", error);
    res.status(500).json({ error: "Failed to update candidate" });
  }
});

app.delete("/api/candidates/:id", async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    res.json({ message: "Candidate deleted" });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    res.status(500).json({ error: "Failed to delete candidate" });
  }
});

app.put("/api/candidates/:id/disqualify", async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    res.status(200).json(candidate);
  } catch (error) {
    console.error("Error disqualifying candidate:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Vote Endpoints
app.post("/api/relay/vote", async (req, res) => {
  try {
    const metaTx = req.body;
    if (
      !metaTx.from ||
      !metaTx.functionSignature ||
      !metaTx.nonce ||
      !metaTx.r ||
      !metaTx.s ||
      metaTx.v === undefined
    ) {
      return res.status(400).json({ error: "Invalid meta transaction data" });
    }
    const txHash = await executeMetaTransaction(metaTx);
    const candidateIdMatch = metaTx.functionSignature.match(/candidateId=(\d+)/);
    const positionMatch = metaTx.functionSignature.match(/position=([^&]+)/);
    if (candidateIdMatch && positionMatch) {
      const candidateId = candidateIdMatch[1];
      const position = positionMatch[1];
      const candidate = await Candidate.findOne({ onChainId: parseInt(candidateId) });
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      const newVote = new Vote({
        voterAddress: metaTx.from,
        candidateId: candidate._id,
        position,
        txHash,
      });
      await newVote.save();
      await Candidate.findByIdAndUpdate(candidate._id, { $inc: { voteCount: 1 } });
    }
    res.status(200).json({ transactionHash: txHash, message: "Vote cast successfully" });
  } catch (error) {
    console.error("Error processing meta transaction:", error);
    res.status(500).json({ error: "Failed to process meta transaction" });
  }
});

app.get("/api/votes/all", async (req, res) => {
  try {
    const votes = await Vote.find()
      .populate("candidateId", "name party position")
      .sort({ timestamp: -1 });
    res.status(200).json(votes);
  } catch (error) {
    console.error("Error fetching all votes:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/votes/status/:voterAddress", async (req, res) => {
  try {
    const { voterAddress } = req.params;
    const votes = await Vote.find({ voterAddress });
    const positions = await Position.find({ isActive: true });
    const votedPositions = votes.map((vote) => vote.position);
    const voterStatus = positions.map((position) => ({
      position: position.name,
      hasVoted: votedPositions.includes(position.name),
    }));
    res.status(200).json(voterStatus);
  } catch (error) {
    console.error("Error checking voter status:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Election Settings Endpoints
app.post("/api/election/settings", async (req, res) => {
  try {
    const { startTime, endTime, resultsPublished, realTimeResults } = req.body;
    if (!startTime || !endTime) {
      return res.status(400).json({ error: "Start time and end time are required" });
    }
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
        realTimeResults: realTimeResults || false,
      });
      await settings.save();
    }
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error updating election settings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/election/settings", async (req, res) => {
  try {
    const settings = await ElectionSettings.findOne();
    if (!settings) {
      return res.status(404).json({ error: "Election settings not found" });
    }
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error fetching election settings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/election/can-view-results/:voterAddress", async (req, res) => {
  try {
    const { voterAddress } = req.params;
    const settings = await ElectionSettings.findOne();
    if (!settings) {
      return res.status(404).json({ error: "Election settings not found" });
    }
    if (settings.resultsPublished || settings.realTimeResults) {
      return res.status(200).json({ canView: true });
    }
    const vote = await Vote.findOne({ voterAddress });
    res.status(200).json({ canView: !!vote });
  } catch (error) {
    console.error("Error checking result visibility:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Results Endpoint
app.get("/api/results/:position", async (req, res) => {
  try {
    const { position } = req.params;
    const candidates = await Candidate.find({ position, isActive: true }).sort({ voteCount: -1 });
    res.status(200).json(candidates);
  } catch (error) {
    console.error("Error fetching election results:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Health check endpoint
app.get('/api/healthcheck', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
<<<<<<< HEAD
});
=======
  console.log(`API URL: http://localhost:${PORT}/api`);
});
>>>>>>> bbd201934e532daf4c7d163f05ec29686d4a6f06
