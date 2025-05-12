const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema({
  voterAddress: { type: String, required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
  position: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  txHash: { type: String, required: true },
});

voteSchema.index({ voterAddress: 1, position: 1 }, { unique: true });

module.exports = mongoose.model("Vote", voteSchema);