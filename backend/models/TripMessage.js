const mongoose = require("mongoose");

const tripMessageSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true, // ✅ fast lookups by trip
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // ✅ fast lookups by user
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500, // ✅ safety + prevents abuse with huge payloads
    },
  },
  { timestamps: true }
);

// ✅ Only return safe fields in JSON
tripMessageSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// ✅ Create compound index for trip + createdAt
// This speeds up "get last N messages in a trip"
tripMessageSchema.index({ trip: 1, createdAt: -1 });

module.exports = mongoose.model("TripMessage", tripMessageSchema);
