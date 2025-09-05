const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // ✅ fast "get my incomes"
    },
    icon: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    description: {
      type: String,
      default: 'No description',
      trim: true,
      maxlength: 500
    },
    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true // ✅ fast filtering by source
    },
    amount: {
      type: Number,
      required: true,
      min: 0 // ✅ no negative income
    },
    date: {
      type: Date,
      default: Date.now,
      index: true // ✅ faster date range queries
    },
  },
  { timestamps: true }
);

// ✅ Compound indexes
incomeSchema.index({ userId: 1, date: -1 }); // "get my incomes sorted by latest"
incomeSchema.index({ userId: 1, source: 1, date: -1 }); // filter by source + date

// ✅ Clean JSON output
incomeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Income = mongoose.model('Income', incomeSchema);
module.exports = Income;
