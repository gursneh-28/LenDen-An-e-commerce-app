const express = require("express");
const router  = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { getConversations, getMessages, getUnread } = require("../controllers/chatController");

router.get("/conversations",        verifyToken, getConversations);
router.get("/messages/:roomId",     verifyToken, getMessages);
router.get("/unread",               verifyToken, getUnread);

module.exports = router;