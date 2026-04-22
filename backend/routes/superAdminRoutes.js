// backend/routes/superAdminRoutes.js
const express = require('express');
const superAdminController = require('../controllers/superAdminController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Check if user is super admin middleware
const requireSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Super admin access required' });
    }
    next();
};

router.use(requireSuperAdmin);

router.get('/pending-organizations', superAdminController.getPendingOrganizations);
router.get('/all-organizations', superAdminController.getAllOrganizations);
router.post('/approve-organization/:orgId', superAdminController.approveOrganization);
router.post('/reject-organization/:orgId', superAdminController.rejectOrganization);
router.post('/make-super-admin', superAdminController.makeSuperAdmin);
router.get('/organization/:orgId', superAdminController.getOrganizationDetails);

module.exports = router;