const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env from the project path
dotenv.config({ path: 'c:/Users/ragur/OneDrive/Desktop/Mini project(2)/backend/.env' });

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    phoneNumber: String
});

const User = mongoose.model('User', UserSchema);

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}, 'name email role phoneNumber');
        console.log(JSON.stringify(users, null, 2));
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
