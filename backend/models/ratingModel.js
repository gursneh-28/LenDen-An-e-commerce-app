const mongoDB = require("../config/db");
const { ObjectId } = require("mongodb");

const col = () => mongoDB.getCollection("ratings");

// Create a rating
async function createRating(data) {
  const c = await col();
  return await c.insertOne({ ...data, createdAt: new Date() });
}

// Get all ratings for a user (they were the rated person)
async function getRatingsForUser(ratedEmail) {
  const c = await col();
  return await c.find({ ratedEmail }).sort({ createdAt: -1 }).toArray();
}

// Get average rating + count for a user
async function getRatingSummary(ratedEmail) {
  const c = await col();
  const ratings = await c.find({ ratedEmail }).toArray();
  if (ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((acc, r) => acc + r.stars, 0);
  return {
    average: Math.round((sum / ratings.length) * 10) / 10,
    count: ratings.length,
  };
}

// Check if rater already rated this specific context (prevent duplicate)
async function hasRated(raterEmail, contextId, contextType) {
  const c = await col();
  const existing = await c.findOne({ raterEmail, contextId, contextType });
  return !!existing;
}

module.exports = { createRating, getRatingsForUser, getRatingSummary, hasRated };