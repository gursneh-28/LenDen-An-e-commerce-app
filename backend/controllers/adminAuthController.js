const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const orgRequestModel = require('../models/orgRequestModel');
const superAdminModel = require('../models/superAdminModel');
const userModel = require('../models/userModel');

// OTP store for admin registration
const adminOtpStore = new Map();

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

async function sendOtpEmail(email, otp) {
    await transporter.sendMail({
        from: `"Lenden" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify your email for Organization Registration',
        html: `
            <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display:inline-block; background:#1A1A1A; color:#FAFAF7; width:48px; height:48px; border-radius:14px; font-size:24px; line-height:48px; text-align:center;">↕</div>
                    <h2 style="margin:12px 0 4px; font-size:28px;">lenden</h2>
                </div>
                <p>Your verification code for organization registration is:</p>
                <div style="text-align:center; background:#F4F4F0; border-radius:14px; padding:28px; margin:24px 0;">
                    <span style="font-size:40px; font-weight:700; letter-spacing:8px;">${otp}</span>
                </div>
                <p>This code expires in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        `,
    });
}

class AdminAuthController {
    async sendAdminOtp(req, res) {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }

            // Check if organization already exists
            const existingRequest = await orgRequestModel.findByEmail(email);
            if (existingRequest) {
                return res.status(400).json({ success: false, message: 'Organization already registered with this email' });
            }

            // Check if user already exists
            const existingUser = await userModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Email already registered as a user' });
            }

            const otp = generateOtp();
            const expiresAt = Date.now() + 10 * 60 * 1000;
            
            adminOtpStore.set(email, { otp, expiresAt });
            await sendOtpEmail(email, otp);
            
            return res.status(200).json({ success: true, message: 'OTP sent to your email' });
        } catch (error) {
            console.error('Send admin OTP error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async registerOrganization(req, res) {
        try {
            const { orgName, adminEmail, adminName, contactNumber, password, domain, otp } = req.body;
            
            if (!orgName || !adminEmail || !adminName || !contactNumber || !password || !domain || !otp) {
                return res.status(400).json({ success: false, message: 'All fields are required' });
            }

            // Verify OTP
            const record = adminOtpStore.get(adminEmail);
            if (!record) {
                return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
            }
            if (Date.now() > record.expiresAt) {
                adminOtpStore.delete(adminEmail);
                return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
            }
            if (record.otp !== otp) {
                return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
            }

            // Clear OTP
            adminOtpStore.delete(adminEmail);
            
            // Check again if organization exists
            const existingRequest = await orgRequestModel.findByEmail(adminEmail);
            if (existingRequest) {
                return res.status(400).json({ success: false, message: 'Organization already registered with this email' });
            }
            
            const existingUser = await userModel.findByEmail(adminEmail);
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Email already registered as a user' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const orgRequest = await orgRequestModel.createOrgRequest({
                orgName,
                adminEmail,
                adminName,
                contactNumber,
                password: hashedPassword,
                domain: domain.toLowerCase(),
                status: 'pending'
            });
            
            return res.status(201).json({
                success: true,
                message: 'Organization registration request submitted successfully. You will receive an email once approved.',
                organization: { id: orgRequest._id, orgName, status: 'pending' }
            });
        } catch (error) {
            console.error('Register organization error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async adminLogin(req, res) {
        try {
            const { email, password } = req.body;
            
            // Check super admin
            const superAdmin = await superAdminModel.findByEmail(email);
            if (superAdmin && superAdmin.password === password) {
                const token = jwt.sign(
                    { userId: superAdmin._id, email: superAdmin.email, role: 'super_admin' },
                    process.env.JWT_SECRET,
                    { expiresIn: '7d' }
                );
                return res.status(200).json({
                    success: true,
                    message: 'Super admin login successful',
                    token,
                    user: { email: superAdmin.email, role: 'super_admin' }
                });
            }
            
            // Check organization admin
            const orgRequest = await orgRequestModel.findByEmail(email);
            if (!orgRequest) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            
            if (orgRequest.status !== 'approved') {
                return res.status(403).json({ 
                    success: false, 
                    message: `Organization registration is ${orgRequest.status}. Please wait for approval.` 
                });
            }
            
            const isPasswordValid = await bcrypt.compare(password, orgRequest.password);
            if (!isPasswordValid) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            
            const token = jwt.sign(
                { 
                    userId: orgRequest._id, 
                    email: orgRequest.adminEmail, 
                    role: 'admin', 
                    orgDomain: orgRequest.domain, 
                    orgName: orgRequest.orgName 
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            return res.status(200).json({
                success: true,
                message: 'Admin login successful',
                token,
                user: { 
                    email: orgRequest.adminEmail, 
                    role: 'admin', 
                    orgName: orgRequest.orgName,
                    orgDomain: orgRequest.domain
                }
            });
        } catch (error) {
            console.error('Admin login error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new AdminAuthController();