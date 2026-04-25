const orderModel = require("../models/orderModel");
const itemModel  = require("../models/itemModel");
const notificationModel = require("../models/notificationModel");

// POST /api/orders/create
async function createOrder(req, res) {
  try {
    const { itemId, type, rentStart, rentEnd } = req.body;

    const item = await itemModel.getItemById(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    if (item.uploadedBy === req.user.email)
      return res.status(400).json({ success: false, message: "You can't buy your own item" });

    const platformFee = Math.round(item.price * 0.02);
    const total       = item.price + platformFee;

    const orderData = {
      itemId,
      itemName:        item.name || "",
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
      paymentMethod:   req.body.paymentMethod || "cod",
      platformFee,
      total,
      org:             req.user.org,
      ...(type === "rent" && rentStart && rentEnd ? { rentStart, rentEnd } : {}),
    };

    const result = await orderModel.createOrder(orderData);

    // Notify seller about new order
    await notificationModel.createNotification({
      recipientEmail: item.uploadedBy,
      type:           "order",
      title:          "New order received",
      body:           `${req.user.name || req.user.email} wants to ${type === "rent" ? "rent" : "buy"} your item "${item.name || "your item"}"`,
      meta:           { orderId: result.insertedId, itemName: item.name },
      org:            req.user.org,
    });

    res.status(201).json({
      success:     true,
      orderId:     result.insertedId,
      platformFee,
      total,
    });
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

    // Notify the other party about status change
    const isSeller    = req.user.email === order.sellerEmail;
    const notifyEmail = isSeller ? order.buyerEmail : order.sellerEmail;

    const STATUS_MESSAGES = {
      confirmed:  { title: "Order confirmed",   body: `Your order for "${order.itemName || "an item"}" has been confirmed by the seller.` },
      completed:  { title: "Order completed",   body: `Your order for "${order.itemName || "an item"}" has been marked as completed.`  },
      cancelled:  { title: "Order cancelled",   body: `Your order for "${order.itemName || "an item"}" has been cancelled.`            },
    };

    const msgConfig = STATUS_MESSAGES[status];
    if (msgConfig) {
      await notificationModel.createNotification({
        recipientEmail: notifyEmail,
        type:           "order",
        title:          msgConfig.title,
        body:           msgConfig.body,
        meta:           { orderId: id, itemName: order.itemName },
        org:            order.org || req.user.org,
      });
    }

    res.json({ success: true, message: `Order ${status}` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { createOrder, getMyOrders, getSellingOrders, updateStatus };