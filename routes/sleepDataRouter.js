const express = require('express');
const router = express.Router();
const prisma = require('../service/mySql');

// 新增睡眠資料
router.post('/', async (req, res) => {
  try {
    const sleepData = await prisma.sleepData.create({
      data: {
        userCode: '0001',
        age: 38,
        gender: '男',
        height: 180,
        weight: 75,
        bmi: 23.1,
        recordStartTime: new Date('2025-01-01T22:00:00Z'),
        recordEndTime: new Date('2025-01-02T06:00:00Z'),
        timeZone: 'UTC+08:00',
        bedtimeDurationMinutes: 480,
        bAHI: 5.0,
        ODI: 3.0,
        SpO2LessThan90Percent: 2,
        sleepEfficiency: 85.5,
        totalSleepTimeMinutes: 480,
        quickSleepDuration: 1.5,
        averageSleepRate: 95.0,
        selfRegulationScore: 70.0,
        notes: 'Felt refreshed in the morning'
      }
    });
    res.json(sleepData);
  } catch (error) {
    console.error('Create sleep data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取所有睡眠資料
router.get('/', async (req, res) => {
  try {
    const sleepData = await prisma.sleepData.findMany();
    res.json(sleepData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
