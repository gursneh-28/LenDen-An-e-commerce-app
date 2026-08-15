// backend/routes/adminRoutes.js
const express = require('express');
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

router.use(requireAdmin);

router.get('/users', adminController.getOrganizationUsers);
router.get('/users/:userId/items', adminController.getUserItems);
router.get('/users/:userId/requests', adminController.getUserRequests);
router.patch('/users/:userId/block', adminController.blockUser);
router.delete('/items/:itemId', adminController.deleteUserItem);
router.delete('/requests/:requestId', adminController.deleteUserRequest);
router.get('/stats', adminController.getOrganizationStats);
router.patch('/users/:userId/promote', adminController.promoteToAdmin);

module.exports = router;