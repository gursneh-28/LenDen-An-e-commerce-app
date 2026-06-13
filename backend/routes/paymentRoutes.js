const express    = require('express');
const router     = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

// Both routes require a logged-in user
router.post('/create-order', verifyToken, createOrder);
router.post('/verify',       verifyToken, verifyPayment);

module.exports = router;