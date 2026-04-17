const userModel = require('../models/userModel');

async function getWishlist(req, res) {
  try {
    const userId = req.user.userId; // Ensure this matches JWT payload (e.g., 'id' or 'userId')
    const wishlist = await userModel.getWishlist(userId);
    res.json({ success: true, data: wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function toggleWishlist(req, res) {
  try {
    const userId = req.user.userId;
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ success: false, message: 'Item ID is required' });
    }

    const result = await userModel.toggleWishlist(userId, itemId);
    res.json({ success: true, action: result.action, wishlist: result.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getWishlist,
  toggleWishlist
};
