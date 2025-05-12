const express = require("express");
const router = express.Router();
const candidatesController = require("./candidates.controller");
const { authenticateAdmin } = require("../middleware/auth");

router.get("/", candidatesController.getCandidates);
router.get("/position/:positionId", candidatesController.getCandidatesByPosition);
router.get("/department/:department", candidatesController.getCandidatesByDepartment);
router.post("/", authenticateAdmin, candidatesController.addCandidate);
router.put("/:id", authenticateAdmin, candidatesController.updateCandidate);
router.delete("/:id", authenticateAdmin, candidatesController.deleteCandidate);
router.put("/:id/disqualify", authenticateAdmin, candidatesController.disqualifyCandidate);

module.exports = router;