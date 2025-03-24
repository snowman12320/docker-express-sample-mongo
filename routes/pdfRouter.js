const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { patientId, tableId } = req.params;
    const uploadDir = path.join(__dirname, `../public/uploads/${patientId}/${tableId}`);
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

// PDF 上傳處理
router.post('/upload/:patientId/:tableId', upload.single('pdf'), (req, res) => {
  const { patientId, tableId } = req.params;
  
  if (!req.file) {
    return res.status(400).send('未選擇檔案');
  }
  
  const filePath = `/uploads/${patientId}/${tableId}/${req.file.filename}`;
  const currentUrl = `${req.protocol}://${req.get('host')}${filePath}`;
  res.json({
    message: 'PDF 上傳成功',
    filePath: currentUrl,
    filename: req.file.filename
  });
});

// 獲取特定路徑的 PDF 文件列表
router.get('/list/:patientId/:tableId', (req, res) => {
  const { patientId, tableId } = req.params;
  const uploadsDir = path.join(__dirname, `../public/uploads/${patientId}/${tableId}`);
  
  if (!fs.existsSync(uploadsDir)) {
    return res.json([]);
  }

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error('讀取目錄失敗:', err);
      return res.status(500).send('無法讀取 PDF 列表');
    }
    
    const pdfFiles = files
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(filename => {
        const filePath = `/uploads/${patientId}/${tableId}/${filename}`;
        const fileUrl = `${req.protocol}://${req.get('host')}${filePath}`;
        return {
          filename,
          url: fileUrl
        };
      });

    res.json(pdfFiles);
  });
});

module.exports = router;
