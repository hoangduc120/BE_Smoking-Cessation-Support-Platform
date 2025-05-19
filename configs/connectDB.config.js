const mongoose = require("mongoose")

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI)
        if (conn.connection.readyState === 1)
            console.log("Connect DB successfuly")
        else console.log("Connect DB failed")

    } catch (error) {
        console.log("Connect DB failed")
        throw new Error(error)
    }
}

module.exports = connectDB