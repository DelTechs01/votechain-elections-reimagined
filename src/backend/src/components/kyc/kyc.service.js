const cloudinary = require("cloudinary").v2;
const path = require("path");
const KYC = require("../models/kyc.model");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const submitKYC = async (walletAddress, department, file) => {
  if (!["engineering", "medicine", "law", "business", "arts", null].includes(department)) {
    throw new Error("Invalid department");
  }
  const existingKYC = await KYC.findOne({ walletAddress });
  if (existingKYC) throw new Error("KYC already submitted");
  
  const fileName = `kyc/${walletAddress}-${Date.now()}${path.extname(file.originalname)}`;
  const result = await cloudinary.uploader.upload_stream(
    {
      folder: "kyc",
      public_id: fileName,
      resource_type: "auto",
    },
    async (error, uploadResult) => {
      if (error) throw new Error(`Cloudinary upload failed: ${error.message}`);
      return uploadResult;
    }
  ).end(file.buffer);

  const newKYC = new KYC({
    walletAddress,
    idPath: result.secure_url,
    status: "pending",
    department,
  });
  await newKYC.save();
  return { message: "KYC submitted successfully", status: "pending" };
};

const getKYCStatus = async (walletAddress) => {
  const kyc = await KYC.findOne({ walletAddress });
  if (!kyc) throw new Error("No KYC found");
  return {
    status: kyc.status,
    feedback: kyc.feedback,
    department: kyc.department,
    isFirstRoundWinner: kyc.isFirstRoundWinner,
    submittedAt: kyc.createdAt,
  };
};

const getAllKYCs = async () => {
  return await KYC.find().sort({ createdAt: -1 });
};

const updateKYC = async (id, { status, feedback, isFirstRoundWinner }) => {
  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Invalid status");
  }
  const kyc = await KYC.findByIdAndUpdate(id, { status, feedback, isFirstRoundWinner }, { new: true });
  if (!kyc) throw new Error("KYC not found");
  return kyc;
};

module.exports = { submitKYC, getKYCStatus, getAllKYCs, updateKYC };