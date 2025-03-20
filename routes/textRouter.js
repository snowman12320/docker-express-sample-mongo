// routes/textdata.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const TextModel = require('../models/TextModel');
const multer = require('multer');

// 配置 multer 用於處理檔案上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳 PDF 文件'));
    }
  }
});

// 處理 POST 請求，新增文字資料到 MongoDB
router.post('/', async (req, res) => {
  console.log(req.body);
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
    console.log(textData);
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

// PDF 上傳處理
router.post('/upload-pdf', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('未選擇檔案');
  }
  res.send('PDF 上傳成功');
});

// 獲取 PDF 文件列表
router.get('/pdf-list', (req, res) => {
  const uploadsDir = path.join(__dirname, '../public/uploads');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error('讀取目錄失敗:', err);
      return res.status(500).send('無法讀取 PDF 列表');
    }
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    res.json(pdfFiles);
  });
});

module.exports = router;
