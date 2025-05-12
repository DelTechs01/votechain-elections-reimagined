const mongoose = require("mongoose");

const electionSettingsSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  resultsPublished: { type: Boolean, default: false },
  realTimeResults: { type: Boolean, default: false },
});

module.exports = mongoose.model("ElectionSettings", electionSettingsSchema);