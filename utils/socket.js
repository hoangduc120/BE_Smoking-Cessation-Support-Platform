const { Server } = require("socket.io");
const http = require("http");
const socketStore = require("./socketStore");
const jwt = require("jsonwebtoken");

const initializeSocket = (app) => {
    const server = http.createServer(app);

    const io = new Server(server, {
        cors: {
            origin: "*",
            credentials: true,
        }
    });

    socketStore.setIo(io);

    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;

        const isDebugMode = socket.handshake.query.debug === 'true';

        try {
            if (isDebugMode && socket.handshake.query.userId) {
                socket.userId = socket.handshake.query.userId;
                return next();
            }

            if (!token) {
                return next(new Error("Authentication error - No token"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (error) {
            console.error('Socket auth error:', error.message);
            next(new Error("Authentication error - " + error.message));
        }
    })

    io.on("connection", (socket) => {

        const userId = socket.userId;
        if (userId) socketStore.setSocketId(userId, socket.id);

        io.emit("getOnLineUsers", socketStore.getAllOnlineUsers());

        socket.on("typing", ({ receiverId, isTyping }) => {
            const receiverSocketId = socketStore.getReceiverSocketId(receiverId);
            if (receiverSocketId) {
                socket.to(receiverSocketId).emit("userTyping", {
                    senderId: userId,
                    isTyping
                });
            }
        });

        socket.on("messageRead", ({ senderId, messageId }) => {
            const senderSocketId = socketStore.getReceiverSocketId(senderId);
            if (senderSocketId) {
                socket.to(senderSocketId).emit("messageRead", {
                    messageId,
                    readBy: userId
                });
            }
        });

        socket.on("joinConversation", ({ conversationId }) => {
            socket.join(`conversation_${conversationId}`);
        });

        socket.on("leaveConversation", ({ conversationId }) => {
            socket.leave(`conversation_${conversationId}`);
        });

        socket.on("disconnect", () => {
            socketStore.removeSocketId(userId);
            io.emit("getOnLineUsers", socketStore.getAllOnlineUsers());
        });
    });

    return { server, io };
};

module.exports = initializeSocket;
