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
    // 處理中文檔名
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const encodedFilename = encodeURIComponent(path.parse(originalname).name);
    const timestamp = Date.now();
    const extension = path.extname(originalname);
    cb(null, `${timestamp}-${encodedFilename}${extension}`);
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
router.post('/upload/:patientId/:tableId', upload.single('pdf'), async (req, res) => {
  try {
    const { patientId, tableId } = req.params;
    
    if (!req.file) {
      return res.status(400).send('未選擇檔案');
    }

    const originalFilename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const filePath = `/uploads/${patientId}/${tableId}/${req.file.filename}`;
    const currentUrl = `${req.protocol}://${req.get('host')}${filePath}`;

    res.json({
      message: 'PDF 上傳成功',
      filePath: currentUrl,
      filename: originalFilename,
      encodedFilename: req.file.filename
    });
  } catch (error) {
    console.error('上傳處理錯誤:', error);
    res.status(500).send('檔案處理失敗');
  }
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
        // 解碼檔名顯示
        const originalName = decodeURIComponent(
          filename.substring(filename.indexOf('-') + 1)
        );
        const filePath = `/uploads/${patientId}/${tableId}/${filename}`;
        // 使用單次編碼，避免重複編碼
        const fileUrl = `${req.protocol}://${req.get('host')}${encodeURI(filePath)}`;
        return {
          filename: originalName,
          encodedFilename: filename,
          url: fileUrl
        };
      });

    res.json(pdfFiles);
  });
});

module.exports = router;
