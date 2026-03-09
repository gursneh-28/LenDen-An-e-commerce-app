const express = require("express");
const router = express.Router();
const multer = require("multer");
const itemController = require("../controllers/itemController");
const verifyToken = require("../middleware/authMiddleware");

const upload = multer({ dest: "uploads/" });

router.post("/upload", verifyToken, upload.single("image"), itemController.uploadItem);
router.get("/all",    verifyToken, itemController.getItems);
router.get("/mine",   verifyToken, itemController.getMyItems);
router.put("/:id",    verifyToken, itemController.updateItem);
router.delete("/:id", verifyToken, itemController.deleteItem);

module.exports = router;