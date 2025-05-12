const Position = require("../models/position.model");

const getPositions = async () => {
  return await Position.find({ isActive: true });
};

const addPosition = async ({ name, description, electionType, department }) => {
  if (!["national", "institutional"].includes(electionType)) throw new Error("Invalid election type");
  if (electionType === "institutional" && !department) throw new Error("Department required for institutional elections");
  const newPosition = new Position({ name, description, electionType, department });
  return await newPosition.save();
};

module.exports = { getPositions, addPosition };