const nodemailer = require('nodemailer');

class MailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD // 使用應用程式密碼
      }
    });
  }

  async sendMail(to, subject, text) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, response: info.response };
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }
}

module.exports = new MailService();
