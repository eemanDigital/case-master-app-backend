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

// Enhanced email service with fallbacks
const sendMail = async (
  subject,
  send_to,
  send_from,
  reply_to,
  template,
  context
) => {
  const createTransporter = async () => {
    // Try SendinBlue first
    if (process.env.NODE_ENV === "production") {
      const sendinblueTransporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com", // Updated host
        port: 587,
        auth: {
          user: process.env.SENDINBLUE_USERNAME,
          pass: process.env.SENDINBLUE_PASSWORD,
        },
        connectionTimeout: 10000, // 10 seconds timeout
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      // Test connection
      try {
        await sendinblueTransporter.verify();
        console.log("✅ SendinBlue connection verified");
        return sendinblueTransporter;
      } catch (error) {
        console.log("❌ SendinBlue failed");
      }
    }

    // Use your existing setup for development
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  };

  const handlebarsOptions = {
    viewEngine: {
      extName: ".handlebars",
      partialsDir: path.resolve("./views/emails"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./views/emails"),
    extName: ".handlebars",
  };

  try {
    const transporter = await createTransporter();
    transporter.use("compile", hbs(handlebarsOptions));

    const mailOptions = {
      from: send_from,
      to: send_to,
      replyTo: reply_to,
      template,
      subject,
      context,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.response);
    return info;
  } catch (err) {
    console.error("❌ All email services failed:", err);
    throw new Error("EMAIL_SERVICE_UNAVAILABLE");
  }
};
module.exports = sendMail;
