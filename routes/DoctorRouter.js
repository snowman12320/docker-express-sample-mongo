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

async function createDoctor(doctorData) {
  const lastDoctor = await prisma.doctor.findFirst({
    orderBy: {
      id: 'desc',
    },
  });

  let newId = 'D001';

  if (lastDoctor) {
    const lastIdNumber = parseInt(lastDoctor.id.substring(1));
    const currentDigits = lastDoctor.id.substring(1).length;
    const nextNumber = lastIdNumber + 1;

    if (nextNumber.toString().length > currentDigits) {
      newId = `D${nextNumber}`;
    } else {
      newId = `D${String(nextNumber).padStart(currentDigits, '0')}`;
    }
  }

  return prisma.doctor.create({
    data: {
      id: newId,
      ...doctorData,
    },
  });
}

// 建立新醫生
router.post('/', async (req, res) => {
  try {
    const doctor = await createDoctor(req.body);
    res.status(201).json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取得所有醫生列表
router.get('/', async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        patients: {
          include: {
            patient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取得特定醫生資料
router.get('/:id', async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: {
        patients: {
          include: {
            patient: true,
          },
        },
      },
    });
    if (!doctor) {
      return res.status(404).json({ error: '找不到該醫生' });
    }
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新醫生資料
router.put('/:id', async (req, res) => {
  try {
    const doctor = await prisma.doctor.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 刪除醫生
router.delete('/:id', async (req, res) => {
  try {
    await prisma.doctor.delete({
      where: { id: req.params.id },
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 新增病人關聯
router.post('/:id/patients', async (req, res) => {
  try {
    const { patientIds } = req.body;

    // 檢查現有關聯
    const existingRelations = await prisma.patientDoctor.findMany({
      where: {
        doctorId: req.params.id,
        patientId: Array.isArray(patientIds) 
          ? { in: patientIds }
          : req.body.patientId
      }
    });

    if (existingRelations.length > 0) {
      return res.status(400).json({ 
        error: '已重複關聯',
        duplicatePatients: existingRelations.map(r => r.patientId)
      });
    }

    if (Array.isArray(patientIds)) {
      await prisma.patientDoctor.createMany({
        data: patientIds.map(patientId => ({
          doctorId: req.params.id,
          patientId: patientId,
        })),
        skipDuplicates: true,
      });
    } else {
      await prisma.patientDoctor.create({
        data: {
          doctorId: req.params.id,
          patientId: req.body.patientId,
        },
      });
    }

    const updatedDoctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: {
        patients: {
          include: {
            patient: true,
          },
        },
      },
    });

    res.json(updatedDoctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 移除病人關聯
router.delete('/:id/patients/:patientId', async (req, res) => {
  try {
    await prisma.patientDoctor.delete({
      where: {
        doctorId_patientId: {
          doctorId: req.params.id,
          patientId: req.params.patientId,
        },
      },
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
