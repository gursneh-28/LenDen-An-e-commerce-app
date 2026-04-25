const express = require("express");
const router = express.Router();
const requestController = require("../controllers/requestController");
const verifyToken = require("../middleware/authMiddleware");

router.post("/create",       verifyToken, requestController.createRequest);
router.get("/all",           verifyToken, requestController.getRequests);
router.get("/mine",          verifyToken, requestController.getMyRequests);
router.put("/:id",           verifyToken, requestController.updateRequest);
router.patch("/:id/resolve", verifyToken, requestController.resolveRequest);
router.delete("/:id",        verifyToken, requestController.deleteRequest);

module.exports = router;