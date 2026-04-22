const express = require('express');
const adminAuthController = require('../controllers/adminAuthController');

const router = express.Router();

router.post('/send-admin-otp', adminAuthController.sendAdminOtp);
router.post('/register-organization', adminAuthController.registerOrganization);
router.post('/admin-login', adminAuthController.adminLogin);

module.exports = router;