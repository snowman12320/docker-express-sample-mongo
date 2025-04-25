const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const prisma = require('../service/mySql');
const https = require('https');
const PDFParser = require("pdf2json");

const PDF_CO_API_KEY = process.env.PDF_CO_API_KEY;

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
    const protocol = process.env.ENV === 'dev'? process.env.DEV_URL : process.env.PROD_URL;
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

// 讀取 PDF 內容的路由
router.post('/read', async (req, res) => {
  try {
    const { pdfUrl } = req.body;
    
    if (!pdfUrl) {
      return res.status(400).json({ error: '未提供 PDF 網址' });
    }

    const jsonPayload = JSON.stringify({
      url: pdfUrl
    });

    const reqOptions = {
      host: "api.pdf.co",
      method: "POST",
      path: "/v1/ai-invoice-parser",
      headers: {
        "x-api-key": PDF_CO_API_KEY,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(jsonPayload, 'utf8')
      }
    };

    const postRequest = https.request(reqOptions, (response) => {
      let responseData = '';

      response.on("data", (chunk) => {
        responseData += chunk;
      });

      response.on("end", () => {
        try {
          const data = JSON.parse(responseData);
          if (!data.error) {
            checkIfJobIsCompleted(data.jobId, data.url, res);
          } else {
            res.status(500).json({ error: data.message });
          }
        } catch (error) {
          res.status(500).json({ error: '解析回應失敗' });
        }
      });
    });

    postRequest.on("error", (e) => {
      res.status(500).json({ error: '請求失敗' });
    });

    postRequest.write(jsonPayload);
    postRequest.end();

  } catch (error) {
    console.error('PDF 讀取錯誤:', error);
    res.status(500).json({ error: '無法讀取 PDF 內容' });
  }
});

function checkIfJobIsCompleted(jobId, resultFileUrl, res) {
  const queryPath = `/v1/job/check`;
  const jsonPayload = JSON.stringify({
    jobid: jobId
  });

  const reqOptions = {
    host: "api.pdf.co",
    path: queryPath,
    method: "POST",
    headers: {
      "x-api-key": PDF_CO_API_KEY,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(jsonPayload, 'utf8')
    }
  };

  const postRequest = https.request(reqOptions, (response) => {
    let responseData = '';

    response.on("data", (chunk) => {
      responseData += chunk;
    });

    response.on("end", () => {
      try {
        const data = JSON.parse(responseData);
        if (data.status === "working") {
          setTimeout(() => checkIfJobIsCompleted(jobId, resultFileUrl, res), 3000);
        } else if (data.status === "success") {
          res.json(data);
        } else {
          res.status(500).json({ error: `作業失敗: ${data.status}` });
        }
      } catch (error) {
        res.status(500).json({ error: '解析回應失敗' });
      }
    });
  });

  postRequest.write(jsonPayload);
  postRequest.end();
}

// 上傳並讀取 PDF 內容的路由
// pdf2json
// https://www.youtube.com/watch?v=b2dLDqmYT4I
// https://github.com/VLabStudio/Tutorials/blob/master/Manual%20Parsing%20in%20Node.js%20for%20beginners/Manually%20Parsing%20PDF%20in%20Node.js/parser.js
// pdfreader https://www.youtube.com/watch?v=Ri2-wiVd-Ek
// PDF.js https://www.youtube.com/watch?v=V_v5vqXbnCA
// +++ pdf-parse https://www.youtube.com/watch?v=enfZAaTRTKU
router.post('/pdf2json', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未選擇檔案' });
    }

    const pdfParser = new PDFParser(null, 1);

    const result = await new Promise((resolve, reject) => {
      pdfParser.loadPDF(req.file.path);

      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        const raw = pdfParser.getRawTextContent().replace(/\r\n/g, " ");
        const item1ToItem2 = /Item 1\s(.*?)\sItem 2/i.exec(raw);
        resolve({
          item1ToItem2: item1ToItem2 ? item1ToItem2[1] : null,
          rawText: raw,
          parsedData: pdfData
        });
      });

      pdfParser.on("pdfParser_dataError", (error) => {
        reject(error);
      });
    });

    // 刪除暫存檔案
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'PDF 解析成功',
      content: result
    });

  } catch (error) {
    console.error('PDF 解析錯誤:', error);
    // 確保清理暫存檔案
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: '無法解析 PDF 內容' });
  }
});

module.exports = router;
