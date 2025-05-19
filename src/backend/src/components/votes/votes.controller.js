const Zod = require("zod");
const votesService = require("./votes.service");

const castVote = async (req, res, next) => {
  const schema = Zod.ZodIntersection.object({
    from: Zod.string().required(),
    functionSignature: Zod.string().required(),
    nonce: Zod.number().required(),
    r: Zod.string().required(),
    s: Zod.string().required(),
    v: Zod.number().required(),
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