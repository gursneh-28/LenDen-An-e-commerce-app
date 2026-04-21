const express = require("express");
const router  = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const {
  submitRating, getUserRatings, getUserRatingSummary, getMyRatings, checkRated,
} = require("../controllers/ratingController");

router.post("/submit",                     verifyToken, submitRating);
router.get("/mine",                        verifyToken, getMyRatings);
router.get("/user/:email",                 verifyToken, getUserRatings);
router.get("/summary/:email",              verifyToken, getUserRatingSummary);
router.get("/check/:contextId/:contextType", verifyToken, checkRated);

module.exports = router;