// backend/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const userModel = require('../models/userModel');
const orgRequestModel = require('../models/orgRequestModel');

// ─── Dynamic Allowed Domains (loaded from approved organizations) ────────────
let ALLOWED_DOMAINS = new Set();

// Function to refresh allowed domains from database
async function refreshAllowedDomains() {
    try {
        // Only try to fetch if database is initialized
        if (!orgRequestModel || typeof orgRequestModel.findByStatus !== 'function') {
            console.log('⏳ Waiting for database connection...');
            return;
        }
        
        const approvedOrgs = await orgRequestModel.findByStatus('approved');
        const domains = approvedOrgs.map(org => org.domain.toLowerCase());
        ALLOWED_DOMAINS = new Set(domains);
        console.log('✅ Allowed domains refreshed:', Array.from(ALLOWED_DOMAINS));
    } catch (error) {
        console.error('Failed to refresh allowed domains:', error.message);
        // Don't throw error, just log it
    }
}

// Don't call refreshAllowedDomains immediately at top level
// Export it so server.js can call it after database connection

// ─── OTP Store (in-memory, replace with Redis in production) ─────────────────
const otpStore = new Map();

// ─── Nodemailer transporter ──────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getDomainFromEmail(email) {
    return email.split('@')[1]?.toLowerCase() ?? '';
}

async function sendOtpEmail(email, otp) {
    await transporter.sendMail({
        from: `"Lenden" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Lenden verification code',
        html: `
            <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1A1A1A;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display:inline-block; background:#1A1A1A; color:#FAFAF7; width:48px; height:48px; border-radius:14px; font-size:24px; line-height:48px; text-align:center;">↕</div>
                    <h2 style="margin:12px 0 4px; font-size:28px; letter-spacing:-1px;">lenden</h2>
                    <p style="color:#888880; font-size:13px; margin:0;">campus lending, simplified</p>
                </div>
                <p style="font-size:16px; margin-bottom:8px;">Hi there,</p>
                <p style="font-size:15px; color:#444; line-height:1.6; margin-bottom:32px;">
                    Here is your one-time verification code. It expires in <strong>10 minutes</strong>.
                </p>
                <div style="text-align:center; background:#F4F4F0; border-radius:14px; padding:28px; margin-bottom:32px;">
                    <span style="font-size:40px; font-weight:700; letter-spacing:12px; color:#1A1A1A;">${otp}</span>
                </div>
                <p style="font-size:13px; color:#AAAAAA; text-align:center;">
                    If you didn't request this, you can safely ignore this email.
                </p>
            </div>
        `,
    });
}

class AuthController {
    async sendOtp(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }

            const domain = getDomainFromEmail(email);
            if (!ALLOWED_DOMAINS.has(domain)) {
                return res.status(403).json({
                    success: false,
                    message: `Email domain @${domain} is not allowed. Please use your organization's email domain.`,
                });
            }

            const existing = await userModel.findByEmail(email);
            if (existing) {
                return res.status(400).json({ success: false, message: 'An account with this email already exists' });
            }

            const otp = generateOtp();
            const expiresAt = Date.now() + 10 * 60 * 1000;

            otpStore.set(email, { otp, expiresAt });

            await sendOtpEmail(email, otp);

            return res.status(200).json({ success: true, message: 'OTP sent to your email' });
        } catch (error) {
            console.error('Send OTP error:', error);
            return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
        }
    }

    async verifyOtpAndSignup(req, res) {
        try {
            const { username, email, password, otp } = req.body;

            if (!username || !email || !password || !otp) {
                return res.status(400).json({ success: false, message: 'All fields are required' });
            }

            const record = otpStore.get(email);
            if (!record) {
                return res.status(400).json({ success: false, message: 'No OTP found for this email. Please request a new one.' });
            }
            if (Date.now() > record.expiresAt) {
                otpStore.delete(email);
                return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
            }
            if (record.otp !== otp) {
                return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
            }

            otpStore.delete(email);

            const existing = await userModel.findByEmail(email);
            if (existing) {
                return res.status(400).json({ success: false, message: 'An account with this email already exists' });
            }

            const domain = getDomainFromEmail(email);
            const hashedPassword = await bcrypt.hash(password, 10);

            await userModel.createUser({
                username,
                email,
                password: hashedPassword,
                org: domain,
                emailVerified: true,
            });

            return res.status(201).json({
                success: true,
                message: 'Account created successfully',
            });

        } catch (error) {
            console.error('Verify OTP error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
        
            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Please provide email and password' });
            }
          
            const user = await userModel.findByEmail(email);
            
            // Check if user exists
            if (!user) {
                // Check if this email is from an allowed domain but not registered
                const domain = getDomainFromEmail(email);
                if (ALLOWED_DOMAINS.has(domain)) {
                    return res.status(401).json({ 
                        success: false, 
                        message: 'No account found with this email. Please sign up first.' 
                    });
                } else {
                    return res.status(401).json({ 
                        success: false, 
                        message: `Email domain @${domain} is not allowed. Please use your organization's email domain.` 
                    });
                }
            }
          
            if (!user.emailVerified) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Please verify your email before logging in.' 
                });
            }
          
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid email or password' 
                });
            }
          
            const token = jwt.sign(
                { userId: user._id, email: user.email, name: user.username, org: user.org, role: 'user' },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
          
            return res.status(200).json({
                success: true,
                message: 'Login successful',
                token,
                user: { id: user._id, username: user.username, email: user.email, org: user.org, role: 'user' },
            });
          
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new AuthController();
module.exports.refreshAllowedDomains = refreshAllowedDomains;