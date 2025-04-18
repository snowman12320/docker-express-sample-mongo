const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const prisma = require('../service/mySql');  // 添加 prisma 引用

// 新增 CORS 和錯誤處理中介軟體
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // CORS 設定
  // const origin = 'https://phpstack-1387833-5139313.cloudwaysapps.com';
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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { patientId, sleepDataId } = req.params;
    const uploadDir = path.join(__dirname, `../public/uploads/${patientId}/${sleepDataId}`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 處理中文檔名
    const originalname = Buffer.from(file.originalname).toString('utf8');
    const encodedFilename = encodeURIComponent(path.parse(originalname).name);
    const timestamp = Date.now();
    const extension = path.extname(originalname);
    cb(null, `${timestamp}-${encodedFilename}${extension}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳 PDF 文件'));
    }
  },
});

// PDF 上傳處理
router.post('/upload/:patientId/:sleepDataId', upload.single('pdf'), async (req, res) => {
  try {
    const { patientId, sleepDataId } = req.params;

    if (!req.file) {
      return res.status(400).send('未選擇檔案');
    }

    const originalFilename = Buffer.from(req.file.originalname).toString('utf8');
    const encodedFilename = encodeURIComponent(req.file.filename);
    const filePath = `/uploads/${patientId}/${sleepDataId}/${encodedFilename}`;
    const protocol = 'https://phpstack-1387833-5352829.cloudwaysapps.com';
    // const protocol = 'http://127.0.0.1:3000';
    const currentUrl = `${protocol}${filePath}`;

    const fileData = await prisma.fileData.create({
      data: {
        filename: originalFilename,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: currentUrl,
        encodedFilename,
        sleepData: {
          connect: { id: parseInt(sleepDataId) }
        }
      }
    });

    res.json({
      message: 'PDF 上傳成功',
      ...fileData
    });
  } catch (error) {
    console.error('上傳處理錯誤:', error);
    res.status(500).send('檔案處理失敗');
  }
});

// 獲取檔案列表的路由
router.get('/list/:patientId/:sleepDataId', async (req, res) => {
  try {
    const { sleepDataId } = req.params;
    
    const files = await prisma.fileData.findMany({
      where: {
        sleepDataId: parseInt(sleepDataId),
        fileType: 'application/pdf' 
      }
    });

    res.json(files);
  } catch (error) {
    console.error('獲取檔案列表錯誤:', error);
    res.status(500).json({ error: '無法讀取檔案列表' });
  }
});

module.exports = router;
