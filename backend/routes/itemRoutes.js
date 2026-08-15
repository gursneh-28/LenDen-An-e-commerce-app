const express = require("express");
const router = express.Router();
const multer = require("multer");
const itemController = require("../controllers/itemController");
const verifyToken = require("../middleware/authMiddleware");

const upload = multer({ dest: require("os").tmpdir() });

// Use upload.array("images", 5) to accept up to 5 images under the field name "images"
router.post("/upload", verifyToken, upload.array("images", 5), itemController.uploadItem);
router.get("/all",    verifyToken, itemController.getItems);
router.get("/mine",   verifyToken, itemController.getMyItems);
router.put("/:id",    verifyToken, itemController.updateItem);
router.delete("/:id", verifyToken, itemController.deleteItem);

module.exports = router;