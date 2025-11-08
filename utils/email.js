// const nodemailer = require("nodemailer");
// const hbs = require("nodemailer-express-handlebars");
// const path = require("path");

// const sendMail = async (
//   subject,
//   send_to,
//   send_from,
//   reply_to,
//   template,
//   context
// ) => {
//   function createNewTransport() {
//     if (process.env.NODE_ENV === "production") {
//       // Use SendInBlue API for production
//       return nodemailer.createTransport({
//         host: "smtp-relay.sendinblue.com",
//         port: 587,
//         auth: {
//           user: process.env.SENDINBLUE_USERNAME,
//           pass: process.env.SENDINBLUE_PASSWORD,
//         },
//       });
//     }

//     // Use your existing setup for development
//     return nodemailer.createTransport({
//       host: process.env.EMAIL_HOST,
//       port: process.env.EMAIL_PORT,
//       auth: {
//         user: process.env.EMAIL_USERNAME,
//         pass: process.env.EMAIL_PASSWORD,
//       },
//     });
//   }

//   const handlebarsOptions = {
//     viewEngine: {
//       extName: ".handlebars",
//       partialsDir: path.resolve("./views/emails"),
//       defaultLayout: false,
//     },
//     viewPath: path.resolve("./views/emails"),
//     extName: ".handlebars",
//   };

//   const transporter = createNewTransport();
//   transporter.use("compile", hbs(handlebarsOptions));

//   // options for sending email
//   const mailOptions = {
//     from: send_from,
//     to: send_to,
//     replyTo: reply_to,
//     template,
//     subject,
//     context, // contains all dynamic data
//   };

//   try {
//     const info = await transporter.sendMail(mailOptions);
//     console.log("Email sent:", info.response);
//     return info;
//   } catch (err) {
//     console.error("Error sending email:", err);
//     throw err;
//   }
// };

// module.exports = sendMail;
const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");

const sendMail = async (
  subject,
  send_to,
  send_from,
  reply_to,
  template,
  context
) => {
  function createNewTransport() {
    if (process.env.NODE_ENV === "production") {
      // Use Brevo (formerly SendInBlue) with port 465 for production
      return nodemailer.createTransport({
        host: "smtp-relay.brevo.com", // Updated hostname
        port: 465, // Changed from 587 to 465
        secure: true, // Enable SSL/TLS
        auth: {
          user: process.env.SENDINBLUE_USERNAME,
          pass: process.env.SENDINBLUE_PASSWORD,
        },
        // Additional timeout settings for better error handling
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 10000,
        // Logging for debugging
        logger: process.env.DEBUG_EMAIL === "true",
        debug: process.env.DEBUG_EMAIL === "true",
      });
    }

    // Development configuration
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 465,
      secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  const handlebarsOptions = {
    viewEngine: {
      extName: ".handlebars",
      partialsDir: path.resolve("./views/emails"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./views/emails"),
    extName: ".handlebars",
  };

  const transporter = createNewTransport();
  transporter.use("compile", hbs(handlebarsOptions));

  // Options for sending email
  const mailOptions = {
    from: send_from,
    to: send_to,
    replyTo: reply_to,
    template,
    subject,
    context, // contains all dynamic data
  };

  try {
    // Verify connection configuration
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully");

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent successfully:", info.response);
    console.log("Message ID:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Error sending email:", err);
    console.error("Error details:", {
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
    });
    throw err;
  }
};

module.exports = sendMail;

// alternative code:

// const nodemailer = require("nodemailer");
// const hbs = require("nodemailer-express-handlebars");
// const path = require("path");
// const handlebars = require("handlebars");
// const fs = require("fs").promises;

// // Brevo API helper (alternative to SMTP)
// const sendViaBrevoAPI = async (subject, send_to, send_from, reply_to, htmlContent) => {
//   const SibApiV3Sdk = require("@sendinblue/client");

//   const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
//   apiInstance.setApiKey(
//     SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
//     process.env.BREVO_API_KEY
//   );

//   const sendSmtpEmail = {
//     subject,
//     sender: { email: send_from, name: send_from.split("@")[0] },
//     to: [{ email: send_to }],
//     replyTo: { email: reply_to },
//     htmlContent,
//   };

//   try {
//     const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
//     console.log("📧 Email sent via Brevo API:", data);
//     return data;
//   } catch (err) {
//     console.error("❌ Brevo API Error:", err);
//     throw err;
//   }
// };

// const sendMail = async (
//   subject,
//   send_to,
//   send_from,
//   reply_to,
//   template,
//   context
// ) => {
//   // Use Brevo API in production if API key is available
//   if (process.env.NODE_ENV === "production" && process.env.BREVO_API_KEY) {
//     try {
//       // Manually render the handlebars template
//       const templatePath = path.resolve("./views/emails", `${template}.handlebars`);
//       const templateSource = await fs.readFile(templatePath, "utf8");
//       const compiledTemplate = handlebars.compile(templateSource);
//       const htmlContent = compiledTemplate(context);

//       return await sendViaBrevoAPI(subject, send_to, send_from, reply_to, htmlContent);
//     } catch (err) {
//       console.error("Failed to send via API, falling back to SMTP:", err);
//       // Fall back to SMTP if API fails
//     }
//   }

//   // SMTP Configuration (fallback or development)
//   function createNewTransport() {
//     if (process.env.NODE_ENV === "production") {
//       return nodemailer.createTransport({
//         host: "smtp-relay.brevo.com",
//         port: 465,
//         secure: true,
//         auth: {
//           user: process.env.SENDINBLUE_USERNAME,
//           pass: process.env.SENDINBLUE_PASSWORD,
//         },
//         connectionTimeout: 10000,
//         greetingTimeout: 10000,
//         socketTimeout: 10000,
//         logger: process.env.DEBUG_EMAIL === "true",
//         debug: process.env.DEBUG_EMAIL === "true",
//       });
//     }

//     return nodemailer.createTransport({
//       host: process.env.EMAIL_HOST,
//       port: process.env.EMAIL_PORT || 465,
//       secure: process.env.EMAIL_PORT == 465,
//       auth: {
//         user: process.env.EMAIL_USERNAME,
//         pass: process.env.EMAIL_PASSWORD,
//       },
//       connectionTimeout: 10000,
//       greetingTimeout: 10000,
//       socketTimeout: 10000,
//     });
//   }

//   const handlebarsOptions = {
//     viewEngine: {
//       extName: ".handlebars",
//       partialsDir: path.resolve("./views/emails"),
//       defaultLayout: false,
//     },
//     viewPath: path.resolve("./views/emails"),
//     extName: ".handlebars",
//   };

//   const transporter = createNewTransport();
//   transporter.use("compile", hbs(handlebarsOptions));

//   const mailOptions = {
//     from: send_from,
//     to: send_to,
//     replyTo: reply_to,
//     template,
//     subject,
//     context,
//   };

//   try {
//     await transporter.verify();
//     console.log("✅ SMTP connection verified successfully");

//     const info = await transporter.sendMail(mailOptions);
//     console.log("📧 Email sent successfully:", info.response);
//     return info;
//   } catch (err) {
//     console.error("❌ Error sending email:", err);
//     console.error("Error details:", {
//       code: err.code,
//       command: err.command,
//       response: err.response,
//     });
//     throw err;
//   }
// };

// module.exports = sendMail;
