const { Server } = require("socket.io");
const http = require("http");
const socketStore = require("./socketStore");

const initializeSocket = (app) => {
    const server = http.createServer(app);

    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            credentials: true,
        }
    });

    socketStore.setIo(io);

    io.on("connection", (socket) => {
        console.log("new connection", socket.id);

        const userId = socket.handshake.query.userId;
        if (userId) socketStore.setSocketId(userId, socket.id);

        io.emit("getOnLineUsers", socketStore.getAllOnlineUsers());

        socket.on("disconnect", () => {
            console.log("user disconnected", socket.id);
            socketStore.removeSocketId(userId);
            io.emit("getOnLineUsers", socketStore.getAllOnlineUsers());
        });
    });

    return { server, io };
};

module.exports = initializeSocket;
