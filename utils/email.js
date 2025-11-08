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

// const nodemailer = require("nodemailer");
// const hbs = require("nodemailer-express-handlebars");
// const path = require("path");
// const handlebars = require("handlebars");
// const fs = require("fs").promises;

// // Brevo API method (works on Render - no SMTP ports)
// const sendViaBrevoAPI = async (
//   subject,
//   send_to,
//   send_from,
//   reply_to,
//   htmlContent
// ) => {
//   const apiKey = process.env.BREVO_API_KEY;

//   if (!apiKey) {
//     throw new Error("BREVO_API_KEY is not configured");
//   }

//   const payload = {
//     sender: { email: send_from },
//     to: [{ email: send_to }],
//     subject: subject,
//     htmlContent: htmlContent,
//     replyTo: { email: reply_to },
//   };

//   try {
//     const response = await fetch("https://api.brevo.com/v3/smtp/email", {
//       method: "POST",
//       headers: {
//         "api-key": apiKey,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     if (!response.ok) {
//       const errorData = await response.json();
//       throw new Error(`Brevo API Error: ${JSON.stringify(errorData)}`);
//     }

//     const data = await response.json();
//     console.log("📧 Email sent via Brevo API:", data);
//     return data;
//   } catch (err) {
//     console.error("❌ Brevo API Error:", err);
//     throw err;
//   }
// };

// // Main send mail function
// const sendMail = async (
//   subject,
//   send_to,
//   send_from,
//   reply_to,
//   template,
//   context
// ) => {
//   // For production on Render, use Brevo API
//   if (process.env.NODE_ENV === "production") {
//     try {
//       console.log("🚀 Using Brevo API for email (Render-compatible)");

//       // Manually render the handlebars template
//       const templatePath = path.resolve(
//         "./views/emails",
//         `${template}.handlebars`
//       );
//       const templateSource = await fs.readFile(templatePath, "utf8");
//       const compiledTemplate = handlebars.compile(templateSource);
//       const htmlContent = compiledTemplate(context);

//       return await sendViaBrevoAPI(
//         subject,
//         send_to,
//         send_from,
//         reply_to,
//         htmlContent
//       );
//     } catch (err) {
//       console.error("❌ Failed to send via Brevo API:", err);
//       throw new Error(`Email sending failed: ${err.message}`);
//     }
//   }

//   // Development mode - use SMTP
//   console.log("🔧 Using SMTP for email (development mode)");

//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT || 587,
//     secure: process.env.EMAIL_PORT == 465,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//     connectionTimeout: 10000,
//     greetingTimeout: 10000,
//     socketTimeout: 10000,
//   });

//   const handlebarsOptions = {
//     viewEngine: {
//       extName: ".handlebars",
//       partialsDir: path.resolve("./views/emails"),
//       defaultLayout: false,
//     },
//     viewPath: path.resolve("./views/emails"),
//     extName: ".handlebars",
//   };

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
//     console.log("✅ SMTP connection verified");

//     const info = await transporter.sendMail(mailOptions);
//     console.log("📧 Email sent successfully:", info.response);
//     return info;
//   } catch (err) {
//     console.error("❌ Error sending email:", err);
//     throw err;
//   }
// };

// module.exports = sendMail;

// const nodemailer = require("nodemailer");
// const hbs = require("nodemailer-express-handlebars");
// const path = require("path");
// const handlebars = require("handlebars");
// const fs = require("fs").promises;

// // Brevo API method (works on Render - no SMTP ports needed)
// const sendViaBrevoAPI = async (
//   subject,
//   send_to,
//   send_from,
//   reply_to,
//   htmlContent
// ) => {
//   const apiKey = process.env.BREVO_API_KEY;

//   if (!apiKey) {
//     throw new Error("BREVO_API_KEY is not configured in environment variables");
//   }

//   const payload = {
//     sender: { email: send_from },
//     to: [{ email: send_to }],
//     subject: subject,
//     htmlContent: htmlContent,
//     replyTo: { email: reply_to },
//   };

//   console.log("📤 Sending email via Brevo API to:", send_to);

//   try {
//     const response = await fetch("https://api.brevo.com/v3/smtp/email", {
//       method: "POST",
//       headers: {
//         "api-key": apiKey,
//         "Content-Type": "application/json",
//         Accept: "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     const responseText = await response.text();
//     console.log("Brevo API Response Status:", response.status);
//     console.log("Brevo API Response:", responseText);

//     if (!response.ok) {
//       throw new Error(`Brevo API Error (${response.status}): ${responseText}`);
//     }

//     const data = JSON.parse(responseText);
//     console.log("✅ Email sent successfully via Brevo API");
//     return data;
//   } catch (err) {
//     console.error("❌ Brevo API Error:", err.message);
//     throw err;
//   }
// };

// // SMTP method (for local development only)
// const sendViaSMTP = async (
//   subject,
//   send_to,
//   send_from,
//   reply_to,
//   template,
//   context
// ) => {
//   console.log("🔧 Using SMTP for email (development mode)");

//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT || 587,
//     secure: process.env.EMAIL_PORT == 465,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//     connectionTimeout: 10000,
//     greetingTimeout: 10000,
//     socketTimeout: 10000,
//   });

//   const handlebarsOptions = {
//     viewEngine: {
//       extName: ".handlebars",
//       partialsDir: path.resolve("./views/emails"),
//       defaultLayout: false,
//     },
//     viewPath: path.resolve("./views/emails"),
//     extName: ".handlebars",
//   };

//   transporter.use("compile", hbs(handlebarsOptions));

//   const mailOptions = {
//     from: send_from,
//     to: send_to,
//     replyTo: reply_to,
//     template,
//     subject,
//     context,
//   };

//   await transporter.verify();
//   console.log("✅ SMTP connection verified");

//   const info = await transporter.sendMail(mailOptions);
//   console.log("📧 Email sent successfully via SMTP");
//   return info;
// };

// // Main send mail function
// const sendMail = async (
//   subject,
//   send_to,
//   send_from,
//   reply_to,
//   template,
//   context
// ) => {
//   console.log("📧 Email Service Called");
//   console.log("Environment:", process.env.NODE_ENV);
//   console.log("BREVO_API_KEY exists:", !!process.env.BREVO_API_KEY);
//   console.log("To:", send_to);
//   console.log("Template:", template);

//   try {
//     // Use Brevo API if API key is available (recommended for Render)
//     if (process.env.BREVO_API_KEY) {
//       console.log("🚀 Using Brevo API (Render-compatible)");

//       // Render the handlebars template to HTML
//       const templatePath = path.resolve(
//         "./views/emails",
//         `${template}.handlebars`
//       );

//       console.log("Reading template from:", templatePath);
//       const templateSource = await fs.readFile(templatePath, "utf8");
//       const compiledTemplate = handlebars.compile(templateSource);
//       const htmlContent = compiledTemplate(context);

//       return await sendViaBrevoAPI(
//         subject,
//         send_to,
//         send_from,
//         reply_to,
//         htmlContent
//       );
//     }

//     // Fallback to SMTP (local development)
//     console.log("⚠️  BREVO_API_KEY not found, falling back to SMTP");
//     return await sendViaSMTP(
//       subject,
//       send_to,
//       send_from,
//       reply_to,
//       template,
//       context
//     );
//   } catch (err) {
//     console.error("❌ Email sending failed:", err.message);
//     console.error("Full error:", err);
//     throw new Error(`Email sending failed: ${err.message}`);
//   }
// };

// module.exports = sendMail;

const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
const handlebars = require("handlebars");
const fs = require("fs").promises;

// Brevo API method (works on Render - no SMTP ports needed)
const sendViaBrevoAPI = async (
  subject,
  send_to,
  send_from,
  reply_to,
  htmlContent
) => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured in environment variables");
  }

  const payload = {
    sender: { email: send_from },
    to: [{ email: send_to }],
    subject: subject,
    htmlContent: htmlContent,
    replyTo: { email: reply_to },
  };

  console.log("📤 Sending email via Brevo API to:", send_to);
  console.log("API Key length:", apiKey.length);
  console.log("API Key starts with:", apiKey.substring(0, 10) + "...");

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("Brevo API Response Status:", response.status);
    console.log("Brevo API Response:", responseText);

    if (!response.ok) {
      throw new Error(`Brevo API Error (${response.status}): ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log("✅ Email sent successfully via Brevo API");
    return data;
  } catch (err) {
    console.error("❌ Brevo API Error:", err.message);
    throw err;
  }
};

// SMTP method (for local development only)
const sendViaSMTP = async (
  subject,
  send_to,
  send_from,
  reply_to,
  template,
  context
) => {
  console.log("🔧 Using SMTP for email (development mode)");

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const handlebarsOptions = {
    viewEngine: {
      extName: ".handlebars",
      partialsDir: path.resolve("./views/emails"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./views/emails"),
    extName: ".handlebars",
  };

  transporter.use("compile", hbs(handlebarsOptions));

  const mailOptions = {
    from: send_from,
    to: send_to,
    replyTo: reply_to,
    template,
    subject,
    context,
  };

  await transporter.verify();
  console.log("✅ SMTP connection verified");

  const info = await transporter.sendMail(mailOptions);
  console.log("📧 Email sent successfully via SMTP");
  return info;
};

// Main send mail function
const sendMail = async (
  subject,
  send_to,
  send_from,
  reply_to,
  template,
  context
) => {
  console.log("📧 Email Service Called");
  console.log("Environment:", process.env.NODE_ENV);
  console.log("BREVO_API_KEY exists:", !!process.env.BREVO_API_KEY);
  console.log("To:", send_to);
  console.log("Template:", template);

  try {
    // Use Brevo API if API key is available (recommended for Render)
    if (process.env.BREVO_API_KEY) {
      console.log("🚀 Using Brevo API (Render-compatible)");

      // Render the handlebars template to HTML
      const templatePath = path.resolve(
        "./views/emails",
        `${template}.handlebars`
      );

      console.log("Reading template from:", templatePath);
      const templateSource = await fs.readFile(templatePath, "utf8");
      const compiledTemplate = handlebars.compile(templateSource);
      const htmlContent = compiledTemplate(context);

      return await sendViaBrevoAPI(
        subject,
        send_to,
        send_from,
        reply_to,
        htmlContent
      );
    }

    // Fallback to SMTP (local development)
    console.log("⚠️  BREVO_API_KEY not found, falling back to SMTP");
    return await sendViaSMTP(
      subject,
      send_to,
      send_from,
      reply_to,
      template,
      context
    );
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
    console.error("Full error:", err);
    throw new Error(`Email sending failed: ${err.message}`);
  }
};

module.exports = sendMail;
