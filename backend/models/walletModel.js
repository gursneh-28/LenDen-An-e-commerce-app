const mongoDB = require('../config/db');

const col = () => mongoDB.getCollection('wallet');

async function logCommission(data) {
    const c = await col();
    return await c.insertOne({
        ...data,
        createdAt: new Date(),
    });
}

// Revenue summary for admin dashboard — scoped to one org
async function getRevenueByOrg(orgId) {
    const c = await col();
    const rows = await c.aggregate([
        { $match: { orgId } },
        { $group: { _id: { type: '$type', recipient: '$recipient' }, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]).toArray();
    return rows;
}

// Revenue summary for super admin — all orgs
async function getTotalRevenue() {
    const c = await col();
    const rows = await c.aggregate([
        { $group: { _id: { type: '$type', recipient: '$recipient' }, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]).toArray();
    return rows;
}

// Recent transactions — for dashboard table
async function getRecentTransactions(orgId, limit = 20) {
    const c = await col();
    const query = orgId ? { orgId } : {};
    return await c.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
}

// Super admin only — breakdown per org
async function getRevenuePerOrg() {
    const c = await col();
    return await c.aggregate([
        { $group: { _id: '$orgId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
    ]).toArray();
}

module.exports = { logCommission, getRevenueByOrg, getTotalRevenue, getRecentTransactions, getRevenuePerOrg };