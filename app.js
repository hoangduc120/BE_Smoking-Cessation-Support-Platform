const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./configs/connectDB.config");
const passport = require("./configs/passport.config");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Must be before CORS and routes

// CORS configuration
const corsOptions = {
    origin: process.env.CLIENT_URL,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    optionsSuccessStatus: 204,
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
};
app.use(cors(corsOptions));

// Session and passport
app.use(
    session({
        secret: "your_secret_key",
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
const appRoutes = require("./router/appRoutes");
app.use("/", appRoutes);

// Error handling
app.use((req, res, next) => {
    res.status(404).json({
        message: "Route not found",
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    if (err.status && err.message) {
        return res.status(err.status).json({
            message: err.message,
            error: err.message,
        });
    }
    res.status(500).json({
        message: "Something went wrong!",
        error: err.message,
    });
});

module.exports = app;