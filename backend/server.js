const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

// Start Cron Jobs for Period Alerts
const { startCronJobs } = require('./services/cronService');
startCronJobs();

app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
