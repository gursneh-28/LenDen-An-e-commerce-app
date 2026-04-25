const ratingModel = require("../models/ratingModel");
const notificationModel = require("../models/notificationModel");

// POST /api/ratings/submit
async function submitRating(req, res) {
  try {
    const { ratedEmail, stars, comment, contextId, contextType } = req.body;

    if (!ratedEmail || !stars || !contextId || !contextType)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    if (stars < 1 || stars > 5)
      return res.status(400).json({ success: false, message: "Stars must be between 1 and 5" });

    if (ratedEmail === req.user.email)
      return res.status(400).json({ success: false, message: "You cannot rate yourself" });

    const alreadyRated = await ratingModel.hasRated(req.user.email, contextId, contextType);
    if (alreadyRated)
      return res.status(400).json({ success: false, message: "You already rated this" });

    await ratingModel.createRating({
      raterEmail:  req.user.email,
      raterName:   req.user.name,
      ratedEmail,
      stars:       Number(stars),
      comment:     comment?.trim() || "",
      contextId,
      contextType,
      org:         req.user.org,
    });

    // Notify the rated user
    const STAR_LABELS = { 1: "⭐", 2: "⭐⭐", 3: "⭐⭐⭐", 4: "⭐⭐⭐⭐", 5: "⭐⭐⭐⭐⭐" };
    const contextLabel = contextType === "order" ? "a purchase" : "a help request";

    await notificationModel.createNotification({
      recipientEmail: ratedEmail,
      type:           "rating",
      title:          "You received a new rating",
      body:           `${req.user.name || req.user.email} rated you ${STAR_LABELS[stars]} for ${contextLabel}${comment?.trim() ? `: "${comment.trim().slice(0, 60)}"` : "."}`,
      meta:           { contextId, contextType, stars, raterEmail: req.user.email },
      org:            req.user.org,
    });

    res.status(201).json({ success: true, message: "Rating submitted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/ratings/user/:email
async function getUserRatings(req, res) {
  try {
    const ratings = await ratingModel.getRatingsForUser(req.params.email);
    res.json({ success: true, data: ratings });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/ratings/summary/:email
async function getUserRatingSummary(req, res) {
  try {
    const summary = await ratingModel.getRatingSummary(req.params.email);
    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/ratings/mine
async function getMyRatings(req, res) {
  try {
    const ratings = await ratingModel.getRatingsForUser(req.user.email);
    const summary = await ratingModel.getRatingSummary(req.user.email);
    res.json({ success: true, data: ratings, summary });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/ratings/check/:contextId/:contextType
async function checkRated(req, res) {
  try {
    const { contextId, contextType } = req.params;
    const rated = await ratingModel.hasRated(req.user.email, contextId, contextType);
    res.json({ success: true, rated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { submitRating, getUserRatings, getUserRatingSummary, getMyRatings, checkRated };