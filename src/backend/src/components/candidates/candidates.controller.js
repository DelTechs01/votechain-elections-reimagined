const Zod = require("zod");
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
  const schema = Zod.object({
    name: Zod.string().required(),
    party: Zod.string().optional(),
    position: Zod.string().required(),
    imageUrl: Zod.string().optional(),
    bio: Zod.string().optional(),
    onChainId: Zod.number().required(),
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
  const schema = Zod.object({
    name: Zod.string().optional(),
    party: Zod.string().optional(),
    position: Zod.string().optional(),
    imageUrl: Zod.string().optional(),
    bio: Zod.string().optional(),
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