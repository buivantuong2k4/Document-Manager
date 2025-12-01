const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;

let transporter = null;
if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
} else {
  console.warn('SMTP not fully configured. Email sending disabled.');
}

async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    console.warn('Skipping sendMail because transporter is not configured');
    return;
  }

  const mailOptions = {
    from: FROM_EMAIL,
    to,
    subject,
    text,
    html,
  };

  return transporter.sendMail(mailOptions);
}

async function sendToDepartment(pool, department, subject, text, html) {
  if (!department) return;
  try {
    // Get users by department name via FK join
    const res = await pool.query(
      'SELECT u.email FROM users u JOIN departments d ON u.department_id = d.id WHERE d.name = $1',
      [department]
    );
    if (!res.rows || res.rows.length === 0) {
      console.info(`No users found for department ${department}`);
      return;
    }

    // Send individual emails (avoids exposing recipient list)
    await Promise.all(res.rows.map(r => sendMail({ to: r.email, subject, text, html })));
  } catch (err) {
    console.error('Error sending mails to department:', err);
  }
}

async function sendToAll(pool, subject, text, html) {
  try {
    const res = await pool.query('SELECT email FROM users');
    if (!res.rows || res.rows.length === 0) return;
    await Promise.all(res.rows.map(r => sendMail({ to: r.email, subject, text, html })));
  } catch (err) {
    console.error('Error sending mails to all users:', err);
  }
}

module.exports = {
  sendMail,
  sendToDepartment,
  sendToAll,
};
