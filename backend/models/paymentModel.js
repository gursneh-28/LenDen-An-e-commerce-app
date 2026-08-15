const mongoDB = require('../config/db');
const { ObjectId } = require('mongodb');

const col = () => mongoDB.getCollection('payments');

async function createPaymentRecord(data) {
    const c = await col();
    const record = {
        ...data,
        status: 'created',   // created | paid | failed
        createdAt: new Date(),
    };
    const result = await c.insertOne(record);
    return { ...record, _id: result.insertedId };
}

async function findByRazorpayOrderId(razorpayOrderId) {
    const c = await col();
    return await c.findOne({ razorpayOrderId });
}

async function markPaid(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const c = await col();
    return await c.updateOne(
        { razorpayOrderId },
        {
            $set: {
                status: 'paid',
                razorpayPaymentId,
                razorpaySignature,
                paidAt: new Date(),
            }
        }
    );
}

async function markFailed(razorpayOrderId) {
    const c = await col();
    return await c.updateOne(
        { razorpayOrderId },
        { $set: { status: 'failed', failedAt: new Date() } }
    );
}

// Check if a payment is valid (paid + correct type) before allowing upload/order
async function isValidPaidPayment(razorpayPaymentId, expectedType) {
    const c = await col();
    const record = await c.findOne({ razorpayPaymentId, status: 'paid', type: expectedType });
    return !!record;
}

module.exports = {
    createPaymentRecord,
    findByRazorpayOrderId,
    markPaid,
    markFailed,
    isValidPaidPayment,
};