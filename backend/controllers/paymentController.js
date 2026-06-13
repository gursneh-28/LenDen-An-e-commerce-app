const Razorpay = require('razorpay');
const crypto   = require('crypto');
const paymentModel = require('../models/paymentModel');
const walletModel  = require('../models/walletModel');
const itemModel    = require('../models/itemModel');

const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Commission rates ─────────────────────────────────────────────────────────
const LISTING_FEE_PERCENT   = 0.02;   // 2% of item price
const ORDER_COMMISSION_PCT  = 0.02;   // 2% of order total (already in your orderController)
// Request commission handled separately when request payment is built (Phase 2.3)

// ─── POST /api/payments/create-order ─────────────────────────────────────────
// Frontend sends: { amount (in rupees), type, relatedId, description }
// We convert to paise (×100) for Razorpay
async function createOrder(req, res) {
    try {
        const { amount, type, relatedId, description } = req.body;

        if (!amount || !type || !relatedId) {
            return res.status(400).json({ success: false, message: 'amount, type, and relatedId are required' });
        }

        const validTypes = ['listing_fee', 'order_payment', 'request_payment'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid payment type' });
        }

        const amountInPaise = Math.round(Number(amount) * 100);

        if (amountInPaise < 100) {  // Razorpay minimum is ₹1
            return res.status(400).json({ success: false, message: 'Amount too low (minimum ₹1)' });
        }

        // Create order on Razorpay
        const razorpayOrder = await razorpay.orders.create({
            amount:   amountInPaise,
            currency: 'INR',
            receipt:  `lenden_${type}_${Date.now()}`,
            notes:    { type, relatedId, userId: req.user._id || req.user.id, org: req.user.org },
        });

        // Save to our DB with status 'created'
        await paymentModel.createPaymentRecord({
            razorpayOrderId: razorpayOrder.id,
            type,
            amountInPaise,
            relatedId,
            userId:   req.user._id || req.user.id,
            userEmail: req.user.email,
            orgId:    req.user.org,
            description: description || type,
        });

        return res.status(201).json({
            success:  true,
            orderId:  razorpayOrder.id,     // this goes to frontend Razorpay SDK
            amount:   amountInPaise,
            currency: 'INR',
            keyId:    process.env.RAZORPAY_KEY_ID,   // frontend needs this (NOT the secret)
        });

    } catch (error) {
        console.error('Create payment order error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

// ─── POST /api/payments/verify ────────────────────────────────────────────────
// Frontend sends: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// We verify the HMAC signature — this is the only safe way to confirm payment
async function verifyPayment(req, res) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment verification params' });
        }

        // 1. Verify signature using HMAC-SHA256
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            await paymentModel.markFailed(razorpay_order_id);
            return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
        }

        // 2. Signature valid — mark payment as paid
        await paymentModel.markPaid(razorpay_order_id, razorpay_payment_id, razorpay_signature);

        // 3. Fetch the payment record to log commission correctly
        const paymentRecord = await paymentModel.findByRazorpayOrderId(razorpay_order_id);

        // 4. Log commission to wallet
        if (paymentRecord) {
            let commissionAmount = paymentRecord.amountInPaise;  // default: full amount is platform revenue

            if (paymentRecord.type === 'order_payment') {
                // For orders: only 2% commission goes to platform, rest goes to seller
                // The order controller already calculated platformFee — wallet gets only that
                // We calculate it here from the order amount
                commissionAmount = Math.round(paymentRecord.amountInPaise * (ORDER_COMMISSION_PCT / (1 + ORDER_COMMISSION_PCT)));
            }
            // For listing_fee: 100% goes to platform — commissionAmount stays as-is

            await walletModel.logCommission({
                type:              paymentRecord.type === 'order_payment' ? 'order_commission' : paymentRecord.type,
                amount:            commissionAmount,
                orgId:             paymentRecord.orgId,
                userId:            paymentRecord.userId,
                relatedPaymentId:  razorpay_payment_id,
                relatedEntityId:   paymentRecord.relatedId,
            });
        }

        return res.status(200).json({
            success:   true,
            message:   'Payment verified successfully',
            paymentId: razorpay_payment_id,
        });

    } catch (error) {
        console.error('Verify payment error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { createOrder, verifyPayment };