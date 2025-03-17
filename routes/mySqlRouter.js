const express = require('express');
const router = express.Router();
const prisma = require('../service/mySql');

// 新增使用者
router.post('/user', async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 取得所有使用者
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
