const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.models');
const dotenv = require("dotenv");
const bcrypt = require('bcryptjs');
dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });
        const passwordBrcypt = await bcrypt.hash("B@o03122003", 10);
        if (user) {
            if (!user.googleId) {
                user.googleId = profile.id;
                await user.save();
            }
        }
        else {
            user = new User({
                googleId: profile.id,
                email: profile.emails[0].value,
                role: 'user',
                password: passwordBrcypt,
                gender: profile._json.gender || 'other',
                yob: profile._json.birthday || null,
            });
            await user.save();
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
