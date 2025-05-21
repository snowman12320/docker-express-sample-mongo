const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  const origin = '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Strict-Transport-Security', 'max-age=31536000');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: '請提供訊息內容' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
    });

    const chat = model.startChat({
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.8, // 降低溫度以獲得更準確的翻譯結果
        topP: 0.9,
        topK: 40,
      },
    });

    const translationPrompt =
      // "Translate the following Chinese text to English. Provide varied English expressions for repeated inputs while keeping the meaning accurate. Return only the English translation: ";
      // "Translate the following Chinese text to English. For repeated inputs, provide only one translation each time, using a different natural English expression that accurately conveys the meaning. Return only the English translation.";
      'Translate the following Chinese text to English. Return only the English translation.';

    const result = await chat.sendMessage(translationPrompt + message);
    const response = await result.response;
    const text = response.text();

    res.json({ response: text });
  } catch (error) {
    console.error('Gemini API 錯誤:', error);
    if (error.message.includes('API key not valid')) {
      return res.status(401).json({
        error: 'Gemini API 金鑰無效，請檢查您的 .env 檔案中的 GEMINI_API_KEY',
      });
    }
    res.status(500).json({ error: '與 Gemini API 通訊時發生錯誤' });
  }
});

router.get('/', (req, res) => {
  res.render('gemini', { title: 'Gemini AI 聊天室' });
});

module.exports = router;
