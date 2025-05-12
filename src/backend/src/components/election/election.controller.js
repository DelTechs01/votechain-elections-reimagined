const Joi = require("joi");
const electionService = require("./election.service");

const updateElectionSettings = async (req, res, next) => {
  const schema = Joi.object({
    startTime: Joi.date().required(),
    endTime: Joi.date().required(),
    resultsPublished: Joi.boolean().optional(),
    realTimeResults: Joi.boolean().optional(),
  });
  try {
    await schema.validateAsync(req.body);
    const result = await electionService.updateElectionSettings(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getElectionSettings = async (req, res, next) => {
  try {
    const result = await electionService.getElectionSettings();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const canViewResults = async (req, res, next) => {
  try {
    const result = await electionService.canViewResults(req.params.voterAddress);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getResults = async (req, res, next) => {
  try {
    const result = await electionService.getResults(req.params.position);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { updateElectionSettings, getElectionSettings, canViewResults, getResults };