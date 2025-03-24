const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const username = req.params.username;
    console.log('Username from params:', username);
    
    const userUploadDir = path.join(__dirname, `../public/uploads/${username}`);
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true });
    }
    cb(null, userUploadDir);
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

// PDF 上傳處理
router.post('/upload/:username', upload.single('pdf'), (req, res) => {
  const username = req.params.username;
  if (!req.file || !username) {
    return res.status(400).send('未選擇檔案或未提供用戶名');
  }
  res.send('PDF 上傳成功');
});

// 獲取特定用戶的 PDF 文件列表
router.get('/list/:username', (req, res) => {
  const { username } = req.params;
  const userUploadsDir = path.join(__dirname, `../public/uploads/${username}`);
  
  if (!fs.existsSync(userUploadsDir)) {
    return res.json([]);
  }

  fs.readdir(userUploadsDir, (err, files) => {
    if (err) {
      console.error('讀取目錄失敗:', err);
      return res.status(500).send('無法讀取 PDF 列表');
    }
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    res.json(pdfFiles);
  });
});

module.exports = router;
