const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/votechain";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const Position = require("../models/position.model");
const Candidate = require("../models/candidate.model");

const positions = [
  { name: "mps", electionType: "national" },
  { name: "governors", electionType: "national" },
  { name: "mcas", electionType: "national" },
  { name: "senators", electionType: "national" },
  { name: "president", electionType: "national" },
  { name: "academicRep", electionType: "institutional", department: "engineering" },
  { name: "femaleRep", electionType: "institutional", department: "engineering" },
  { name: "maleRep", electionType: "institutional", department: "engineering" },
  { name: "president", electionType: "institutional" },
  { name: "financeSecretary", electionType: "institutional" },
];

const candidates = [
  { name: "Alex Johnson", party: "Progressive", position: "mps", imageUrl: "/placeholder.svg", bio: "Experienced leader", onChainId: 1 },
  { name: "Sam Wilson", party: "Conservative", position: "mps", imageUrl: "/placeholder.svg", bio: "Community advocate", onChainId: 2 },
  { name: "Maria Rodriguez", party: "Independent", position: "engineering_academicRep", imageUrl: "/placeholder.svg", bio: "Academic excellence", onChainId: 1 },
  { name: "David Chen", party: "Independent", position: "engineering_femaleRep", imageUrl: "/placeholder.svg", bio: "Gender equality", onChainId: 1 },
  { name: "Priya Patel", party: "Independent", position: "president_institutional", imageUrl: "/placeholder.svg", bio: "Visionary leader", onChainId: 1 },
];

async function seedData() {
  try {
    await Position.deleteMany({});
    await Candidate.deleteMany({});
    console.log("Existing data cleared");
    const insertedPositions = await Position.insertMany(positions);
    console.log(`${insertedPositions.length} positions inserted`);
    const positionMap = {};
    insertedPositions.forEach((p) => {
      positionMap[p.name] = p._id;
      if (p.department) positionMap[`${p.department}_${p.name}`] = p._id;
    });
    const mappedCandidates = candidates.map((c) => ({
      ...c,
      position: positionMap[c.position] || positionMap[`${c.position}_institutional`] || positionMap[c.position],
    }));
    const insertedCandidates = await Candidate.insertMany(mappedCandidates);
    console.log(`${insertedCandidates.length} candidates inserted`);
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
}

seedData();