const cloudinary = require("../config/cloudinary");
const itemModel = require("../models/itemModel");
const fs = require("fs");

async function uploadItem(req, res) {
  try {
    const { type, description, price, availability } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image required" });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path);

    // Delete the temp file from uploads/ folder — no longer needed
    fs.unlink(req.file.path, () => {});

    const itemData = {
      type,
      description,
      price: Number(price),
      image: uploadResult.secure_url,
      availability: type === "rent" ? JSON.parse(availability) : [],
      uploadedBy: req.user.email,     // from JWT
      uploaderName: req.user.name,    // from JWT
    };

    const result = await itemModel.createItem(itemData);

    res.status(201).json({
      success: true,
      message: "Item uploaded successfully",
      itemId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getItems(req, res) {
  try {
    const items = await itemModel.getAllItems();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getMyItems(req, res) {
  try {
    const items = await itemModel.getItemsByEmail(req.user.email);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateItem(req, res) {
  try {
    const { id } = req.params;
    const { description, price } = req.body;

    const item = await itemModel.getItemById(id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    // Only the owner can edit
    if (item.uploadedBy !== req.user.email) {
      return res.status(403).json({ success: false, message: "Not authorised" });
    }

    await itemModel.updateItem(id, { description, price: Number(price) });
    res.json({ success: true, message: "Item updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteItem(req, res) {
  try {
    const { id } = req.params;

    const item = await itemModel.getItemById(id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    // Only the owner can delete
    if (item.uploadedBy !== req.user.email) {
      return res.status(403).json({ success: false, message: "Not authorised" });
    }

    await itemModel.deleteItem(id);
    res.json({ success: true, message: "Item deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { uploadItem, getItems, getMyItems, updateItem, deleteItem };