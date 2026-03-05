const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

class AuthController {
    async signup(req, res) {
        try {
            const { username, email, password } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide username, email and password'
                });
            }

            const existingUser = await userModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = {
                username,
                email,
                password: hashedPassword
            };

            const result = await userModel.createUser(newUser);

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

    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide email and password'
                });
            }

            const user = await userModel.findByEmail(email);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

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