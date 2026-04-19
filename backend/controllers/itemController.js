const cloudinary = require("../config/cloudinary");
const itemModel  = require("../models/itemModel");
const fs         = require("fs");

async function uploadItem(req, res) {
  try {
    const { type, name, description, price, availability, category } = req.body;

    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one image is required" });
    }

    if (!name || !name.trim()) {
      files.forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(400).json({ success: false, message: "Product name is required" });
    }

    const uploadPromises = files.map((file) =>
      cloudinary.uploader.upload(file.path).then((result) => {
        fs.unlink(file.path, () => {});
        return result.secure_url;
      })
    );

    const imageUrls = await Promise.all(uploadPromises);

    const itemData = {
      type,
      name:          name.trim(),         // ← NEW required field
      description:   description || "",   // optional
      price:         Number(price),
      images:        imageUrls,
      image:         imageUrls[0],
      category:      category || "other",
      availability:  type === "rent" ? JSON.parse(availability || "[]") : [],
      uploadedBy:    req.user.email,
      uploaderName:  req.user.name,
      uploaderPhone: req.user.phone || null,
      org:           req.user.org,
    };

    const result = await itemModel.createItem(itemData);

    res.status(201).json({
      success: true,
      message: "Item uploaded successfully",
      itemId:  result.insertedId,
    });
  } catch (error) {
    const files = req.files || (req.file ? [req.file] : []);
    files.forEach((f) => fs.unlink(f.path, () => {}));
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getItems(req, res) {
  try {
    const items = await itemModel.getAllItems(req.user.org);
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
    const { name, description, price, category } = req.body;

    const item = await itemModel.getItemById(id);
    if (!item)
      return res.status(404).json({ success: false, message: "Item not found" });

    if (item.uploadedBy !== req.user.email)
      return res.status(403).json({ success: false, message: "Not authorised" });

    const updateFields = { price: Number(price) };

    if (name && name.trim())       updateFields.name        = name.trim(); // ← NEW
    if (description !== undefined) updateFields.description = description; // can be ""
    if (category)                  updateFields.category    = category;

    await itemModel.updateItem(id, updateFields);
    res.json({ success: true, message: "Item updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteItem(req, res) {
  try {
    const { id } = req.params;

    const item = await itemModel.getItemById(id);
    if (!item)
      return res.status(404).json({ success: false, message: "Item not found" });

    if (item.uploadedBy !== req.user.email)
      return res.status(403).json({ success: false, message: "Not authorised" });

    await itemModel.deleteItem(id);
    res.json({ success: true, message: "Item deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { uploadItem, getItems, getMyItems, updateItem, deleteItem };