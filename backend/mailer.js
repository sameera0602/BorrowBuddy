
require("dotenv").config();

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendOTP(email, otp) {
  await transporter.sendMail({
    from: `"BorrowBuddy" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "BorrowBuddy - Verify Your Email",

    text:
      "Welcome to BorrowBuddy!\n\n" +
      "Your verification code is: " + otp +
      "\n\nThis code expires in 5 minutes." +
      "\nIf you did not request this, ignore this email."
  });
}

module.exports = sendOTP;
