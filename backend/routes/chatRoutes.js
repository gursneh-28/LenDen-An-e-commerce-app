const express = require("express");
const router  = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { getConversations, getMessages, getUnread } = require("../controllers/chatController");

router.get("/conversations",        verifyToken, getConversations);
router.get("/messages/:roomId",     verifyToken, getMessages);
router.get("/unread",               verifyToken, getUnread);
router.patch("/messages/:id",  verifyToken, editMessage);
router.delete("/messages/:id", verifyToken, deleteMessage);

module.exports = router;