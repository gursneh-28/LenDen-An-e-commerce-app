const express = require("express");
const router  = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { createOrder, getMyOrders, getSellingOrders, updateStatus } = require("../controllers/orderController");

router.post("/create",       verifyToken, createOrder);
router.get("/mine",          verifyToken, getMyOrders);
router.get("/selling",       verifyToken, getSellingOrders);
router.patch("/:id/status",  verifyToken, updateStatus);

module.exports = router;