// backend/controllers/authController.js
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

class AuthController {
    // User Signup
    async signup(req, res) {
        try {
            const { username, email, password } = req.body;

            // Validation - Check if all fields are provided
            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide username, email and password'
                });
            }

            // Check if user already exists with same email
            const existingUser = await userModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email'
                });
            }

            // Check if username is taken
            const existingUsername = await userModel.findByUsername(username);
            if (existingUsername) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already taken'
                });
            }

            // Hash the password (10 salt rounds)
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create new user
            const newUser = {
                username,
                email,
                password: hashedPassword
            };

            const result = await userModel.createUser(newUser);

            // Remove password from response
            const { password: _, ...userWithoutPassword } = newUser;

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                user: userWithoutPassword,
                userId: result.insertedId
            });

        } catch (error) {
            console.error('Signup error:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating user',
                error: error.message
            });
        }
    }

    // User Login
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validation
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide email and password'
                });
            }

            // Find user by email
            const user = await userModel.findByEmail(email);
            
            // Check if user exists
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Compare passwords
            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Remove password from response
            const { password: _, ...userWithoutPassword } = user;

            res.status(200).json({
                success: true,
                message: 'Login successful',
                user: userWithoutPassword
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Error during login',
                error: error.message
            });
        }
    }
}

module.exports = new AuthController();