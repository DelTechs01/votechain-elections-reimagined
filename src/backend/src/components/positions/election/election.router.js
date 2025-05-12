const express = require("express");
const router = express.Router();
const electionController = require("./election.controller");
const { authenticateAdmin } = require("../middleware/auth");

router.post("/settings", authenticateAdmin, electionController.updateElectionSettings);
router.get("/settings", electionController.getElectionSettings);
router.get("/can-view-results/:voterAddress", electionController.canViewResults);
router.get("/results/:position", electionController.getResults);

module.exports = router;