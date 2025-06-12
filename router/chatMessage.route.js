const express = require("express");
const router = express.Router();
const chatMessageController = require("../controllers/chatMessage.controller");
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

// Get users for sidebar
router.get("/users", authMiddleware, chatMessageController.getUserForSidebar);


router.get("/search-users", authMiddleware, chatMessageController.searchUsers);

// Get conversations
router.get("/conversations", authMiddleware, chatMessageController.getConversations);

// Get unread count
router.get("/unread-count", authMiddleware, chatMessageController.getUnreadCount);

// Messages routes
router.get("/messages/:receiverId", authMiddleware, chatMessageController.getMessages);
router.post("/messages/:receiverId", authMiddleware, chatMessageController.sendMessage);

// Mark messages as read
router.put("/mark-read/:senderId", authMiddleware, chatMessageController.markAsRead);

// Delete message
router.delete("/messages/:messageId", authMiddleware, chatMessageController.deleteMessage);

module.exports = router;
