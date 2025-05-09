const Income = require('../models/Income.js');
const Expense = require('../models/Expense.js');
const { isValidObjectId, Types } = require('mongoose');

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const userObjectId = new Types.ObjectId(String(userId));

    // Total Income
    const totalIncomeAgg = await Income.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalIncome = totalIncomeAgg[0]?.total || 0;

    // Total Expense
    const totalExpenseAgg = await Expense.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpense = totalExpenseAgg[0]?.total || 0;

    // Last 60 days income
    const last60DaysIncomeTransactions = await Income.find({
      userId,
      date: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } // 60 days ago
    }).sort({ date: -1 }).lean();

    const incomeLast60Days = last60DaysIncomeTransactions.reduce((sum, txn) => sum + txn.amount, 0);

    // Last 30 days expenses
    const last30DaysExpenseTransactions = await Expense.find({
      userId,
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days ago
    }).sort({ date: -1 }).lean();

    const expensesLast30Days = last30DaysExpenseTransactions.reduce((sum, txn) => sum + txn.amount, 0);

    // Attach type to each expense transaction
    const enrichedExpenses = last30DaysExpenseTransactions.map(txn => ({
      ...txn,
      type: 'expense'
    }));

    // Recent 5 transactions (income + expense)
    const recentIncome = (await Income.find({ userId }).sort({ date: -1 }).limit(5)).map(txn => ({
      ...txn.toObject(),
      type: 'income'
    }));
    const recentExpense = (await Expense.find({ userId }).sort({ date: -1 }).limit(5)).map(txn => ({
      ...txn.toObject(),
      type: 'expense'
    }));

    const lastTransactions = [...recentIncome, ...recentExpense].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    res.json({
      totalBalance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
      last30DaysExpenses: {
        total: expensesLast30Days,
        transactions: enrichedExpenses
      },
      last60DaysIncome: {
        total: incomeLast60Days,
        transactions: last60DaysIncomeTransactions
      },
      recentTransactions: lastTransactions
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
