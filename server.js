const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("./configs/connectDB.config");
const app = require("./app");
const initializeSocket = require("./utils/socket");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        const { server } = initializeSocket(app);

        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer(); 