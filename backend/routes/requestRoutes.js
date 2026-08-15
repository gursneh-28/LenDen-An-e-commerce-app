const express           = require("express");
const router            = express.Router();
const requestController = require("../controllers/requestController");
const verifyToken       = require("../middleware/authMiddleware");

router.post("/create",       verifyToken, requestController.createRequest);
router.get("/all",           verifyToken, requestController.getRequests);
router.get("/mine",          verifyToken, requestController.getMyRequests);
router.put("/:id",           verifyToken, requestController.updateRequest);
router.post("/:id/pay",      verifyToken, requestController.payAndResolveRequest);  // NEW
router.patch("/:id/resolve", verifyToken, requestController.resolveRequest);        // now returns 402
router.delete("/:id",        verifyToken, requestController.deleteRequest);

module.exports = router;