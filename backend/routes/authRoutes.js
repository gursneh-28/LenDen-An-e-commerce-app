const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Send OTP to email (validates domain first)
router.post('/send-otp', authController.sendOtp);

// Verify OTP + create account
router.post('/verify-otp', authController.verifyOtpAndSignup);

// Login
router.post('/login', authController.login);

module.exports = router;