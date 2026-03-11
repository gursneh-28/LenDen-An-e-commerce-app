const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

class AuthController {

  async signup(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide username, email and password',
        });
      }

      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email',
        });
      }

      const org = email.split('@')[1];

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await userModel.createUser({
        username,
        email,
        password: hashedPassword,
        org,
      });

      const token = jwt.sign(
        { userId: result.insertedId, email, name: username, org },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        token,
        user: { id: result.insertedId, username, email, org },
      });

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email and password',
        });
      }

      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email, name: user.username, org: user.org },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: { id: user._id, username: user.username, email: user.email, org: user.org },
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();