const Joi = require("joi");
const votesService = require("./votes.service");

const castVote = async (req, res, next) => {
  const schema = Joi.object({
    from: Joi.string().required(),
    functionSignature: Joi.string().required(),
    nonce: Joi.number().required(),
    r: Joi.string().required(),
    s: Joi.string().required(),
    v: Joi.number().required(),
  });
  try {
    await schema.validateAsync(req.body);
    const result = await votesService.castVote(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getAllVotes = async (req, res, next) => {
  try {
    const result = await votesService.getAllVotes();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getVoterStatus = async (req, res, next) => {
  try {
    const result = await votesService.getVoterStatus(req.params.voterAddress);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { castVote, getAllVotes, getVoterStatus };