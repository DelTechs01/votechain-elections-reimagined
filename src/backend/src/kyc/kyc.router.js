const express = require("express");
const router = express.Router();
const kycController = require("./kyc.controller");
const { authenticateAdmin } = require("../middleware/auth");

router.post("/submit", kycController.submitKYC);
router.get("/status/:walletAddress", kycController.getKYCStatus);
router.get("/all", authenticateAdmin, kycController.getAllKYCs);
router.put("/:id", authenticateAdmin, kycController.updateKYC);

module.exports = router;