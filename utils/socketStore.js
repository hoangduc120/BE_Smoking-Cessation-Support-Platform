// Tạo file lưu trữ socket map và đối tượng io
const userSocketMap = {};
let ioInstance = null;

const socketStore = {
    setSocketId: (userId, socketId) => {
        userSocketMap[userId] = socketId;
    },

    getReceiverSocketId: (userId) => {
        return userSocketMap[userId];
    },

    removeSocketId: (userId) => {
        delete userSocketMap[userId];
    },

    getAllOnlineUsers: () => {
        return Object.keys(userSocketMap);
    },

    // Thêm các phương thức để xử lý io
    setIo: (io) => {
        ioInstance = io;
    },

    getIo: () => {
        return ioInstance;
    }
};

module.exports = socketStore; 