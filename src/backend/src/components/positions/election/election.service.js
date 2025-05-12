const ElectionSettings = require("../models/election.model");
const Vote = require("../models/vote.model");

const updateElectionSettings = async ({ startTime, endTime, resultsPublished, realTimeResults }) => {
  let settings = await ElectionSettings.findOne();
  if (settings) {
    settings.startTime = new Date(startTime);
    settings.endTime = new Date(endTime);
    settings.resultsPublished = resultsPublished ?? settings.resultsPublished;
    settings.realTimeResults = realTimeResults ?? settings.realTimeResults;
    await settings.save();
  } else {
    settings = new ElectionSettings({ startTime: new Date(startTime), endTime: new Date(endTime), resultsPublished, realTimeResults });
    await settings.save();
  }
  return settings;
};

const getElectionSettings = async () => {
  const settings = await ElectionSettings.findOne();
  if (!settings) throw new Error("Election settings not found");
  return settings;
};

const canViewResults = async (voterAddress) => {
  const settings = await ElectionSettings.findOne();
  if (!settings) throw new Error("Election settings not found");
  if (settings.resultsPublished || settings.realTimeResults) return { canView: true };
  const vote = await Vote.findOne({ voterAddress });
  return { canView: !!vote };
};

const getResults = async (position) => {
  const candidates = await Candidate.find({ position, isActive: true }).sort({ voteCount: -1 });
  return candidates;
};

module.exports = { updateElectionSettings, getElectionSettings, canViewResults, getResults };