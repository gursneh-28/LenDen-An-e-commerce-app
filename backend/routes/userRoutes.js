const express = require('express');
const router  = express.Router();
const userController = require('../controllers/userController');
const verifyToken    = require('../middleware/authMiddleware');

router.get('/wishlist',          verifyToken, userController.getWishlist);
router.post('/wishlist/toggle',  verifyToken, userController.toggleWishlist);
router.patch('/profile',         verifyToken, userController.updateProfile);
router.patch('/change-password', verifyToken, userController.changePassword);

module.exports = router;