const express = require("express");
const router = express.Router();
const multer = require("multer");

const itemController = require("../controllers/itemController");

const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("image"), itemController.uploadItem);

router.get("/all", itemController.getItems);

module.exports = router;