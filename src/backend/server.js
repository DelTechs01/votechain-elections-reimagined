const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, param, query, validationResult } = require("express-validator");
const winston = require("winston");
// const redis = require("redis");
const http = require("http");
const { Server } = require("socket.io");

// Initialize environment variables
dotenv.config();

// Configure logging
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "server.log" }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

// Validate environment variables
const requiredEnvVars = ["MONGODB_URI", "PORT", "FRONTEND_URL"];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  logger.error(`Missing environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Redis client setup
// const redisClient = redis.createClient({
//   url: process.env.REDIS_URL || "redis://localhost:6379",
// });
// let redisConnected = false;
// redisClient.on("error", (err) => {
//   logger.error(`Redis error: ${err && err.message ? err.message : JSON.stringify(err)}`);
//   // Only exit if Redis fails at startup
//   if (!redisConnected) {
//     logger.error("Failed to connect to Redis. Exiting server.");
//     process.exit(1);
//   }
//   // After startup, just log errors and continue (degraded cache)
// });
// redisClient.connect()
//   .then(() => {
//     redisConnected = true;
//     logger.info("Redis connected");
//   })
//   .catch((err) => {
//     logger.error(`Redis initial connection failed: ${err && err.message ? err.message : JSON.stringify(err)}`);
//     process.exit(1);
//   });

// Helper: Safe Redis DEL with wildcard (for cache invalidation)
// async function safeRedisDel(pattern) {
//   if (!redisConnected) return;
//   try {
//     const keys = await redisClient.keys(pattern);
//     if (keys.length > 0) await redisClient.del(keys);
//   } catch (err) {
//     logger.error(`Redis DEL error for pattern ${pattern}: ${err.message}`);
//   }
// }

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
}));

// --- CORS FIX ---
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:8080";
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, allowedOrigin);
      if (origin === allowedOrigin) return callback(null, allowedOrigin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    exposedHeaders: [
      "RateLimit-Limit",
      "RateLimit-Remaining",
      "RateLimit-Reset",
      "Retry-After",
    ],
  })
);

// Ensure CORS headers are set on all responses, including errors and rate limits
app.use((req, res, next) => {
  const origin = process.env.FRONTEND_URL || "http://localhost:8080";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Vary", "Origin");
  next();
});

app.use(express.json());

// --- RATE LIMITER ---
// For development, set a high limit. Lower for production!
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased for development
    message: (req, res) => {
      // Set CORS headers on 429 responses
      const origin = process.env.FRONTEND_URL || "http://localhost:8080";
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Vary", "Origin");
      return { success: false, error: "Too many requests" };
    },
    standardHeaders: true, // Return rate limit info in the RateLimit-* headers
    legacyHeaders: false, // Disable the X-RateLimit-* headers
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
        serverSelectionTimeoutMS: 5000,
      });
      logger.info("MongoDB connected");
      // Create indexes
      await mongoose.model("KYC").createIndexes();
      await mongoose.model("Vote").createIndexes();
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
  walletAddress: { type: String, required: true, unique: true, index: true },
  idFrontPath: { type: String, required: true },
  idBackPath: { type: String, required: true },
  profilePicturePath: String,
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Received", "NotSubmitted"],
    default: "Received",
  },
  feedback: String,
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date },
});

const positionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  isActive: { type: Boolean, default: true },
});

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  party: { type: String, default: "Independent" },
  position: { type: mongoose.Schema.Types.ObjectId, ref: "Position", required: true, index: true },
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
}, { indexes: [{ key: { voterAddress: 1, position: 1, electionId: 1 }, unique: true }] });

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

// Multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    await fs.mkdir(uploadDir, { recursive: true }).catch((err) => {
      logger.error(`Failed to create upload directory: ${err.message}`);
      cb(err);
    });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `id-${uniqueSuffix}-${safeFileName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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

// Cleanup utility
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

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

// Placeholder for authentication middleware (to be implemented based on frontend)
const authenticate = (req, res, next) => {
  // TODO: Implement JWT or other auth mechanism
  next();
};

// KYC Endpoints
app.post(
  "/api/kyc/submit",
  authenticate,
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
        return res.status(400).json({ success: false, error: "Front and back ID documents required" });
      }

      const existingKYC = await KYC.findOne({ walletAddress }).lean();
      if (existingKYC && ["Pending", "Approved", "Received"].includes(existingKYC.status)) {
        await cleanupFiles(files);
        return res.status(400).json({
          success: false,
          error: `KYC already submitted with status: ${existingKYC.status}`,
        });
      }

      const kycData = {
        walletAddress,
        idFrontPath: files.idFront[0].path,
        idBackPath: files.idBack[0].path,
        profilePicturePath: files.profilePicture?.[0]?.path,
        status: "Received",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newKYC = existingKYC
        ? await KYC.findOneAndUpdate({ walletAddress }, kycData, { new: true }).lean()
        : await new KYC(kycData).save();

      io.emit("newKycSubmission", {
        _id: newKYC._id,
        walletAddress: newKYC.walletAddress,
        status: newKYC.status,
        createdAt: newKYC.createdAt,
      });

      // await safeRedisDel('kyc:*');
      logger.info(`KYC submitted for wallet: ${walletAddress}`);
      res.status(201).json({ success: true, data: { message: "KYC submitted successfully", status: newKYC.status } });
    } catch (error) {
      await cleanupFiles(req.files);
      logger.error(`KYC submission error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to submit KYC" });
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
      const kyc = await KYC.findOne({ walletAddress: req.params.walletAddress }).lean();
      res.json({
        success: true,
        data: kyc
          ? { status: kyc.status, feedback: kyc.feedback, submittedAt: kyc.createdAt }
          : { status: "NotSubmitted", feedback: null, submittedAt: null },
      });
    } catch (error) {
      logger.error(`Fetch KYC status error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to fetch KYC status" });
    }
  }
);

app.get(
  "/api/kyc",
  authenticate,
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("sort").optional().isIn(["createdAt", "-createdAt", "status"]).withMessage("Invalid sort parameter"),
  ],
  validate,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sort = req.query.sort || "-createdAt";
      const skip = (page - 1) * limit;

      const cacheKey = `kyc:${page}:${limit}:${sort}`;
      // const cached = await redisClient.get(cacheKey);
      // if (cached) {
      //   logger.info("Serving KYC from cache");
      //   return res.json(JSON.parse(cached));
      // }

      const [kycSubmissions, total] = await Promise.all([
        KYC.find()
          .select("walletAddress status feedback createdAt updatedAt")
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        KYC.countDocuments(),
      ]);

      const response = {
        success: true,
        data: {
          kycSubmissions,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
      };

      // await redisClient.setEx(cacheKey, 30, JSON.stringify(response));
      res.json(response);
    } catch (error) {
      logger.error(`Fetch all KYC error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to fetch KYC submissions" });
    }
  }
);

app.put(
  "/api/kyc/:id",
  authenticate,
  [
    param("id").isMongoId().withMessage("Invalid KYC ID"),
    body("status")
      .isIn(["Pending", "Approved", "Rejected", "Received"])
      .withMessage("Invalid status"),
    body("feedback").optional().isString().withMessage("Feedback must be a string"),
  ],
  validate,
  async (req, res) => {
    try {
      const { status, feedback } = req.body;
      const kyc = await KYC.findByIdAndUpdate(
        req.params.id,
        { status, feedback, updatedAt: new Date() },
        { new: true }
      ).lean();
      if (!kyc) return res.status(404).json({ success: false, error: "KYC not found" });

      // await safeRedisDel('kyc:*');
      logger.info(`KYC updated: ${req.params.id}, status: ${status}`);
      res.json({ success: true, data: kyc });
    } catch (error) {
      logger.error(`Update KYC error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to update KYC" });
    }
  }
);

app.put(
  "/api/kyc/bulk",
  authenticate,
  [
    body("ids").isArray().withMessage("IDs must be an array"),
    body("ids.*").isMongoId().withMessage("Invalid KYC ID"),
    body("status")
      .isIn(["Pending", "Approved", "Rejected", "Received"])
      .withMessage("Invalid status"),
    body("feedback").optional().isString().withMessage("Feedback must be a string"),
  ],
  validate,
  async (req, res) => {
    try {
      const { ids, status, feedback } = req.body;
      const result = await KYC.updateMany(
        { _id: { $in: ids } },
        { status, feedback, updatedAt: new Date() }
      );

      // await safeRedisDel('kyc:*');
      logger.info(`Bulk updated ${result.modifiedCount} KYC submissions to ${status}`);
      res.json({ success: true, data: { message: `Updated ${result.modifiedCount} KYC submissions` } });
    } catch (error) {
      logger.error(`Bulk update KYC error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to update KYC submissions" });
    }
  }
);

app.get(
  "/api/kyc/:id/documents",
  authenticate,
  [param("id").isMongoId().withMessage("Invalid KYC ID")],
  validate,
  async (req, res) => {
    try {
      const kyc = await KYC.findById(req.params.id).lean();
      if (!kyc) return res.status(404).json({ success: false, error: "KYC not found" });

      const documents = [];
      const addDocument = async (type, filePath) => {
        if (filePath && (await fs.access(filePath).then(() => true).catch(() => false))) {
          documents.push({
            type,
            data: await fs.readFile(filePath, { encoding: "base64" }),
            mimetype: filePath.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
          });
        }
      };

      await Promise.all([
        addDocument("idFront", kyc.idFrontPath),
        addDocument("idBack", kyc.idBackPath),
        addDocument("profilePicture", kyc.profilePicturePath),
      ]);

      if (documents.length === 0) return res.status(404).json({ success: false, error: "No documents found" });
      res.json({ success: true, data: documents });
    } catch (error) {
      logger.error(`Fetch KYC documents error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to fetch KYC documents" });
    }
  }
);

// Position Endpoints
app.get(
  "/api/positions",
  [
    query("fields").optional().isString().withMessage("Fields must be a string"),
  ],
  validate,
  async (req, res) => {
    try {
      const fields = req.query.fields ? req.query.fields.split(",") : null;
      const positions = await Position.find({ isActive: true }).select(fields).lean();
      res.json({ success: true, data: positions });
    } catch (error) {
      logger.error(`Fetch positions error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to fetch positions" });
    }
  }
);

app.post(
  "/api/positions",
  authenticate,
  [
    body("name").notEmpty().withMessage("Position name required"),
    body("description").optional().isString().withMessage("Description must be a string"),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, description } = req.body;
      const existingPosition = await Position.findOne({ name }).lean();
      if (existingPosition) {
        return res.status(400).json({ success: false, error: "Position name already exists" });
      }
      const newPosition = await new Position({ name, description }).save();
      logger.info(`Position created: ${name}`);
      res.status(201).json({ success: true, data: newPosition });
    } catch (error) {
      logger.error(`Create position error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to add position" });
    }
  }
);

// Candidate Endpoints
app.get(
  "/api/candidates",
  [
    query("fields").optional().isString().withMessage("Fields must be a string"),
  ],
  validate,
  async (req, res) => {
    try {
      const fields = req.query.fields ? req.query.fields.split(",") : null;
      const candidates = await Candidate.find({ isActive: true })
        .populate("position")
        .select(fields)
        .lean();
      res.json({ success: true, data: candidates });
    } catch (error) {
      logger.error(`Fetch candidates error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to fetch candidates" });
    }
  }
);

app.get(
  "/api/candidates/position/:position",
  [param("position").isMongoId().withMessage("Invalid position ID")],
  validate,
  async (req, res) => {
    try {
      const candidates = await Candidate.find({
        position: req.params.position,
        isActive: true,
      }).lean();
      res.json({ success: true, data: candidates });
    } catch (error) {
      logger.error(`Fetch candidates by position error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to fetch candidates" });
    }
  }
);

app.post(
  "/api/candidates",
  authenticate,
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
      if (!(await Position.findById(position).lean())) {
        return res.status(400).json({ success: false, error: "Invalid position" });
      }
      const candidate = await new Candidate({
        name,
        party: party || "Independent",
        position,
        imageUrl,
        onChainId,
      }).save();
      logger.info(`Candidate created: ${name}`);
      res.status(201).json({ success: true, data: candidate });
    } catch (error) {
      logger.error(`Create candidate error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to add candidate" });
    }
  }
);

app.put(
  "/api/candidates/:id",
  authenticate,
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
      if (position && !(await Position.findById(position).lean())) {
        return res.status(400).json({ success: false, error: "Invalid position" });
      }
      const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        { name, party, position, imageUrl },
        { new: true }
      ).lean();
      if (!candidate) return res.status(404).json({ success: false, error: "Candidate not found" });
      logger.info(`Candidate updated: ${req.params.id}`);
      res.json({ success: true, data: candidate });
    } catch (error) {
      logger.error(`Update candidate error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to update candidate" });
    }
  }
);

app.delete(
  "/api/candidates/:id",
  authenticate,
  [param("id").isMongoId().withMessage("Invalid candidate ID")],
  validate,
  async (req, res) => {
    try {
      const candidate = await Candidate.findByIdAndDelete(req.params.id).lean();
      if (!candidate) return res.status(404).json({ success: false, error: "Candidate not found" });
      logger.info(`Candidate deleted: ${req.params.id}`);
      res.json({ success: true, data: { message: "Candidate deleted" } });
    } catch (error) {
      logger.error(`Delete candidate error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to delete candidate" });
    }
  }
);

app.put(
  "/api/candidates/:id/disqualify",
  authenticate,
  [param("id").isMongoId().withMessage("Invalid candidate ID")],
  validate,
  async (req, res) => {
    try {
      const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      ).lean();
      if (!candidate) return res.status(404).json({ success: false, error: "Candidate not found" });
      logger.info(`Candidate disqualified: ${req.params.id}`);
      res.json({ success: true, data: candidate });
    } catch (error) {
      logger.error(`Disqualify candidate error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to disqualify candidate" });
    }
  }
);

// Election Endpoints
app.post(
  "/api/elections",
  authenticate,
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
      const candidates = await Candidate.find({ _id: { $in: candidateIds } }).lean();
      if (candidates.length !== candidateIds.length) {
        return res.status(400).json({ success: false, error: "Invalid candidate IDs" });
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        return res.status(400).json({ success: false, error: "End date must be after start date" });
      }
      const election = await new Election({
        title,
        description,
        startDate: start,
        endDate: end,
        candidates: candidateIds,
        status: new Date() >= start ? "active" : "upcoming",
      }).save();
      logger.info(`Election created: ${title}`);
      res.status(201).json({ success: true, data: election });
    } catch (error) {
      logger.error(`Create election error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to create election" });
    }
  }
);

app.get(
  "/api/elections",
  [
    query("fields").optional().isString().withMessage("Fields must be a string"),
  ],
  validate,
  async (req, res) => {
    try {
      const fields = req.query.fields ? req.query.fields.split(",") : null;
      const elections = await Election.find()
        .populate("candidates")
        .select(fields)
        .lean();
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
      res.json({ success: true, data: updatedElections });
    } catch (error) {
      logger.error(`Fetch elections error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to fetch elections" });
    }
  }
);

app.get(
  "/api/elections/:id",
  [param("id").isMongoId().withMessage("Invalid election ID")],
  validate,
  async (req, res) => {
    try {
      const election = await Election.findById(req.params.id).populate("candidates").lean();
      if (!election) return res.status(404).json({ success: false, error: "Election not found" });
      const currentDate = new Date();
      const status =
        currentDate >= new Date(election.endDate)
          ? "ended"
          : currentDate >= new Date(election.startDate)
          ? "active"
          : "upcoming";
      res.json({ success: true, data: { ...election, status, participantsCount: election.candidates.length } });
    } catch (error) {
      logger.error(`Fetch election error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to fetch election" });
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
      const election = await Election.findById(electionId).lean();
      if (!election || election.status !== "active") {
        return res.status(400).json({ success: false, error: "Election not active" });
      }
      const kyc = await KYC.findOne({ walletAddress: voterAddress }).lean();
      if (!kyc || kyc.status !== "Approved") {
        return res.status(403).json({ success: false, error: "KYC not approved" });
      }
      const candidate = await Candidate.findById(candidateId).lean();
      if (!candidate || !election.candidates.includes(candidateId)) {
        return res.status(400).json({ success: false, error: "Invalid candidate" });
      }
      const existingVote = await Vote.findOne({ voterAddress, position, electionId }).lean();
      if (existingVote) {
        return res.status(400).json({ success: false, error: "Already voted for this position" });
      }
      const vote = await new Vote({ voterAddress, candidateId, position, electionId }).save();
      await Promise.all([
        Candidate.findByIdAndUpdate(candidateId, { $inc: { voteCount: 1 } }),
        Election.findByIdAndUpdate(electionId, { $inc: { votersCount: 1 } }),
      ]);
      logger.info(`Vote recorded: ${voterAddress} for candidate ${candidateId}`);
      res.status(201).json({ success: true, data: { message: "Vote recorded" } });
    } catch (error) {
      logger.error(`Record vote error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to record vote" });
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
      const election = await Election.findById(electionId).populate("candidates").lean();
      if (!election) return res.status(404).json({ success: false, error: "Election not found" });
      const positions = [...new Set(election.candidates.map((c) => c.position.toString()))];
      const votes = await Vote.find({ voterAddress: account, electionId }).lean();
      const voteStatus = positions.map((positionId) => ({
        position:
          election.candidates.find((c) => c.position.toString() === positionId)?.position?.name ||
          positionId,
        hasVoted: votes.some((v) => v.position.toString() === positionId),
      }));
      res.json({ success: true, data: voteStatus });
    } catch (error) {
      logger.error(`Fetch vote status error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to fetch vote status" });
    }
  }
);

app.get(
  "/api/votes/all",
  authenticate,
  async (req, res) => {
    try {
      const votes = await Vote.find()
        .populate("candidateId", "name party position")
        .sort({ timestamp: -1 })
        .lean();
      res.json({ success: true, data: votes });
    } catch (error) {
      logger.error(`Fetch all votes error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to fetch votes" });
    }
  }
);

// Election Settings Endpoints
app.post(
  "/api/election/settings",
  authenticate,
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
      let settings = await ElectionSettings.findOne().lean();
      if (settings) {
        settings = await ElectionSettings.findOneAndUpdate(
          {},
          {
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            resultsPublished,
            realTimeResults,
          },
          { new: true }
        ).lean();
      } else {
        settings = await new ElectionSettings({
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          resultsPublished,
          realTimeResults,
        }).save();
      }
      logger.info("Election settings updated");
      res.json({ success: true, data: settings });
    } catch (error) {
      logger.error(`Update election settings error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to update election settings" });
    }
  }
);

app.get("/api/election/settings", async (req, res) => {
  try {
    const settings = await ElectionSettings.findOne().lean();
    if (!settings) return res.status(404).json({ success: false, error: "Election settings not found" });
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error(`Fetch election settings error: ${error.message}`);
    res.status(500).json({ success: false, error: "Failed to fetch election settings" });
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
      const settings = await ElectionSettings.findOne().lean();
      if (!settings) return res.status(404).json({ success: false, error: "Election settings not found" });
      if (settings.resultsPublished || settings.realTimeResults) {
        return res.json({ success: true, data: { canView: true } });
      }
      const vote = await Vote.findOne({ voterAddress }).lean();
      res.json({ success: true, data: { canView: !!vote } });
    } catch (error) {
      logger.error(`Check result visibility error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to check result visibility" });
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
      })
        .sort({ voteCount: -1 })
        .lean();
      res.json({ success: true, data: candidates });
    } catch (error) {
      logger.error(`Fetch election results error: ${error.message}`);
      res.status(500).json({ success: false, error: "Failed to fetch election results" });
    }
  }
);

// Health Check
app.get("/api/healthcheck", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      dbStatus: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      redisStatus: redisClient.isOpen ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    },
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
    return res.status(400).json({ success: false, error: err.message });
  }
  res.status(500).json({ success: false, error: "Internal server error" });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info("Received shutdown signal. Closing connections...");
  try {
    await redisClient.quit();
    await mongoose.connection.close();
    logger.info("MongoDB and Redis connections closed");
    process.exit(0);
  } catch (err) {
    logger.error(`Shutdown error: ${err.message}`);
    process.exit(1);
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});