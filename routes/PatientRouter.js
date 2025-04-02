const express = require('express');
const router = express.Router();
const prisma = require('../service/mySql');
const bcrypt = require('bcryptjs');
const saltRounds = 10;

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
      ...patient,
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
        SleepData: true,
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
