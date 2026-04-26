const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. DATABASE CONNECTION
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timeswap';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Connection Error:', err));

// ==========================================
// 2. MODELS (MVC: Model)
// ==========================================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true } // In production, use bcrypt!
});
const User = mongoose.model('User', userSchema);

const slotSchema = new mongoose.Schema({
  time: { type: String, required: true },
  status: { type: String, enum: ['available', 'booked', 'released'], default: 'available' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});
const Slot = mongoose.model('Slot', slotSchema);

// ==========================================
// 3. CONTROLLERS (MVC: Controller)
// ==========================================

// Register a new user
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    
    const newUser = new User({ name, email, password });
    await newUser.save();
    res.status(201).json({ message: 'Registration successful', user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login existing user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all slots
const getSlots = async (req, res) => {
  try {
    const slots = await Slot.find().populate('userId', 'name email');
    res.status(200).json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Book a slot
const bookSlot = async (req, res) => {
  try {
    const { slotId, userId } = req.body;
    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (slot.status === 'booked') return res.status(400).json({ message: 'Slot already booked' });
    
    slot.status = 'booked';
    slot.userId = userId;
    await slot.save();
    res.status(200).json({ message: 'Slot booked successfully', slot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Release a booked slot
const releaseSlot = async (req, res) => {
  try {
    const { slotId, userId } = req.body;
    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    
    // Check if the user trying to release is the one who booked it
    if (slot.userId && slot.userId.toString() !== userId) {
        return res.status(403).json({ message: 'Unauthorized to release this slot' });
    }
    
    slot.status = 'released';
    slot.userId = null; // Free it up for others
    await slot.save();
    res.status(200).json({ message: 'Slot released successfully', slot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 4. ROUTES (MVC: Router)
// ==========================================
app.post('/register', registerUser);
app.post('/login', loginUser);
app.get('/slots', getSlots);
app.post('/book', bookSlot);
app.post('/release', releaseSlot);

/*
// Admin route to quickly seed database with some empty slots
app.post('/admin/seed', async (req, res) => {
    try {
        await Slot.deleteMany({});
        const slots = [];
        const times = [
            '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
            '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
            '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
            '05:00 PM', '05:30 PM'
        ];
        for (let t of times) {
            slots.push({ time: t, status: 'available' });
        }
        await Slot.insertMany(slots);
        res.json({ message: 'Database seeded with sample slots!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
*/

// Fallback: If no API route matches, send the index.html (Single Page App approach)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
