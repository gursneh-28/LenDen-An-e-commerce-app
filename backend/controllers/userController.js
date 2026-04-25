const userModel = require('../models/userModel');
const bcrypt    = require('bcrypt');

async function getWishlist(req, res) {
  try {
    const userId   = req.user.userId;
    const wishlist = await userModel.getWishlist(userId);
    res.json({ success: true, data: wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function toggleWishlist(req, res) {
  try {
    const userId  = req.user.userId;
    const { itemId } = req.body;

    if (!itemId)
      return res.status(400).json({ success: false, message: 'Item ID is required' });

    const result = await userModel.toggleWishlist(userId, itemId);
    res.json({ success: true, action: result.action, wishlist: result.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateProfile(req, res) {
  try {
    const userId  = req.user.userId;
    const { username, phoneNumber } = req.body;

    if (!username?.trim())
      return res.status(400).json({ success: false, message: 'Name cannot be empty' });

    const user = await userModel.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    await userModel.updateProfile(userId, {
      username:    username.trim(),
      phoneNumber: phoneNumber?.trim() || "",
    });

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function changePassword(req, res) {
  try {
    const userId  = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'All fields are required' });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const user = await userModel.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await userModel.updatePassword(userId, hashed);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getWishlist,
  toggleWishlist,
  updateProfile,
  changePassword,
};