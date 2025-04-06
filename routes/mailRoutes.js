const express = require('express');
const router = express.Router();
const mailService = require('../services/mailService');

// CORS 和錯誤處理中介軟體
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // 更新 CORS 設定，允許多個來源
  // const origin ='https://phpstack-1387833-5139313.cloudwaysapps.com';
  // const origin = 'http://localhost:5173';
  const origin = '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Strict-Transport-Security', 'max-age=31536000');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  // 處理 SSL/TLS 錯誤
  req.on('error', (err) => {
    if (err.code === 'EPROTO') {
      console.error('SSL/TLS 錯誤:', err);
      return res.status(500).json({ error: '連接安全性錯誤' });
    }
    next(err);
  });

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
