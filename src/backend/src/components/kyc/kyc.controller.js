const Joi = require("zod");
const kycService = require("./kyc.service");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, and PDF files are allowed"));
  },
});

const submitKYC = [
  upload.single("idDocument"),
  async (req, res, next) => {
    const schema = Joi.object({
      walletAddress: Joi.string().required(),
      department: Joi.string().valid("engineering", "medicine", "law", "business", "arts").optional(),
    });
    try {
      await schema.validateAsync(req.body);
      if (!req.file) throw new Error("ID document required");
      const result = await kycService.submitKYC(req.body.walletAddress, req.body.department, req.file);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
];

const getKYCStatus = async (req, res, next) => {
  try {
    const result = await kycService.getKYCStatus(req.params.walletAddress);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getAllKYCs = async (req, res, next) => {
  try {
    const result = await kycService.getAllKYCs();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const updateKYC = async (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string().valid("pending", "approved", "rejected").required(),
    feedback: Joi.string().optional(),
    isFirstRoundWinner: Joi.boolean().optional(),
  });
  try {
    await schema.validateAsync(req.body);
    const result = await kycService.updateKYC(req.params.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { submitKYC, getKYCStatus, getAllKYCs, updateKYC };