const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  idPath: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  feedback: { type: String },
  merkleProof: [{ type: String }],
  department: { type: String, enum: ["engineering", "medicine", "law", "business", "arts"] },
  isFirstRoundWinner: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("KYC", kycSchema);