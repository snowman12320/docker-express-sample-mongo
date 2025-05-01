const express = require('express');
const router = express.Router();
const prisma = require('../services/mySql');

router.use((req, res, next) => {
  const origin = '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Strict-Transport-Security', 'max-age=31536000');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
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

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    
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

router.get('/', async (req, res) => {
  try {
    const { patientId } = req.query;
    
    if (!patientId) {
      const allSleepData = await prisma.sleepData.findMany({
        orderBy: {
          recordStartTime: 'desc'
        }
      });
      return res.json(allSleepData);
    }

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

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.info(id);
    
    await prisma.fileData.deleteMany({
      where: {
        sleepDataId: parseInt(id)
      }
    });

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
