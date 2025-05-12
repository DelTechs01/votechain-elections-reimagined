const express = require("express");
const router = express.Router();
const voterController = require("./voter.controller");

router.get("/:walletAddress", voterController.getVoterData);

module.exports = router;