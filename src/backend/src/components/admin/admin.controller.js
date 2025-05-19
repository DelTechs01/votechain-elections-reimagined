import { login as _login } from "./admin.service.js";

const login = async (req, res, next) => {
  const schema = object({
    username: string().required(),
    password: string().required(),
  });
  try {
    await schema.validateAsync(req.body);
    const result = await _login(req.body.username, req.body.password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export default { login };