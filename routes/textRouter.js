const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const TextModel = require('../models/TextModel');

// 處理 POST 請求，新增文字資料到 MongoDB
router.post('/', async (req, res) => {
  const newTextData = new TextModel({ text: req?.body?.text });
  try {
    await newTextData.save();
    res.send('資料新增成功');
  } catch (error) {
    res.status(400).send(error);
  }
});

// 獲取所有資料
router.get('/', async (req, res) => {
  try {
    const textData = await TextModel.find({});
    res.json(textData);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post('/savetext', (req, res) => {
  const { text } = req.body;
  const filePath = path.join(__dirname, '../dist/text.txt');

  fs.writeFile(filePath, text, (err) => {
    if (err) {
      console.error('檔案寫入失敗:', err);
      return res.status(500).send('檔案寫入失敗');
    }
    res.send('檔案已成功儲存');
  });
});

module.exports = router;
