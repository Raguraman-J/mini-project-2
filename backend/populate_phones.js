const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

const backendDir = 'c:/Users/ragur/OneDrive/Desktop/Mini project(2)/backend';
dotenv.config({ path: path.join(backendDir, '.env') });

// Manually define User schema to avoid import issues
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String },
    role: { type: String }
});

const User = mongoose.model('User', userSchema);

async function updateFaculty() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Update all teachers/admins with a dummy phone number if they don't have one
        const result = await User.updateMany(
            { role: { $in: ['teacher', 'admin'] }, phoneNumber: { $exists: false } },
            { $set: { phoneNumber: '9876543210' } }
        );

        console.log(`Updated ${result.modifiedCount} users with dummy phone numbers.`);
        
        const users = await User.find({ role: { $in: ['teacher', 'admin'] } }, 'name role phoneNumber');
        console.log('Current Faculty/Admins:');
        console.log(users);

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

updateFaculty();
