const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, param, validationResult } = require("express-validator");
const logger = require("winston");

// Initialize environment variables
dotenv.config();

// Configure logging
logger.configure({
  transports: [
    new logger.transports.Console(),
    new logger.transports.File({ filename: "server.log" }),
  ],
  format: logger.format.combine(
    logger.format.timestamp(),
    logger.format.json()
  ),
});

// Validate environment variables
const requiredEnvVars = ["MONGODB_URI", "PORT", "FRONTEND_URL", "ENABLE_CORS"];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  logger.error(`Missing environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Secure HTTP headers
app.use(
  cors({
    origin:
      process.env.ENABLE_CORS === "true"
        ? "*"
        : process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
  })
);

// MongoDB connection
mongoose.set("strictQuery", true);

const connectWithRetry = async () => {
  const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/votechain";
  let retries = 5;

  while (retries > 0) {
    try {
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      logger.info("MongoDB connected");
      return;
    } catch (err) {
      retries -= 1;
      logger.error(`MongoDB connection error: ${err.message}. Retries left: ${retries}`);
      if (retries === 0) {
        logger.error("MongoDB connection failed after max retries");
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

connectWithRetry();

mongoose.connection.on("error", (err) => {
  logger.error(`MongoDB connection error: ${err.message}`);
  connectWithRetry();
});

// Schemas
const kycSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  idFrontPath: { type: String, required: true },
  idBackPath: { type: String, required: true },
  profilePicturePath: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  feedback: String,
  createdAt: { type: Date, default: Date.now },
});

const positionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  isActive: { type: Boolean, default: true },
});

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  party: { type: String, default: "Independent" },
  position: { type: mongoose.Schema.Types.ObjectId, ref: "Position", required: true },
  imageUrl: { type: String, default: "/placeholder.svg" },
  voteCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  onChainId: Number,
});

const voteSchema = new mongoose.Schema({
  voterAddress: { type: String, required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
  position: { type: mongoose.Schema.Types.ObjectId, ref: "Position", required: true },
  electionId: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
  timestamp: { type: Date, default: Date.now },
  txHash: String,
});

const electionSettingsSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  resultsPublished: { type: Boolean, default: false },
  realTimeResults: { type: Boolean, default: false },
});

const electionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["upcoming", "active", "ended"],
    default: "upcoming",
  },
  candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Candidate" }],
  votersCount: { type: Number, default: 0 },
  participation: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// Models
const KYC = mongoose.model("KYC", kycSchema);
const Position = mongoose.model("Position", positionSchema);
const Candidate = mongoose.model("Candidate", candidateSchema);
const Vote = mongoose.model("Vote", voteSchema);
const ElectionSettings = mongoose.model("ElectionSettings", electionSettingsSchema);
const Election = mongoose.model("Election", electionSchema);

voteSchema.index({ voterAddress: 1, position: 1, electionId: 1 }, { unique: true });

// Multer storage for KYC documents
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `id-${uniqueSuffix}${path.extname(file.originalname)}`);
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
      cb(new Error("Invalid file type. Only JPEG, PNG, or PDF allowed."));
    }
  },
}).fields([
  { name: "idFront", maxCount: 1 },
  { name: "idBack", maxCount: 1 },
  { name: "profilePicture", maxCount: 1 },
]);

// Utility to clean up uploaded files
const cleanupFiles = async (files) => {
  if (!files) return;
  for (const field in files) {
    for (const file of files[field]) {
      try {
        await fs.unlink(file.path);
      } catch (err) {
        logger.error(`Error deleting file ${file.path}: ${err.message}`);
      }
    }
  }
};

// Middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// KYC Endpoints
app.post(
  "/api/kyc/submit",
  upload,
  [
    body("walletAddress")
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage("Valid wallet address required"),
  ],
  validate,
  async (req, res) => {
    try {
      const { walletAddress } = req.body;
      const files = req.files;

      if (!files?.idFront || !files?.idBack) {
        await cleanupFiles(files);
        return res.status(400).json({ error: "Front and back ID documents required" });
      }

      const existingKYC = await KYC.findOne({ walletAddress });
      if (existingKYC) {
        await cleanupFiles(files);
        return res.status(400).json({
          error: "KYC already submitted",
          status: existingKYC.status,
        });
      }

      const newKYC = new KYC({
        walletAddress,
        idFrontPath: files.idFront[0].path,
        idBackPath: files.idBack[0].path,
        profilePicturePath: files.profilePicture?.[0]?.path,
        status: "pending",
      });

      await newKYC.save();
      logger.info(`KYC submitted for wallet: ${walletAddress}`);
      res.status(201).json({ message: "KYC submitted", status: "pending" });
    } catch (error) {
      await cleanupFiles(req.files);
      logger.error(`KYC submission error: ${error.message}`);
      res.status(500).json({ error: "Failed to submit KYC" });
    }
  }
);

app.get(
  "/api/kyc/status/:walletAddress",
  [
    param("walletAddress")
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage("Valid wallet address required"),
  ],
  validate,
  async (req, res) => {
    try {
      const kyc = await KYC.findOne({ walletAddress: req.params.walletAddress });
      if (!kyc) return res.status(404).json({ error: "KYC not found" });
      res.json({
        status: kyc.status,
        feedback: kyc.feedback,
        submittedAt: kyc.createdAt,
      });
    } catch (error) {
      logger.error(`Fetch KYC status error: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch KYC status" });
    }
  }
);

app.get("/api/kyc/all", async (req, res) => {
  try {
    const kycSubmissions = await KYC.find().sort({ createdAt: -1 });
    res.json(kycSubmissions);
  } catch (error) {
    logger.error(`Fetch all KYC error: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch KYC submissions" });
  }
});

app.put(
  "/api/kyc/:id",
  [
    param("id").isMongoId().withMessage("Invalid KYC ID"),
    body("status")
      .isIn(["pending", "approved", "rejected"])
      .withMessage("Invalid status"),
    body("feedback").optional().isString().withMessage("Feedback must be a string"),
  ],
  validate,
  async (req, res) => {
    try {
      const { status, feedback } = req.body;
      const kyc = await KYC.findByIdAndUpdate(
        req.params.id,
        { status, feedback },
        { new: true }
      );
      if (!kyc) return res.status(404).json({ error: "KYC not found" });
      logger.info(`KYC updated: ${req.params.id}, status: ${status}`);
      res.json(kyc);
    } catch (error) {
      logger.error(`Update KYC error: ${error.message}`);
      res.status(500).json({ error: "Failed to update KYC" });
    }
  }
);

app.get(
  "/api/kyc/:id/documents",
  [param("id").isMongoId().withMessage("Invalid KYC ID")],
  validate,
  async (req, res) => {
    try {
      const kyc = await KYC.findById(req.params.id);
      if (!kyc) return res.status(404).json({ error: "KYC not found" });

      const documents = [];
      if (kyc.idFrontPath && (await fs.access(kyc.idFrontPath).then(() => true).catch(() => false))) {
        documents.push({
          type: "idFront",
          data: await fs.readFile(kyc.idFrontPath, { encoding: "base64" }),
          mimetype: kyc.idFrontPath.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        });
      }
      if (kyc.idBackPath && (await fs.access(kyc.idBackPath).then(() => true).catch(() => false))) {
        documents.push({
          type: "idBack",
          data: await fs.readFile(kyc.idBackPath, { encoding: "base64" }),
          mimetype: kyc.idBackPath.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        });
      }
      if (kyc.profilePicturePath && (await fs.access(kyc.profilePicturePath).then(() => true).catch(() => false))) {
        documents.push({
          type: "profilePicture",
          data: await fs.readFile(kyc.profilePicturePath, { encoding: "base64" }),
          mimetype: "image/jpeg",
        });
      }

      if (documents.length === 0) return res.status(404).json({ error: "No documents found" });
      res.json(documents);
    } catch (error) {
      logger.error(`Fetch KYC documents error: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch KYC documents" });
    }
  }
);

// Position Endpoints
app.get("/api/positions", async (req, res) => {
  try {
    const positions = await Position.find({ isActive: true });
    res.json(positions);
  } catch (error) {
    logger.error(`Fetch positions error: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

app.post(
  "/api/positions",
  [
    body("name").notEmpty().withMessage("Position name required"),
    body("description").optional().isString().withMessage("Description must be a string"),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, description } = req.body;
      const newPosition = new Position({ name, description });
      await newPosition.save();
      logger.info(`Position created: ${name}`);
      res.status(201).json(newPosition);
    } catch (error) {
      logger.error(`Create position error: ${error.message}`);
      res.status(500).json({ error: "Failed to add position" });
    }
  }
);

// Candidate Endpoints
app.get("/api/candidates", async (req, res) => {
  try {
    const candidates = await Candidate.find({ isActive: true }).populate("position");
    res.json(candidates);
  } catch (error) {
    logger.error(`Fetch candidates error: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});

app.get(
  "/api/candidates/position/:position",
  [param("position").isMongoId().withMessage("Invalid position ID")],
  validate,
  async (req, res) => {
    try {
      const candidates = await Candidate.find({
        position: req.params.position,
        isActive: true,
      });
      res.json(candidates);
    } catch (error) {
      logger.error(`Fetch candidates by position error: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  }
);

app.post(
  "/api/candidates",
  [
    body("name").notEmpty().withMessage("Name required"),
    body("position").isMongoId().withMessage("Invalid position ID"),
    body("party").optional().isString().withMessage("Party must be a string"),
    body("imageUrl").optional().isURL().withMessage("Invalid image URL"),
    body("onChainId").optional().isInt().withMessage("onChainId must be an integer"),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, party, position, imageUrl, onChainId } = req.body;
      if (!(await Position.findById(position))) {
        return res.status(400).json({ error: "Invalid position" });
      }
      const candidate = new Candidate({
        name,
        party: party || "Independent",
        position,
        imageUrl,
        onChainId,
      });
      await candidate.save();
      logger.info(`Candidate created: ${name}`);
      res.status(201).json(candidate);
    } catch (error) {
      logger.error(`Create candidate error: ${error.message}`);
      res.status(500).json({ error: "Failed to add candidate" });
    }
  }
);

app.put(
  "/api/candidates/:id",
  [
    param("id").isMongoId().withMessage("Invalid candidate ID"),
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("party").optional().isString().withMessage("Party must be a string"),
    body("position").optional().isMongoId().withMessage("Invalid position ID"),
    body("imageUrl").optional().isURL().withMessage("Invalid image URL"),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, party, position, imageUrl } = req.body;
      if (position && !(await Position.findById(position))) {
        return res.status(400).json({ error: "Invalid position" });
      }
      const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        { name, party, position, imageUrl },
        { new: true }
      );
      if (!candidate) return res.status(404).json({ error: "Candidate not found" });
      logger.info(`Candidate updated: ${req.params.id}`);
      res.json(candidate);
    } catch (error) {
      logger.error(`Update candidate error: ${error.message}`);
      res.status(500).json({ error: "Failed to update candidate" });
    }
  }
);

app.delete(
  "/api/candidates/:id",
  [param("id").isMongoId().withMessage("Invalid candidate ID")],
  validate,
  async (req, res) => {
    try {
      const candidate = await Candidate.findByIdAndDelete(req.params.id);
      if (!candidate) return res.status(404).json({ error: "Candidate not found" });
      logger.info(`Candidate deleted: ${req.params.id}`);
      res.json({ message: "Candidate deleted" });
    } catch (error) {
      logger.error(`Delete candidate error: ${error.message}`);
      res.status(500).json({ error: "Failed to delete candidate" });
    }
  }
);

app.put(
  "/api/candidates/:id/disqualify",
  [param("id").isMongoId().withMessage("Invalid candidate ID")],
  validate,
  async (req, res) => {
    try {
      const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );
      if (!candidate) return res.status(404).json({ error: "Candidate not found" });
      logger.info(`Candidate disqualified: ${req.params.id}`);
      res.json(candidate);
    } catch (error) {
      logger.error(`Disqualify candidate error: ${error.message}`);
      res.status(500).json({ error: "Failed to disqualify candidate" });
    }
  }
);

// Election Endpoints
app.post(
  "/api/elections",
  [
    body("title").notEmpty().withMessage("Title required"),
    body("startDate").isISO8601().withMessage("Invalid start date"),
    body("endDate").isISO8601().withMessage("Invalid end date"),
    body("candidateIds").isArray().withMessage("Candidate IDs must be an array"),
    body("candidateIds.*").isMongoId().withMessage("Invalid candidate ID"),
    body("description").optional().isString().withMessage("Description must be a string"),
  ],
  validate,
  async (req, res) => {
    try {
      const { title, description, startDate, endDate, candidateIds } = req.body;
      const candidates = await Candidate.find({ _id: { $in: candidateIds } });
      if (candidates.length !== candidateIds.length) {
        return res.status(400).json({ error: "Invalid candidate IDs" });
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        return res.status(400).json({ error: "End date must be after start date" });
      }
      const election = new Election({
        title,
        description,
        startDate: start,
        endDate: end,
        candidates: candidateIds,
        status: new Date() >= start ? "active" : "upcoming",
      });
      await election.save();
      logger.info(`Election created: ${title}`);
      res.status(201).json(election);
    } catch (error) {
      logger.error(`Create election error: ${error.message}`);
      res.status(500).json({ error: "Failed to create election" });
    }
  }
);

app.get("/api/elections", async (req, res) => {
  try {
    const elections = await Election.find().populate("candidates").lean();
    const currentDate = new Date();
    const updatedElections = elections.map((election) => ({
      ...election,
      status:
        currentDate >= new Date(election.endDate)
          ? "ended"
          : currentDate >= new Date(election.startDate)
          ? "active"
          : "upcoming",
      participantsCount: election.candidates.length,
    }));
    res.json(updatedElections);
  } catch (error) {
    logger.error(`Fetch elections error: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch elections" });
  }
});

app.get(
  "/api/elections/:id",
  [param("id").isMongoId().withMessage("Invalid election ID")],
  validate,
  async (req, res) => {
    try {
      const election = await Election.findById(req.params.id).populate("candidates").lean();
      if (!election) return res.status(404).json({ error: "Election not found" });
      const currentDate = new Date();
      const status =
        currentDate >= new Date(election.endDate)
          ? "ended"
          : currentDate >= new Date(election.startDate)
          ? "active"
          : "upcoming";
      res.json({ ...election, status, participantsCount: election.candidates.length });
    } catch (error) {
      logger.error(`Fetch election error: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch election" });
    }
  }
);

// Vote Endpoints
app.post(
  "/api/votes",
  [
    body("voterAddress")
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage("Valid wallet address required"),
    body("candidateId").isMongoId().withMessage("Invalid candidate ID"),
    body("position").isMongoId().withMessage("Invalid position ID"),
    body("electionId").isMongoId().withMessage("Invalid election ID"),
  ],
  validate,
  async (req, res) => {
    try {
      const { voterAddress, candidateId, position, electionId } = req.body;
      const election = await Election.findById(electionId);
      if (!election || election.status !== "active") {
        return res.status(400).json({ error: "Election not active" });
      }
      const kyc = await KYC.findOne({ walletAddress: voterAddress });
      if (!kyc || kyc.status !== "approved") {
        return res.status(403).json({ error: "KYC not approved" });
      }
      const candidate = await Candidate.findById(candidateId);
      if (!candidate || !election.candidates.includes(candidateId)) {
        return res.status(400).json({ error: "Invalid candidate" });
      }
      const existingVote = await Vote.findOne({ voterAddress, position, electionId });
      if (existingVote) {
        return res.status(400).json({ error: "Already voted for this position" });
      }
      const vote = new Vote({ voterAddress, candidateId, position, electionId });
      await vote.save();
      await Candidate.findByIdAndUpdate(candidateId, { $inc: { voteCount: 1 } });
      await Election.findByIdAndUpdate(electionId, { $inc: { votersCount: 1 } });
      logger.info(`Vote recorded: ${voterAddress} for candidate ${candidateId}`);
      res.status(201).json({ message: "Vote recorded" });
    } catch (error) {
      logger.error(`Record vote error: ${error.message}`);
      res.status(500).json({ error: "Failed to record vote" });
    }
  }
);

app.get(
  "/api/votes/status/:account/:electionId",
  [
    param("account")
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage("Valid wallet address required"),
    param("electionId").isMongoId().withMessage("Invalid election ID"),
  ],
  validate,
  async (req, res) => {
    try {
      const { account, electionId } = req.params;
      const election = await Election.findById(electionId).populate("candidates");
      if (!election) return res.status(404).json({ error: "Election not found" });
      const positions = [...new Set(election.candidates.map((c) => c.position.toString()))];
      const votes = await Vote.find({ voterAddress: account, electionId });
      const voteStatus = positions.map((positionId) => ({
        position:
          election.candidates.find((c) => c.position.toString() === positionId)
            ?.position?.name || positionId,
        hasVoted: votes.some((v) => v.position.toString() === positionId),
      }));
      res.json(voteStatus);
    } catch (error) {
      logger.error(`Fetch vote status error: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch vote status" });
    }
  }
);

app.get("/api/votes/all", async (req, res) => {
  try {
    const votes = await Vote.find()
      .populate("candidateId", "name party position")
      .sort({ timestamp: -1 });
    res.json(votes);
  } catch (error) {
    logger.error(`Fetch all votes error: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch votes" });
  }
});

// Election Settings Endpoints
app.post(
  "/api/election/settings",
  [
    body("startTime").isISO8601().withMessage("Invalid start time"),
    body("endTime").isISO8601().withMessage("Invalid end time"),
    body("resultsPublished").isBoolean().withMessage("resultsPublished must be a boolean"),
    body("realTimeResults").isBoolean().withMessage("realTimeResults must be a boolean"),
  ],
  validate,
  async (req, res) => {
    try {
      const { startTime, endTime, resultsPublished, realTimeResults } = req.body;
      let settings = await ElectionSettings.findOne();
      if (settings) {
        Object.assign(settings, {
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          resultsPublished,
          realTimeResults,
        });
      } else {
        settings = new ElectionSettings({
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          resultsPublished,
          realTimeResults,
        });
      }
      await settings.save();
      logger.info("Election settings updated");
      res.json(settings);
    } catch (error) {
      logger.error(`Update election settings error: ${error.message}`);
      res.status(500).json({ error: "Failed to update election settings" });
    }
  }
);

app.get("/api/election/settings", async (req, res) => {
  try {
    const settings = await ElectionSettings.findOne();
    if (!settings) return res.status(404).json({ error: "Election settings not found" });
    res.json(settings);
  } catch (error) {
    logger.error(`Fetch election settings error: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch election settings" });
  }
});

app.get(
  "/api/election/can-view-results/:voterAddress",
  [
    param("voterAddress")
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage("Valid wallet address required"),
  ],
  validate,
  async (req, res) => {
    try {
      const { voterAddress } = req.params;
      const settings = await ElectionSettings.findOne();
      if (!settings) return res.status(404).json({ error: "Election settings not found" });
      if (settings.resultsPublished || settings.realTimeResults) {
        return res.json({ canView: true });
      }
      const vote = await Vote.findOne({ voterAddress });
      res.json({ canView: !!vote });
    } catch (error) {
      logger.error(`Check result visibility error: ${error.message}`);
      res.status(500).json({ error: "Failed to check result visibility" });
    }
  }
);

// Results Endpoint
app.get(
  "/api/results/:position",
  [param("position").isMongoId().withMessage("Invalid position ID")],
  validate,
  async (req, res) => {
    try {
      const candidates = await Candidate.find({
        position: req.params.position,
        isActive: true,
      }).sort({ voteCount: -1 });
      res.json(candidates);
    } catch (error) {
      logger.error(`Fetch election results error: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch election results" });
    }
  }
);

// Health Check
app.get("/api/healthcheck", (req, res) => {
  res.json({
    status: "ok",
    dbStatus: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, "dist")));

// Catch-all route for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Centralized error handling
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  if (err.message.includes("Invalid file type")) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal server error" });
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info("Received shutdown signal. Closing connections...");
  mongoose.connection.close(() => {
    logger.info("MongoDB connection closed");
    process.exit(0);
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});