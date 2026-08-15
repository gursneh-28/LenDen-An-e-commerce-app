const userModel      = require('../models/userModel');
const itemModel      = require('../models/itemModel');
const requestModel   = require('../models/requestModel');
const orgRequestModel = require('../models/orgRequestModel');
const walletModel    = require('../models/walletModel');

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
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async getUserItems(req, res) {
        try {
            const { userId } = req.params;
            const user = await userModel.findById(userId);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            if (user.org !== req.user.orgDomain) return res.status(403).json({ success: false, message: 'Unauthorized' });
            const items = await itemModel.getItemsByUser(userId);
            return res.status(200).json({ success: true, items });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async getUserRequests(req, res) {
        try {
            const { userId } = req.params;
            const user = await userModel.findById(userId);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            if (user.org !== req.user.orgDomain) return res.status(403).json({ success: false, message: 'Unauthorized' });
            const requests = await requestModel.getRequestsByEmail(user.email);
            return res.status(200).json({ success: true, requests });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async blockUser(req, res) {
        try {
            const { userId } = req.params;
            const { isBlocked } = req.body;
            const user = await userModel.findById(userId);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            if (user.org !== req.user.orgDomain) return res.status(403).json({ success: false, message: 'Unauthorized' });
            await userModel.updateUserBlockStatus(userId, isBlocked);
            return res.status(200).json({ success: true, message: isBlocked ? 'User blocked' : 'User unblocked' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async deleteUserItem(req, res) {
        try {
            const { itemId } = req.params;
            const item = await itemModel.findById(itemId);
            if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
            await itemModel.deleteItem(itemId);
            return res.status(200).json({ success: true, message: 'Item deleted' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async deleteUserRequest(req, res) {
        try {
            const { requestId } = req.params;
            const request = await requestModel.getRequestById(requestId);
            if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
            await requestModel.deleteRequest(requestId);
            return res.status(200).json({ success: true, message: 'Request deleted' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async getOrganizationStats(req, res) {
        try {
            const orgDomain = req.user.orgDomain;
            const users       = await userModel.getUsersByOrg(orgDomain);
            const items       = await itemModel.getItemsByOrg(orgDomain);
            const orgRequests = await requestModel.getAllRequests(orgDomain);
            return res.status(200).json({
                success: true,
                stats: {
                    totalUsers:      users.length,
                    activeUsers:     users.filter(u => !u.isBlocked).length,
                    totalItems:      items.length,
                    totalRequests:   orgRequests.length,
                    pendingRequests: orgRequests.filter(r => r.status === 'pending').length,
                }
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async promoteToAdmin(req, res) {
        try {
            const { userId } = req.params;
            const user = await userModel.findById(userId);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            if (user.org !== req.user.orgDomain) return res.status(403).json({ success: false, message: 'Unauthorized' });
            await userModel.updateProfile(userId, { role: 'admin', orgDomain: req.user.orgDomain });
            return res.status(200).json({ success: true, message: `${user.username} promoted to admin` });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // ─── GET /api/admin/revenue ───────────────────────────────────────────────
    // Admin sees revenue for their org only.
    // Super admin sees all orgs (checked via role in route middleware).
    async getRevenue(req, res) {
        try {
            const isSuperAdmin = req.user.role === 'super_admin';
            const orgId        = req.user.orgDomain || req.user.org;

            // Fetch summary rows
            const summary = isSuperAdmin
                ? await walletModel.getTotalRevenue()
                : await walletModel.getRevenueByOrg(orgId);

            const recent = await walletModel.getRecentTransactions(isSuperAdmin ? null : orgId, 15);

            // Per-org breakdown only for super admin
            const perOrg = isSuperAdmin
                ? await walletModel.getRevenuePerOrg()
                : null;

            // Shape the summary into friendly totals (amounts stored in paise → divide by 100)
            const totals = {
                listing_fee_admin:          0,
                order_commission_admin:     0,
                request_commission_admin:   0,
                request_commission_super:   0,
            };

            for (const row of summary) {
                const amountRs = (row.total || 0) / 100;
                if (row._id.type === 'listing_fee')             totals.listing_fee_admin          += amountRs;
                if (row._id.type === 'order_commission')        totals.order_commission_admin     += amountRs;
                if (row._id.type === 'request_commission' && row._id.recipient === 'admin')       totals.request_commission_admin  += amountRs;
                if (row._id.type === 'request_commission' && row._id.recipient === 'super_admin') totals.request_commission_super  += amountRs;
            }

            totals.adminTotal      = totals.listing_fee_admin + totals.order_commission_admin + totals.request_commission_admin;
            totals.superAdminTotal = totals.request_commission_super;
            totals.grandTotal      = totals.adminTotal + totals.superAdminTotal;

            return res.status(200).json({
                success: true,
                totals,
                recent: recent.map(r => ({
                    type:      r.type,
                    recipient: r.recipient,
                    amountRs:  (r.amount || 0) / 100,
                    orgId:     r.orgId,
                    createdAt: r.createdAt,
                })),
                ...(perOrg ? { perOrg: perOrg.map(o => ({ orgId: o._id, totalRs: (o.total || 0) / 100, count: o.count })) } : {}),
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new AdminController();