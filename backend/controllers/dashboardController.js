const Income = require('../models/Income.js');
const Expense = require('../models/Expense.js');
const { isValidObjectId, Types } = require('mongoose');

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const userObjectId = new Types.ObjectId(String(userId));
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // =======================
    // ✅ Run all queries in parallel
    // =======================
    const [
      totalIncomeAgg,
      totalExpenseAgg,
      last60DaysIncomeTransactions,
      last30DaysExpenseTransactions,
      recentIncome,
      recentExpense,
      monthlyIncomeAgg,
      monthlyExpenseAgg
    ] = await Promise.all([
      // Total Income
      Income.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Total Expense
      Expense.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Last 60 Days Income
      Income.find({
        userId,
        date: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }
      })
        .sort({ date: -1 })
        .select('amount date source category')
        .lean(),

      // Last 30 Days Expenses
      Expense.find({
        userId,
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
        .sort({ date: -1 })
        .select('amount date category')
        .lean(),

      // Recent Income (latest 5)
      Income.find({ userId })
        .sort({ date: -1 })
        .limit(5)
        .select('amount date source category')
        .lean(),

      // Recent Expense (latest 5)
      Expense.find({ userId })
        .sort({ date: -1 })
        .limit(5)
        .select('amount date category')
        .lean(),

      // Current Month Income
      Income.aggregate([
        {
          $match: { userId: userObjectId, date: { $gte: monthStart, $lte: monthEnd } }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Current Month Expense
      Expense.aggregate([
        {
          $match: { userId: userObjectId, date: { $gte: monthStart, $lte: monthEnd } }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    // =======================
    // ✅ Process results
    // =======================
    const totalIncome = totalIncomeAgg[0]?.total || 0;
    const totalExpense = totalExpenseAgg[0]?.total || 0;

    const incomeLast60Days = last60DaysIncomeTransactions.reduce(
      (sum, txn) => sum + txn.amount,
      0
    );

    const expensesLast30Days = last30DaysExpenseTransactions.reduce(
      (sum, txn) => sum + txn.amount,
      0
    );

    const enrichedExpenses = last30DaysExpenseTransactions.map(txn => ({
      ...txn,
      type: 'expense'
    }));

    const lastTransactions = [
      ...recentIncome.map(txn => ({ ...txn, type: 'income' })),
      ...recentExpense.map(txn => ({ ...txn, type: 'expense' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const monthlyIncome = monthlyIncomeAgg[0]?.total || 0;
    const monthlyExpense = monthlyExpenseAgg[0]?.total || 0;
    const monthlyBalance = monthlyIncome - monthlyExpense;

    // =======================
    // ✅ Response
    // =======================
    res.json({
      success: true,
      data: {
        totalBalance: totalIncome - totalExpense,
        totalIncome,
        totalExpense,
        last30DaysExpenses: {
          total: expensesLast30Days,
          transactions: enrichedExpenses
        },
        last60DaysIncome: {
          total: incomeLast60Days,
          transactions: last60DaysIncomeTransactions.map(txn => ({
            ...txn,
            type: 'income'
          }))
        },
        recentTransactions: lastTransactions,
        currentMonth: {
          income: monthlyIncome,
          expense: monthlyExpense,
          balance: monthlyBalance,
          start: monthStart,
          end: monthEnd
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
