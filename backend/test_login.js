const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const testLogin = async () => {
    try {
        const email = 'admin@college.edu';
        const password = '123';

        console.log(`Testing login for: ${email}`);

        const user = await User.findOne({ email });

        if (!user) {
            console.log('User NOT found!');
            process.exit(1);
        }

        console.log('User found:', user.email);
        console.log('Stored Hash:', user.password);

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            console.log('SUCCESS: Password matches!');
        } else {
            console.log('FAILURE: Password does NOT match.');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

setTimeout(testLogin, 2000); // Wait for DB connection
