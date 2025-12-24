// services/emailService.js
const nodemailer = require("nodemailer");
const { getSignatureAndEmail } = require("./sheetService");
const { fileMapping } = require("../utils/fileMapping").default;

// Tạo transporter Gmail chung
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER1,
    pass: process.env.GMAIL_APP_PASSWORD1,
  },
});

/**
 * Gửi email yêu cầu xác nhận ký file
 */
async function sendSignEmail({ fileName, contentBase64, fullName, fileId }) {
  const { signature, email } = await getSignatureAndEmail(fullName);

  if (!email) throw new Error(`Email not found for ${fullName}`);

  const htmlContent = `
<p>Chào ${fullName},</p>
<p>Vui lòng xác nhận ký file <b>${fileName}</b></p>

<a href="http://localhost:5000/api/confirm-sign?confirm=yes&fileId=${fileId}&user=${encodeURIComponent(fullName)}"
   style="padding: 10px 20px; background-color: green; color: white;">
   ✅ Yes
</a>

<a href="http://localhost:5000/api/confirm-sign?confirm=no&fileId=${fileId}&user=${encodeURIComponent(fullName)}"
   style="padding: 10px 20px; background-color: red; color: white;">
   ❌ No
</a>
`;

  await transporter.sendMail({
    from: process.env.GMAIL_USER1,
    to: email,
    subject: `Xác nhận ký: ${fileName}`,
    html: htmlContent,
    attachments: [
      { filename: fileName, content: Buffer.from(contentBase64, "base64") }
    ]
  });

  console.log("📧 Sent sign-request to:", email);

  return { signature, email };
}

/**
 * Gửi email thông báo file đã được ký xong
 */
async function sendSignedEmail(to, fileName, fileLink) {
  await transporter.sendMail({
    from: process.env.GMAIL_USER1,
    to,
    subject: "Your signed PDF is ready",
    html: `
      <p>Xin chào,</p>
      <p>File PDF đã được ký xong. Bạn có thể tải hoặc xem file tại link dưới đây:</p>
      <a href="${fileLink}">${fileName}</a>
      <p>Trân trọng!</p>
    `,
  });

  console.log("✅ Email thông báo đã gửi:", to);
}

// mail thông báo từ chối ký
async function sendDeclineEmail({ fileName, contentBase64, fullName, fileId }) {
  const { signature, email } = await getSignatureAndEmail(fullName);

  if (!email) throw new Error(`Email not found for ${fullName}`);

  const htmlContent = `
<p>Chào ${fullName},</p>
<p>File <b>${fileName}</b> đã bị từ chối ký tên </p>
`;

  await transporter.sendMail({
    from: process.env.GMAIL_USER1,
    to: email,
    subject: `Từ chối ký: ${fileName}`,
    html: htmlContent,
    attachments: [
      { filename: fileName, content: Buffer.from(contentBase64, "base64") }
    ]
  });

  console.log("📧 Sent sign-request to:", email);

  return { signature, email };
}

// gửi mail không cần ký
async function sendEmail({ fileName, contentBase64, fullName, fileId }) {
  const { signature, email } = await getSignatureAndEmail(fullName);

  if (!email) throw new Error(`Email not found for ${fullName}`);

  const htmlContent = `
<p>Chào ${fullName},</p>
<p>File <b>${fileName}</b> đã xác nhận ký rồi nên chúng tôi không thêm yêu cầu ký mới.</p>

`;

  await transporter.sendMail({
    from: process.env.GMAIL_USER1,
    to: email,
    subject: `Thông báo file: ${fileName}`,
    html: htmlContent,
    attachments: [
      { filename: fileName, content: Buffer.from(contentBase64, "base64") }
    ],
  });

  console.log("✅ Email thông báo đã gửi:", email);

  // Lưu metadata vào fileMapping
  // fileMapping[fileId] = { fileName, content: contentBase64,  fullName, email };

  return { signature, email };
}



module.exports = { sendSignEmail, sendSignedEmail, sendEmail,sendDeclineEmail };
