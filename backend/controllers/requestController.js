const requestModel = require('../models/requestModel');

async function createRequest(req, res) {
    try {
        const { work, price } = req.body;

        if (!work || !price) {
            return res.status(400).json({
                success: false,
                message: "Work and price are required"
            });
        }

        const result = await requestModel.createRequest({
            work,
            price
        });

        res.status(201).json({
            success: true,
            message: "Request submitted",
            requestId: result.insertedId
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function getRequests(req, res) {
    try {
        const requests = await requestModel.getAllRequests();

        res.json({
            success: true,
            data: requests
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = {
    createRequest,
    getRequests
};