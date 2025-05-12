const Joi = require("joi");
const candidatesService = require("./candidates.service");

const getCandidates = async (req, res, next) => {
  try {
    const result = await candidatesService.getCandidates();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getCandidatesByPosition = async (req, res, next) => {
  try {
    const result = await candidatesService.getCandidatesByPosition(req.params.positionId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getCandidatesByDepartment = async (req, res, next) => {
  try {
    const result = await candidatesService.getCandidatesByDepartment(req.params.department);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const addCandidate = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    party: Joi.string().optional(),
    position: Joi.string().required(),
    imageUrl: Joi.string().optional(),
    bio: Joi.string().optional(),
    onChainId: Joi.number().required(),
  });
  try {
    await schema.validateAsync(req.body);
    const result = await candidatesService.addCandidate(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const updateCandidate = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().optional(),
    party: Joi.string().optional(),
    position: Joi.string().optional(),
    imageUrl: Joi.string().optional(),
    bio: Joi.string().optional(),
  });
  try {
    await schema.validateAsync(req.body);
    const result = await candidatesService.updateCandidate(req.params.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteCandidate = async (req, res, next) => {
  try {
    const result = await candidatesService.deleteCandidate(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const disqualifyCandidate = async (req, res, next) => {
  try {
    const result = await candidatesService.disqualifyCandidate(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCandidates,
  getCandidatesByPosition,
  getCandidatesByDepartment,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  disqualifyCandidate,
};