
require("dotenv").config();

const sendOTP = require("./mailer");

async function testEmail() {
  try {
    await sendOTP(process.env.SMTP_USER, "123456");

    console.log("Test email sent successfully!");
    console.log("Check your Gmail inbox.");
  } catch (error) {
    console.error("Email failed:", error.message);
  }
}

testEmail();
