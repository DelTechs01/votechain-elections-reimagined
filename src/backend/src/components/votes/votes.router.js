const express = require("express");
const router = express.Router();
const votesController = require("./votes.controller");
const { authenticateAdmin } = require("../middleware/auth");

router.post("/relay", votesController.castVote);
router.get("/all", authenticateAdmin, votesController.getAllVotes);
router.get("/status/:voterAddress", votesController.getVoterStatus);

module.exports = router;