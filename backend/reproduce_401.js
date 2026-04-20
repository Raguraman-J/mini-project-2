const axios = require('axios');

async function reproduce() {
    try {
        console.log('Attempting login to http://localhost:5000/api/auth/login');
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@college.edu',
            password: 'wrongpassword'
        });
        console.log('Response status:', response.status);
    } catch (error) {
        if (error.response) {
            console.log('Error status:', error.response.status);
            console.log('Error data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

reproduce();
