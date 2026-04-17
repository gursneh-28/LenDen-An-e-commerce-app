const orderModel = require("../models/orderModel");
const itemModel  = require("../models/itemModel");

// POST /api/orders/create
async function createOrder(req, res) {
  try {
    const { itemId, type, rentStart, rentEnd } = req.body;

    const item = await itemModel.getItemById(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    if (item.uploadedBy === req.user.email)
      return res.status(400).json({ success: false, message: "You can't buy your own item" });

    const orderData = {
      itemId,
      itemDescription: item.description,
      itemImage:       item.images?.[0] || item.image || null,
      itemPrice:       item.price,
      itemType:        item.type,
      orderType:       type,
      buyerEmail:      req.user.email,
      buyerName:       req.user.name,
      sellerEmail:     item.uploadedBy,
      sellerName:      item.uploaderName,
      sellerPhone:     item.uploaderPhone || null,
      status:          "pending",
      ...(type === "rent" && rentStart && rentEnd ? { rentStart, rentEnd } : {}),
    };

    const result = await orderModel.createOrder(orderData);
    res.status(201).json({ success: true, orderId: result.insertedId });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/orders/mine
async function getMyOrders(req, res) {
  try {
    const orders = await orderModel.getOrdersByBuyer(req.user.email);
    res.json({ success: true, data: orders });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/orders/selling
async function getSellingOrders(req, res) {
  try {
    const orders = await orderModel.getOrdersBySeller(req.user.email);
    res.json({ success: true, data: orders });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// PATCH /api/orders/:id/status
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await orderModel.getOrderById(id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.sellerEmail !== req.user.email && order.buyerEmail !== req.user.email)
      return res.status(403).json({ success: false, message: "Not authorised" });

    await orderModel.updateOrderStatus(id, status);
    res.json({ success: true, message: `Order ${status}` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { createOrder, getMyOrders, getSellingOrders, updateStatus };