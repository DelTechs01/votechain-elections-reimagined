const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  party: { type: String, default: "Independent" },
  position: { type: mongoose.Schema.Types.ObjectId, ref: "Position", required: true },
  imageUrl: { type: String, default: "/placeholder.svg" },
  bio: { type: String },
  voteCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  onChainId: { type: Number, required: true },
});

module.exports = mongoose.model("Candidate", candidateSchema);