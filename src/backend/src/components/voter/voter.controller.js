const voterService = require("./voter.service");

const getVoterData = async (req, res, next) => {
  try {
    const result = await voterService.getVoterData(req.params.walletAddress);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { getVoterData };