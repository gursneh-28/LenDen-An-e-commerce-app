// backend/controllers/adminController.js
const userModel = require('../models/userModel');
const itemModel = require('../models/itemModel');
const requestModel = require('../models/requestModel'); // User help requests
const orgRequestModel = require('../models/orgRequestModel'); // Org registration requests

class AdminController {
    async getOrganizationUsers(req, res) {
        try {
            const orgDomain = req.user.orgDomain;
            const users = await userModel.getUsersByOrg(orgDomain);
            
            return res.status(200).json({ 
                success: true, 
                users: users.map(u => ({
                    id: u._id,
                    username: u.username,
                    email: u.email,
                    isBlocked: u.isBlocked || false,
                    createdAt: u.createdAt
                }))
            });
        } catch (error) {
            console.error('Get organization users error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async getUserItems(req, res) {
        try {
            const { userId } = req.params;
            const user = await userModel.findById(userId);
            
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            const orgDomain = req.user.orgDomain;
            if (user.org !== orgDomain) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }
            
            const items = await itemModel.getItemsByUser(userId);
            return res.status(200).json({ success: true, items });
        } catch (error) {
            console.error('Get user items error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async getUserRequests(req, res) {
        try {
            const { userId } = req.params;
            const user = await userModel.findById(userId);
            
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            const orgDomain = req.user.orgDomain;
            if (user.org !== orgDomain) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }
            
            // Use getRequestsByEmail from requestModel
            const requests = await requestModel.getRequestsByEmail(user.email);
            return res.status(200).json({ success: true, requests });
        } catch (error) {
            console.error('Get user requests error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async blockUser(req, res) {
        try {
            const { userId } = req.params;
            const { isBlocked } = req.body;
            
            const user = await userModel.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            const orgDomain = req.user.orgDomain;
            if (user.org !== orgDomain) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }
            
            await userModel.updateUserBlockStatus(userId, isBlocked);
            
            return res.status(200).json({ 
                success: true, 
                message: isBlocked ? 'User blocked successfully' : 'User unblocked successfully' 
            });
        } catch (error) {
            console.error('Block user error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async deleteUserItem(req, res) {
        try {
            const { itemId } = req.params;
            const item = await itemModel.findById(itemId);
            
            if (!item) {
                return res.status(404).json({ success: false, message: 'Item not found' });
            }
            
            const user = await userModel.findById(item.uploaderId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            const orgDomain = req.user.orgDomain;
            if (user.org !== orgDomain) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }
            
            await itemModel.deleteItem(itemId);
            
            return res.status(200).json({ success: true, message: 'Item deleted successfully' });
        } catch (error) {
            console.error('Delete user item error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async deleteUserRequest(req, res) {
        try {
            const { requestId } = req.params;
            
            // First get the request to check if user belongs to this org
            const request = await requestModel.getRequestById(requestId);
            
            if (!request) {
                return res.status(404).json({ success: false, message: 'Request not found' });
            }
            
            // Get the user who made the request
            const user = await userModel.findByEmail(request.requestedBy);
            
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            const orgDomain = req.user.orgDomain;
            if (user.org !== orgDomain) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }
            
            // Delete the request
            await requestModel.deleteRequest(requestId);
            
            return res.status(200).json({ success: true, message: 'Request deleted successfully' });
        } catch (error) {
            console.error('Delete user request error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    
    async getOrganizationStats(req, res) {
        try {
            const orgDomain = req.user.orgDomain;
            const users = await userModel.getUsersByOrg(orgDomain);
            const items = await itemModel.getItemsByOrg(orgDomain);
            
            // Get all requests for this organization using getAllRequests
            const orgRequests = await requestModel.getAllRequests(orgDomain);
            
            return res.status(200).json({ 
                success: true, 
                stats: {
                    totalUsers: users.length,
                    activeUsers: users.filter(u => !u.isBlocked).length,
                    totalItems: items.length,
                    totalRequests: orgRequests.length,
                    pendingRequests: orgRequests.filter(r => r.status === 'pending').length
                }
            });
        } catch (error) {
            console.error('Get organization stats error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new AdminController();