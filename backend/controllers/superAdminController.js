// backend/controllers/superAdminController.js
const orgRequestModel = require('../models/orgRequestModel');
const superAdminModel = require('../models/superAdminModel');
const userModel = require('../models/userModel');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Define sendStatusEmail function inside the file
async function sendStatusEmail(email, orgName, status, rejectionReason = null) {
    const subject = `Organization Registration ${status === 'approved' ? 'Approved' : 'Rejected'}`;
    const html = `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
            <h2>Organization Registration Update</h2>
            <p>Dear Admin,</p>
            <p>Your organization <strong>${orgName}</strong> has been <strong>${status}</strong>.</p>
            ${rejectionReason ? `<p>Reason: ${rejectionReason}</p>` : ''}
            <p>${status === 'approved' ? 'You can now login to your admin dashboard.' : 'Please contact support for more information.'}</p>
            <p>Best regards,<br>Lenden Team</p>
        </div>
    `;
    
    await transporter.sendMail({
        from: `"Lenden" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
    });
}

class SuperAdminController {
    async getPendingOrganizations(req, res) {
        try {
            const orgRequests = await orgRequestModel.findByStatus('pending');
            return res.status(200).json({ success: true, organizations: orgRequests });
        } catch (error) {
            console.error('Get pending organizations error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async getAllOrganizations(req, res) {
        try {
            const orgRequests = await orgRequestModel.findAll();
            const orgsWithMembers = await Promise.all(
                orgRequests.map(async (org) => {
                    let memberCount = 0;
                    if (org.status === 'approved' && org.domain) {
                        try {
                            memberCount = await userModel.getUserCountByOrg(org.domain);
                        } catch (err) {
                            console.error('Error getting member count:', err);
                            memberCount = 0;
                        }
                    }
                    return { ...org, memberCount };
                })
            );
            return res.status(200).json({ success: true, organizations: orgsWithMembers });
        } catch (error) {
            console.error('Get all organizations error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async approveOrganization(req, res) {
        try {
            const { orgId } = req.params;
            const orgRequest = await orgRequestModel.findById(orgId);
            
            if (!orgRequest) {
                return res.status(404).json({ success: false, message: 'Organization request not found' });
            }
            
            await orgRequestModel.updateStatus(orgId, 'approved');
            
            // Send email notification
            await sendStatusEmail(orgRequest.adminEmail, orgRequest.orgName, 'approved');
            
            // Refresh allowed domains (import authController at top)
            const authController = require('./authController');
            if (authController.refreshAllowedDomains) {
                await authController.refreshAllowedDomains();
            }
            
            return res.status(200).json({ success: true, message: 'Organization approved successfully' });
        } catch (error) {
            console.error('Approve organization error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async rejectOrganization(req, res) {
        try {
            const { orgId } = req.params;
            const { reason } = req.body;
            const orgRequest = await orgRequestModel.findById(orgId);
            
            if (!orgRequest) {
                return res.status(404).json({ success: false, message: 'Organization request not found' });
            }
            
            await orgRequestModel.updateStatus(orgId, 'rejected', reason);
            await sendStatusEmail(orgRequest.adminEmail, orgRequest.orgName, 'rejected', reason);
            
            return res.status(200).json({ success: true, message: 'Organization rejected successfully' });
        } catch (error) {
            console.error('Reject organization error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async makeSuperAdmin(req, res) {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }
            
            const existingSuperAdmin = await superAdminModel.findByEmail(email);
            if (existingSuperAdmin) {
                return res.status(400).json({ success: false, message: 'User is already a super admin' });
            }
            
            await superAdminModel.createSuperAdmin(email, '122333');
            
            await transporter.sendMail({
                from: `"Lenden" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'You have been made a Super Admin',
                html: `
                    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
                        <h2>Super Admin Privileges Granted</h2>
                        <p>You have been granted Super Admin privileges on Lenden.</p>
                        <p>You can now login with your email and password: <strong>122333</strong></p>
                        <p>Please change your password after logging in.</p>
                        <p>Best regards,<br>Lenden Team</p>
                    </div>
                `,
            });
            
            return res.status(200).json({ success: true, message: 'Super admin added successfully' });
        } catch (error) {
            console.error('Make super admin error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async getOrganizationDetails(req, res) {
        try {
            const { orgId } = req.params;
            const orgRequest = await orgRequestModel.findById(orgId);
            
            if (!orgRequest) {
                return res.status(404).json({ success: false, message: 'Organization not found' });
            }
            
            let users = [];
            if (orgRequest.status === 'approved' && orgRequest.domain) {
                users = await userModel.getUsersByOrg(orgRequest.domain);
            }
            
            return res.status(200).json({ 
                success: true, 
                organization: orgRequest,
                users: users.map(u => ({
                    id: u._id,
                    username: u.username,
                    email: u.email,
                    isBlocked: u.isBlocked || false
                }))
            });
        } catch (error) {
            console.error('Get organization details error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new SuperAdminController();