const Expense = require('../models/Expense.js');
const xlsx = require('xlsx');

// =======================
// ✅ Add Expense
// =======================
exports.addExpense = async (req, res) => {
  try {
    const { icon, description, category, amount } = req.body;

    if (!icon || !description || !category || !amount) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
    }

    const expense = new Expense({
      userId: req.user.id, // ✅ consistent
      icon,
      description,
      category,
      amount,
    });

    await expense.save();
    return res.status(201).json({ success: true, message: "Expense added successfully", data: expense });
  } catch (err) {
    console.error("Error adding expense:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =======================
// ✅ Get All Expenses
// =======================
exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.id })
      .sort({ date: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Expenses fetched successfully',
      data: expenses
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// =======================
// ✅ Delete Expense
// =======================
exports.deleteExpense = async (req, res) => {
  try {
    const deletedExpense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deletedExpense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    return res.status(200).json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// =======================
// ✅ Download Expenses as Excel (streamed, no temp file)
// =======================
exports.downloadExpenseExcel = async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.id })
      .sort({ date: -1 })
      .lean();

    if (expenses.length === 0) {
      return res.status(404).json({ success: false, message: 'No expenses found' });
    }

    const data = expenses.map(expense => ({
      Category: expense.category,
      Icon: expense.icon,
      Amount: expense.amount,
      Description: expense.description,
      Date: expense.date.toISOString().split('T')[0]
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, 'Expenses');

    // ✅ Write Excel to buffer instead of file system
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Expenses.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    return res.send(buffer);
  } catch (error) {
    console.error('Excel generation error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
