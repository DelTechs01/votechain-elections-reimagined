const Joi = require("joi");
const adminService = require("./admin.service");

const login = async (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  });
  try {
    await schema.validateAsync(req.body);
    const result = await adminService.login(req.body.username, req.body.password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { login };