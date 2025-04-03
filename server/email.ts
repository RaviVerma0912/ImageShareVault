import nodemailer from "nodemailer";

// Default sender address
const DEFAULT_SENDER = process.env.EMAIL_FROM || "noreply@imageshare.com";

// Email sending interface
interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
}

// Create a reusable test account
let testAccount: any = null;
let devTransporter: any = null;

// Function to initialize Ethereal test account (only does this once)
async function initializeTestAccount() {
  if (!testAccount) {
    testAccount = await nodemailer.createTestAccount();
    devTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log("📧 Created Ethereal test account for email testing");
    console.log(`📧 Username: ${testAccount.user}`);
    console.log(`📧 Password: ${testAccount.pass}`);
  }
  return devTransporter;
}

// Function to send emails
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // Use Ethereal for testing (for simplicity in this project)
    const emailTransporter = await initializeTestAccount();
    
    const info = await emailTransporter.sendMail({
      from: params.from || DEFAULT_SENDER,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html
    });
    
    // Log the preview URL for testing (user can view emails here)
    console.log("📧 Email sent successfully!");
    console.log("📧 Preview URL: %s", nodemailer.getTestMessageUrl(info));
    return true;
    
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}
