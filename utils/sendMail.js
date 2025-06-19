const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");

const sendMail = asyncHandler(async ({ email, html, subject = "Forgot password" }) => {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_NAME,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });

    async function main() {
        const info = await transporter.sendMail({
            from: '"Hoangduckun" <no-relply@quitsmoking.email>',
            to: email,
            subject: subject,
            html: html,
        });
        return info;
    }
    return main().catch(console.error);
})
module.exports = sendMail