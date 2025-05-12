const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const csv = require("csv-parser");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/votechain")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

const Position = require("../models/position.model");
const Candidate = require("../models/candidate.model");

const args = process.argv.slice(2);
let filePath = "";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--file" && i + 1 < args.length) {
    filePath = args[i + 1];
    break;
  }
}
if (!filePath) {
  console.error("Please provide a CSV file path using --file option");
  process.exit(1);
}
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

console.log(`Importing candidates from: ${filePath}`);
const results = [];
fs.createReadStream(filePath)
  .pipe(csv())
  .on("data", (data) => results.push(data))
  .on("end", async () => {
    try {
      console.log(`Found ${results.length} candidates to import`);
      for (const candidate of results) {
        if (!candidate.name || !candidate.position || !candidate.onChainId) {
          console.log(`Skipping: ${candidate.name || "Unknown"} (missing required fields)`);
          continue;
        }
        const position = await Position.findOne({ name: candidate.position, department: candidate.department });
        if (!position) {
          console.log(`Skipping: ${candidate.name} (position ${candidate.position} not found)`);
          continue;
        }
        const exists = await Candidate.findOne({ name: candidate.name, position: position._id });
        if (exists) {
          console.log(`Skipping: ${candidate.name} (already exists)`);
          continue;
        }
        const newCandidate = new Candidate({
          name: candidate.name,
          party: candidate.party || "Independent",
          position: position._id,
          imageUrl: candidate.imageUrl || "/placeholder.svg",
          bio: candidate.bio || "",
          voteCount: 0,
          isActive: true,
          onChainId: parseInt(candidate.onChainId),
        });
        await newCandidate.save();
        console.log(`Imported: ${candidate.name} (${candidate.position})`);
      }
      console.log("Import completed successfully");
      process.exit(0);
    } catch (error) {
      console.error("Error importing candidates:", error);
      process.exit(1);
    }
  });