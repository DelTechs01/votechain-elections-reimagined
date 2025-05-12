const mongoose = require("mongoose");

const positionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  electionType: { type: String, enum: ["national", "institutional"], required: true },
  department: { type: String, enum: ["engineering", "medicine", "law", "business", "arts"] },
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model("Position", positionSchema);