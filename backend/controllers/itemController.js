const cloudinary = require("../config/cloudinary");
const itemModel = require("../models/itemModel");

async function uploadItem(req, res) {
  try {

    const { type, description, price, availability } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    const uploadResult = await cloudinary.uploader.upload(req.file.path);

    const itemData = {
      type,
      description,
      price: Number(price),
      image: uploadResult.secure_url,
      availability: type === "rent" ? JSON.parse(availability) : []
    };

    const result = await itemModel.createItem(itemData);

    res.status(201).json({
      success: true,
      message: "Item uploaded successfully",
      itemId: result.insertedId
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getItems(req, res) {
  try {

    const items = await itemModel.getAllItems();

    res.json({
      success: true,
      data: items
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  uploadItem,
  getItems
};