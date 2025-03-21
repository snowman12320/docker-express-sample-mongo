const express = require('express');
const router = express.Router();
const mailService = require('../services/mailService');

router.post('/send', async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    const result = await mailService.sendMail(to, subject, text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '寄送郵件失敗', message: error.message });
  }
});

module.exports = router;
