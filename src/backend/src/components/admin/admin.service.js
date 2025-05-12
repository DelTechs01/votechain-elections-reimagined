const jwt = require("jsonwebtoken");
require("dotenv").config();

const login = async (username, password) => {
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Invalid credentials");
  }
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  return { token };
};

module.exports = { login };