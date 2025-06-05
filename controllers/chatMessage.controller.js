const chatMessageService = require("../services/chatMessage.service");
const { OK, BAD_REQUEST } = require("../configs/response.config");
const catchAsync = require("../utils/catchAsync");

class ChatMessageController {
    getUserForSidebar = catchAsync(async (req, res) => {
        const loggedInUserId = req.id;
        const filteredUsers = await chatMessageService.getUsersForSidebar(loggedInUserId);
        return OK(res, "Get users for sidebar successfully", filteredUsers);
    });

    getMessages = catchAsync(async (req, res) => {
        const { receiverId } = req.params;
        const myId = req.id;

        if (!receiverId) {
            return BAD_REQUEST(res, "Receiver ID is required");
        }

        const messages = await chatMessageService.getMessages(myId, receiverId);
        return OK(res, "Get messages successfully", messages);
    });

    sendMessage = catchAsync(async (req, res) => {
        const { receiverId } = req.params;
        const { text, image } = req.body;
        const senderId = req.id;

        if (!receiverId) {
            return BAD_REQUEST(res, "Receiver ID is required");
        }

        if (!text && !image) {
            return BAD_REQUEST(res, "Message must have either text or image");
        }

        const newMessage = await chatMessageService.sendMessage(senderId, receiverId, text, image);
        return OK(res, "Send message successfully", newMessage);
    });

    markAsRead = catchAsync(async (req, res) => {
        const { senderId } = req.params;
        const userId = req.id;

        if (!senderId) {
            return BAD_REQUEST(res, "Sender ID is required");
        }

        const result = await chatMessageService.markAsRead(userId, senderId);
        return OK(res, "Messages marked as read successfully", result);
    });

    getUnreadCount = catchAsync(async (req, res) => {
        const userId = req.id;
        const unreadCount = await chatMessageService.getUnreadCount(userId);
        return OK(res, "Get unread count successfully", { unreadCount });
    });

    deleteMessage = catchAsync(async (req, res) => {
        const { messageId } = req.params;
        const userId = req.id;

        if (!messageId) {
            return BAD_REQUEST(res, "Message ID is required");
        }

        const result = await chatMessageService.deleteMessage(messageId, userId);
        return OK(res, "Message deleted successfully", result);
    });

    getConversations = catchAsync(async (req, res) => {
        const userId = req.id;
        const conversations = await chatMessageService.getConversations(userId);
        return OK(res, "Get conversations successfully", conversations);
    });

    searchUsers = catchAsync(async (req, res) => {
        const loggedInUserId = req.id;
        const { q } = req.query; // search query từ query parameter

        if (!q || q.trim().length < 2) {
            return BAD_REQUEST(res, "Search query must be at least 2 characters long");
        }

        const users = await chatMessageService.searchUsers(loggedInUserId, q);
        return OK(res, "Search users successfully", users);
    });
}

module.exports = new ChatMessageController();
