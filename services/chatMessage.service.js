const User = require("../models/user.models")
const { cloudinary } = require("../configs/cloudinary.config");
const ChatMessage = require("../models/chatMessage.model");
const socketStore = require("../utils/socketStore");
const Follow = require("../models/follow.model");
const QuitPlan = require("../models/quitPlan.model");


class ChatMessageService {
    async getUsersForSidebar(loggedInUserId) {
        try {
            // Lấy tất cả user active (trừ chính user đang đăng nhập)
            const allUsers = await User.find({
                _id: { $ne: loggedInUserId },
                isActive: true,
                isDeleted: false,
            }).select('userName email profilePicture role');

            return allUsers.map(user => ({
                _id: user._id,
                userName: user.userName,
                email: user.email,
                profilePicture: user.profilePicture,
                role: user.role,
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getMessages(myId, receiverId) {
        try {
            const receiver = await User.findById(receiverId);
            if (!receiver || !receiver.isActive || receiver.isDeleted) {
                throw new Error('Receiver not found or not active');
            }

            const messages = await ChatMessage.find({
                $or: [
                    { senderId: myId, receiverId },
                    { senderId: receiverId, receiverId: myId },
                ],
            })
                .populate('senderId', 'userName profilePicture')
                .populate('receiverId', 'userName profilePicture')
                .sort({ createdAt: 1 });

            // Đánh dấu tin nhắn là đã đọc
            await ChatMessage.updateMany(
                { senderId: receiverId, receiverId: myId, isRead: false },
                { isRead: true }
            );

            return messages;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async sendMessage(senderId, receiverId, text, image) {
        try {
            const receiver = await User.findById(receiverId);
            if (!receiver || !receiver.isActive || receiver.isDeleted) {
                throw new Error('Receiver not found or not active');
            }

            let imageUrl = null;
            if (image) {
                // Kiểm tra xem image đã là URL từ Cloudinary (từ multer upload) hay là base64
                if (image.startsWith('http')) {
                    // Đã là URL từ Cloudinary
                    imageUrl = image;
                } else {
                    // Là base64, cần upload lên Cloudinary
                    const uploadResponse = await cloudinary.uploader.upload(image);
                    imageUrl = uploadResponse.secure_url;
                }
            }

            const newMessage = new ChatMessage({
                senderId,
                receiverId,
                text: text || null,
                image: imageUrl || null,
                isRead: false,
            });

            await newMessage.save();

            const populatedMessage = await ChatMessage.findById(newMessage._id)
                .populate('senderId', 'userName profilePicture')
                .populate('receiverId', 'userName profilePicture');

            const receiverSocketId = socketStore.getReceiverSocketId(receiverId);
            const senderSocketId = socketStore.getReceiverSocketId(senderId);
            const io = socketStore.getIo();

            if (io) {
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('newMessage', populatedMessage);
                }

                if (senderSocketId) {
                    io.to(senderSocketId).emit('messageSent', {
                        tempId: newMessage._id,
                        message: populatedMessage,
                        status: 'sent'
                    });
                }

                const conversationId = [senderId, receiverId].sort().join('_');
                io.to(`conversation_${conversationId}`).emit('newMessage', populatedMessage);
            }

            return populatedMessage;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async markAsRead(userId, senderId) {
        try {
            const result = await ChatMessage.updateMany(
                {
                    senderId: senderId,
                    receiverId: userId,
                    isRead: false
                },
                { isRead: true }
            );
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getUnreadCount(userId) {
        try {
            const unreadCount = await ChatMessage.countDocuments({
                receiverId: userId,
                isRead: false
            });
            return unreadCount;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async deleteMessage(messageId, userId) {
        try {
            const message = await ChatMessage.findById(messageId);
            if (!message) {
                throw new Error('Message not found');
            }

            // Chỉ người gửi mới có thể xóa tin nhắn
            if (message.senderId.toString() !== userId.toString()) {
                throw new Error('You can only delete your own messages');
            }

            await ChatMessage.findByIdAndDelete(messageId);
            return { message: 'Message deleted successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getConversations(userId) {
        try {
            // Lấy danh sách conversations của user
            const conversations = await ChatMessage.aggregate([
                {
                    $match: {
                        $or: [
                            { senderId: userId },
                            { receiverId: userId }
                        ]
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ['$senderId', userId] },
                                '$receiverId',
                                '$senderId'
                            ]
                        },
                        lastMessage: { $first: '$$ROOT' },
                        unreadCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$receiverId', userId] },
                                            { $eq: ['$isRead', false] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            // Populate user information
            const populatedConversations = await User.populate(conversations, {
                path: '_id',
                select: 'userName profilePicture role'
            });

            return populatedConversations.map(conv => ({
                user: conv._id,
                lastMessage: conv.lastMessage,
                unreadCount: conv.unreadCount
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async searchUsers(loggedInUserId, searchQuery) {
        try {
            if (!searchQuery || searchQuery.trim().length < 2) {
                return [];
            }

            const users = await User.find({
                _id: { $ne: loggedInUserId },
                isActive: true,
                isDeleted: false,
                $or: [
                    { userName: { $regex: searchQuery, $options: 'i' } },
                    { email: { $regex: searchQuery, $options: 'i' } }
                ]
            }).select('userName email profilePicture role').limit(20);

            return users.map(user => ({
                _id: user._id,
                userName: user.userName,
                email: user.email,
                profilePicture: user.profilePicture,
                role: user.role,
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = new ChatMessageService();  
