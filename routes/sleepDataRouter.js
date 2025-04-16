const express = require('express');
const router = express.Router();
const prisma = require('../service/mySql');

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

// 新增睡眠資料 (不寫死資料)
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    
    // 檢查必要欄位
    if (!data.patientId) {
      return res.status(400).json({ error: '病患 ID 為必填項目' });
    }

    const sleepData = await prisma.sleepData.create({
      data: {
        ...data,
        recordStartTime: new Date(data.recordStartTime),
        recordEndTime: new Date(data.recordEndTime)
      }
    });
    res.status(201).json(sleepData);
  } catch (error) {
    console.error('Create sleep data error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '此病患記錄已存在' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 修改路由路徑，使用查詢參數而不是路徑參數
router.get('/', async (req, res) => {
  try {
    const { patientId } = req.query;
    
    if (!patientId) {
      // 如果沒有提供 patientId，返回所有記錄
      const allSleepData = await prisma.sleepData.findMany({
        orderBy: {
          recordStartTime: 'desc'
        }
      });
      return res.json(allSleepData);
    }

    // 依照病患 ID 查詢
    const sleepData = await prisma.sleepData.findMany({
      where: {
        patientId: patientId
      },
      orderBy: {
        recordStartTime: 'desc'
      }
    });

    if (sleepData.length === 0) {
      return res.status(404).json({ message: '找不到此病患的睡眠紀錄' });
    }

    res.json(sleepData);
  } catch (error) {
    console.error('Get sleep data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取特定睡眠紀錄
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sleepData = await prisma.sleepData.findUnique({
      where: {
        id: parseInt(id)
      },
      include: {
        files: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    if (!sleepData) {
      return res.status(404).json({ error: '找不到此睡眠紀錄' });
    }

    function getFileCategory(file) {
      const ctMimeTypes = ['application/octet-stream', 'application/dicom'];
      const fileType = file.fileType;
    
      return ctMimeTypes.includes(fileType) ? 'ct' : 'pdf';
    }

    // 加入檔案類型標記
    const formattedData = {
      ...sleepData,
      files: sleepData.files.map(file => ({
        ...file,
        fileCategory: getFileCategory(file),
      }))
    };

    res.json(formattedData);
  } catch (error) {
    console.error('Get sleep data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新睡眠資料
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedSleepData = await prisma.sleepData.update({
      where: {
        id: parseInt(id)
      },
      data: {
        ...data,
        recordStartTime: data.recordStartTime ? new Date(data.recordStartTime) : undefined,
        recordEndTime: data.recordEndTime ? new Date(data.recordEndTime) : undefined
      }
    });
    res.json(updatedSleepData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 刪除睡眠資料
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.info(id);
    
    // 先刪除關聯的檔案記錄
    await prisma.fileData.deleteMany({
      where: {
        sleepDataId: parseInt(id)
      }
    });

    // 再刪除睡眠資料
    await prisma.sleepData.delete({
      where: {
        id: parseInt(id)
      }
    });

    res.json({ message: '刪除成功' });
  } catch (error) {
    console.error('Delete sleep data error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
