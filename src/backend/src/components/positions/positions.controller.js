const Joi = require("joi");
const positionsService = require("./positions.service");

const getPositions = async (req, res, next) => {
  try {
    const result = await positionsService.getPositions();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const addPosition = async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    electionType: Joi.string().valid("national", "institutional").required(),
    department: Joi.string().valid("engineering", "medicine", "law", "business", "arts").optional(),
  });
  try {
    await schema.validateAsync(req.body);
    const result = await positionsService.addPosition(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPositions, addPosition };