const mongoose = require("mongoose");

const positionSchema = new mongoose.Schema({
  name: { type: String, required: true},
  description: { type: String },
  electionType: { type: String, enum: ["national", "institutional"], required: true },
  department: { type: String, enum: ["engineering", "medicine", "law", "business", "arts"] },
  isActive: { type: Boolean, default: true },
});

positionSchema.index({ name: 1, electionType: 1 }, { unique: true });

module.exports = mongoose.model("Position", positionSchema);