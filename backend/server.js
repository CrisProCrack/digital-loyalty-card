const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Mock database (en producción usar MongoDB o PostgreSQL)
let users = [];
let cards = [];
let transactions = [];
let merchants = [];

// JWT Secret
const JWT_SECRET = 'loyalty_card_secret_2024';

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper function to generate QR data
const generateQRData = (cardId, userId) => {
  return `LOYALTY_CARD:${cardId}:${userId}:${Date.now()}`;
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: generateId(),
      email,
      password: hashedPassword,
      name,
      createdAt: new Date()
    };
    
    users.push(user);
    
    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);
    
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);
    
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Card Routes
app.get('/api/cards', authenticateToken, (req, res) => {
  const userCards = cards.filter(card => card.userId === req.user.userId);
  res.json(userCards);
});

app.post('/api/cards', authenticateToken, (req, res) => {
  const { merchantId, cardType = 'points' } = req.body;
  
  const merchant = merchants.find(m => m.id === merchantId);
  if (!merchant) {
    return res.status(400).json({ error: 'Merchant not found' });
  }

  const card = {
    id: generateId(),
    userId: req.user.userId,
    merchantId,
    merchantName: merchant.name,
    merchantLogo: merchant.logo,
    cardType, // 'points', 'stamps', 'visits'
    currentPoints: 0,
    targetPoints: merchant.targetPoints || 10,
    qrData: '',
    createdAt: new Date(),
    isActive: true
  };

  card.qrData = generateQRData(card.id, card.userId);
  cards.push(card);
  
  res.json(card);
});

app.patch('/api/cards/:cardId/points', authenticateToken, (req, res) => {
  const { cardId } = req.params;
  const { points, description = 'Points added' } = req.body;
  
  const card = cards.find(c => c.id === cardId && c.userId === req.user.userId);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  card.currentPoints += points;
  
  // Create transaction record
  const transaction = {
    id: generateId(),
    cardId,
    userId: req.user.userId,
    type: 'points_added',
    points,
    description,
    timestamp: new Date()
  };
  
  transactions.push(transaction);

  // Check if user earned a reward
  if (card.currentPoints >= card.targetPoints) {
    const rewardTransaction = {
      id: generateId(),
      cardId,
      userId: req.user.userId,
      type: 'reward_earned',
      points: -card.targetPoints,
      description: 'Reward redeemed',
      timestamp: new Date()
    };
    
    transactions.push(rewardTransaction);
    card.currentPoints -= card.targetPoints;
  }

  res.json({ card, transaction });
});

// Merchant Routes
app.get('/api/merchants', (req, res) => {
  res.json(merchants);
});

app.post('/api/merchants', (req, res) => {
  const { name, logo, description, targetPoints = 10, rewardDescription = 'Free item' } = req.body;
  
  const merchant = {
    id: generateId(),
    name,
    logo,
    description,
    targetPoints,
    rewardDescription,
    createdAt: new Date()
  };
  
  merchants.push(merchant);
  res.json(merchant);
});

// Transaction Routes
app.get('/api/transactions', authenticateToken, (req, res) => {
  const userTransactions = transactions.filter(t => t.userId === req.user.userId);
  res.json(userTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

// QR Scan Route
app.post('/api/scan', authenticateToken, (req, res) => {
  const { qrData, points = 1 } = req.body;
  
  // Parse QR data
  const [prefix, cardId, userId] = qrData.split(':');
  
  if (prefix !== 'LOYALTY_CARD' || userId !== req.user.userId) {
    return res.status(400).json({ error: 'Invalid QR code' });
  }

  const card = cards.find(c => c.id === cardId);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  // Add points
  card.currentPoints += points;
  
  const transaction = {
    id: generateId(),
    cardId,
    userId: req.user.userId,
    type: 'qr_scan',
    points,
    description: 'QR code scanned',
    timestamp: new Date()
  };
  
  transactions.push(transaction);

  res.json({ card, transaction });
});

// Initialize with sample data
const initializeData = () => {
  // Sample merchants
  merchants.push({
    id: 'merchant1',
    name: 'Coffee Paradise',
    logo: '☕',
    description: 'Best coffee in town',
    targetPoints: 8,
    rewardDescription: 'Free coffee',
    createdAt: new Date()
  });

  merchants.push({
    id: 'merchant2',
    name: 'Pizza Corner',
    logo: '🍕',
    description: 'Delicious pizza place',
    targetPoints: 10,
    rewardDescription: 'Free pizza slice',
    createdAt: new Date()
  });

  merchants.push({
    id: 'merchant3',
    name: 'Book Haven',
    logo: '📚',
    description: 'Your local bookstore',
    targetPoints: 5,
    rewardDescription: '10% discount',
    createdAt: new Date()
  });
};

// Initialize sample data
initializeData();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Loyalty Card API running on port ${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
});
