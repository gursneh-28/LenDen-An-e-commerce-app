const express    = require("express");
const router     = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const {
  getMyNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
} = require("../controllers/notificationController");

router.get("/",                    verifyToken, getMyNotifications);
router.get("/unread-count",        verifyToken, getUnreadCount);
router.patch("/mark-all-read",     verifyToken, markAllRead);
router.patch("/:id/read",          verifyToken, markRead);
router.delete("/:id",              verifyToken, deleteNotification);

module.exports = router;
