const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const prisma = require('../service/mySql');

// CORS 中介軟體設定
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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { patientId, sleepDataId } = req.params;
    const uploadDir = path.join(__dirname, `../public/uploads/${patientId}/${sleepDataId}/ct`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
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
    const allowedTypes = ['application/octet-stream','application/dicom'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳 DICOM/CT 檔案'));
    }
  },
});

router.post('/upload/:patientId/:sleepDataId', upload.array('ct', 550), async (req, res) => {
  try {
    const { patientId, sleepDataId } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('未選擇檔案');
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const originalFilename = Buffer.from(file.originalname).toString('utf8');
      const encodedFilename = encodeURIComponent(file.filename);
      const filePath = `/uploads/${patientId}/${sleepDataId}/ct/${encodedFilename}`;
      // const protocol = 'https://phpstack-1387833-5352829.cloudwaysapps.com';
      const protocol = 'http://127.0.0.1:3000';
      const currentUrl = `${protocol}${filePath}`;

      const fileData = await prisma.fileData.create({
        data: {
          filename: originalFilename,
          fileType: 'application/dicom', //file.mimetype,
          fileSize: file.size,
          filePath: currentUrl,
          encodedFilename,
          sleepData: {
            connect: { id: parseInt(sleepDataId) }
          }
        }
      });

      uploadedFiles.push(fileData);
    }

    res.json({
      message: 'CT 檔案上傳成功',
      filePaths: uploadedFiles.map(file => file.filePath),
      fileCount: uploadedFiles.length,
    });
  } catch (error) {
    console.error('上傳處理錯誤:', error);
    res.status(500).send('檔案處理失敗');
  }
});

router.get('/list/:patientId/:sleepDataId', async (req, res) => {
  try {
    const { sleepDataId } = req.params;
    
    const files = await prisma.fileData.findMany({
      where: {
        sleepDataId: parseInt(sleepDataId),
        fileType: 'application/dicom'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const response = {
      count: files.length,
      filePaths: files.map(file => file.filePath),
    };

    res.json(response);
  } catch (error) {
    console.error('獲取檔案列表錯誤:', error);
    res.status(500).json({ error: '無法讀取檔案列表' });
  }
});

module.exports = router;