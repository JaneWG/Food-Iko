const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');
const { check, validationResult } = require('express-validator');

// Initialize
const app = express();

// Middleware configuration
app.use(express.static(__dirname));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Configure session middleware
app.use(session({
    secret: 'uwebuiwebciuwebcwecubweubweofbweofbowebfouwbfuowerb',
    resave: false,
    saveUninitialized: false,
}));

// Create database connection
const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '@Waruiru2024',
    database: 'food_iko'
});

connection.connect((err) => {
    if (err) {
        console.error('Error occurred while connecting to the db server: ' + err.stack);
        return;
    }
    console.log('DB Server connected successfully.');
});

// Define route to registration form
app.get('/register', (request, response) => {
    response.sendFile(path.join(__dirname, 'register.html'));
});

// Display login page
app.get('/login', (request, response) => {
    response.sendFile(path.join(__dirname, "login.html"));
});

// Define User object - registration
const User = {
    tableName: 'users',
    createUser: function (newUser, callback) {
        connection.query('INSERT INTO ' + this.tableName + ' SET ?', newUser, callback);
    },
    getUserByEmail: function (email, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE email = ?', email, callback);
    },
    getUserByUsername: function (username, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE username = ?', username, callback);
    },
}

// Define registration route and logic
app.post('/users/register', [
    // Validation check
    check('email').isEmail().withMessage('Provide a valid email address.'),
    check('username').isAlphanumeric().withMessage('Invalid username. Provide alphanumeric values.'),
    check('email').custom((email) => {
        return new Promise((resolve, reject) => {
            User.getUserByEmail(email, (err, results) => {
                if (err) return reject(new Error('Server Error'));
                if (results.length > 0) {
                    return reject(new Error('Email already exists'));
                }
                resolve(true);
            });
        });
    }),
    check('username').custom((username) => {
        return new Promise((resolve, reject) => {
            User.getUserByUsername(username, (err, results) => {
                if (err) return reject(new Error('Server Error'));
                if (results.length > 0) {
                    return reject(new Error('Username already in use.'));
                }
                resolve(true);
            });
        });
    })
], async (request, response) => {
    // Check for validation errors
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(400).json({ errors: errors.array() });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(request.body.password, saltRounds);

    // Define a new user object
    const newUser = {
        username: request.body.username,
        password: request.body.hashedPassword,
        email:request.email.body.email,
        full_name: request.body.full_name,
        
    }

    // Save new user
    User.createUser(newUser, (error) => {
        if (error) {
            console.error('An error occurred while saving the record: ' + error.message);
            return response.status(500).json({ error: error.message });
        }
        console.log('New user record saved!');
        response.status(201).send('Registration successful!');
    });
});

// Handle the login logic - authentication
app.post('/login', (request, response) => {
    const { username, password } = request.body;

    connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            response.status(401).send('Invalid username or password.');
        } else {
            const user = results[0];
            // Compare passwords
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;
                if (isMatch) {
                    // Store user data in the session
                    request.session.user = user;
                    response.status(200).json({ message: 'Login successful' });
                } else {
                    response.status(401).send('Invalid username or password.');
                }
            });
        }
    });
});

// Handle authorization middleware
const userAuthenticated = (request, response, next) => {
    if (request.session.user) {
        next(); // User is authenticated
    } else {
        response.redirect('/login'); // User not authenticated
    }
}

// Secure route
app.get('/index', userAuthenticated, (request, response) => {
    response.status(200).json({ message: 'You are viewing a secured route.' });
});

// Destroy session (logout)
app.get('/logout', (request, response) => {
    request.session.destroy();
    response.redirect('/login');
});

// Start server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

