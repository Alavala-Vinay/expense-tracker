const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // ✅ faster "get my expenses"
    },
    icon: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    description: {
      type: String,
      default: "No description",
      trim: true,
      maxlength: 500
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true // ✅ fast category filters
    },
    amount: {
      type: Number,
      required: true,
      min: 0 // ✅ prevents negative expenses
    },
    date: {
      type: Date,
      default: Date.now,
      index: true // ✅ fast date range queries
    }
  },
  { timestamps: true }
);

// ✅ Compound indexes
expenseSchema.index({ userId: 1, date: -1 }); // "latest expenses per user"
expenseSchema.index({ userId: 1, category: 1, date: -1 }); // category + date filtering

// ✅ Clean JSON response
expenseSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;
