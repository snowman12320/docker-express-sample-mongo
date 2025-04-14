const express = require('express');
const router = express.Router();
const prisma = require('../service/mySql');
const bcrypt = require('bcryptjs');
const saltRounds = 10;

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
  req.on('error', err => {
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

async function createPatient(patientData) {
  const lastPatient = await prisma.patient.findFirst({
    orderBy: {
      id: 'desc',
    },
  });

  let newId = 'P001';

  if (lastPatient) {
    const lastIdNumber = parseInt(lastPatient.id.substring(1));
    const currentDigits = lastPatient.id.substring(1).length;

    const nextNumber = lastIdNumber + 1;

    if (nextNumber.toString().length > currentDigits) {
      newId = `P${nextNumber}`;
    } else {
      newId = `P${String(nextNumber).padStart(currentDigits, '0')}`;
    }
  }

  return prisma.patient.create({
    data: {
      id: newId,
      ...patientData,
    },
  });
}

router.post('/', async (req, res) => {
  try {
    const { password, confirmPassword, ...rest } = req.body;

    if (!password) {
      return res.status(400).json({ error: '密碼不能為空' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: '兩次輸入的密碼不一致' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const patient = await createPatient({
      ...rest,
      passwordHash: hashedPassword,
    });

    res.status(201).json(patient);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        _count: {
          select: { SleepData: true },
        },
        SleepData: {
          orderBy: { recordStartTime: 'desc' },
          take: 1,
          select: {
            recordStartTime: true,
            bAHI: true,
          },
        },
      },
    });

    const formattedPatients = patients.map(patient => ({
      id: patient.id,
      name: patient.name,
      gender: patient.gender,
      birthDate: patient.birthDate,
      totalRecordCount: patient._count.SleepData,
      latestRecordStartTime: patient.SleepData[0]?.recordStartTime || null,
      latestBAHI: patient.SleepData[0]?.bAHI || null,
      SleepData: undefined,
      _count: undefined,
    }));

    res.json(formattedPatients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        SleepData: {
          orderBy: { recordStartTime: 'desc' },
        },
        doctors: {
          include: {
            doctor: true,
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { password, confirmPassword, ...rest } = req.body;
    let updateData = rest;

    if (password) {
      if (!password.trim()) {
        return res.status(400).json({ error: '密碼不能為空' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: '兩次輸入的密碼不一致' });
      }

      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateData.passwordHash = hashedPassword;
    }

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.patient.delete({
      where: { id: req.params.id },
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const isValid = await bcrypt.compare(password, patient.passwordHash);
    res.json({ isValid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
