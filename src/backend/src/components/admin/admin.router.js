const express = require("express");
const router = express.Router();
const adminController = require("./admin.controller").default;

router.post("/login", adminController.login);

module.exports = router;