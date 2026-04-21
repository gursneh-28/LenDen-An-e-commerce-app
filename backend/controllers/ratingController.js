const ratingModel = require("../models/ratingModel");

// POST /api/ratings/submit
// body: { ratedEmail, stars, comment, contextId, contextType }
// contextType: "order" | "help"
async function submitRating(req, res) {
  try {
    const { ratedEmail, stars, comment, contextId, contextType } = req.body;

    if (!ratedEmail || !stars || !contextId || !contextType)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    if (stars < 1 || stars > 5)
      return res.status(400).json({ success: false, message: "Stars must be between 1 and 5" });

    if (ratedEmail === req.user.email)
      return res.status(400).json({ success: false, message: "You cannot rate yourself" });

    // Prevent duplicate ratings for the same order/help request
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
      contextType, // "order" or "help"
      org:         req.user.org,
    });

    res.status(201).json({ success: true, message: "Rating submitted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/ratings/user/:email  — all ratings for a specific user
async function getUserRatings(req, res) {
  try {
    const ratings = await ratingModel.getRatingsForUser(req.params.email);
    res.json({ success: true, data: ratings });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/ratings/summary/:email  — average + count for a user
async function getUserRatingSummary(req, res) {
  try {
    const summary = await ratingModel.getRatingSummary(req.params.email);
    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/ratings/mine  — ratings I received
async function getMyRatings(req, res) {
  try {
    const ratings = await ratingModel.getRatingsForUser(req.user.email);
    const summary = await ratingModel.getRatingSummary(req.user.email);
    res.json({ success: true, data: ratings, summary });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/ratings/check/:contextId/:contextType  — did I already rate this?
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