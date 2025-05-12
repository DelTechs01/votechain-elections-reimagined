const express = require("express");
const router = express.Router();
const positionsController = require("./positions.controller");
const { authenticateAdmin } = require("../middleware/auth");

router.get("/", positionsController.getPositions);
router.post("/", authenticateAdmin, positionsController.addPosition);

module.exports = router;