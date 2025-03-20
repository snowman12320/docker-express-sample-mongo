const express = require('express');
const router = express.Router();
const prisma = require('../service/mySql');

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
      }
    });
    if (!sleepData) {
      return res.status(404).json({ error: '找不到此睡眠紀錄' });
    }
    res.json(sleepData);
  } catch (error) {
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
    await prisma.sleepData.delete({
      where: {
        id: parseInt(id)
      }
    });
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
