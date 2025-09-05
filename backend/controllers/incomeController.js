const Income = require('../models/Income.js');
const xlsx = require('xlsx');

// =======================
// ✅ Add Income
// =======================
exports.addIncome = async (req, res) => {
  try {
    const { icon, source, amount, date, description } = req.body;

    if (!source || !amount || !date) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    const newIncome = new Income({
      userId: req.user.id,
      icon,
      source,
      description,
      amount,
      date: parsedDate
    });

    await newIncome.save();

    return res.status(201).json({
      success: true,
      message: 'Income added successfully',
      data: newIncome
    });
  } catch (error) {
    console.error("Error adding income:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// =======================
// ✅ Get All Incomes
// =======================
exports.getAllIncomes = async (req, res) => {
  try {
    const incomes = await Income.find({ userId: req.user.id })
      .sort({ date: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Incomes fetched successfully',
      data: incomes
    });
  } catch (error) {
    console.error("Error fetching incomes:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// =======================
// ✅ Delete Income (secured by userId)
// =======================
exports.deleteIncome = async (req, res) => {
  try {
    const deletedIncome = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deletedIncome) {
      return res.status(404).json({ success: false, message: 'Income not found' });
    }

    return res.status(200).json({ success: true, message: 'Income deleted successfully' });
  } catch (error) {
    console.error("Error deleting income:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// =======================
// ✅ Download Income Excel (streamed)
// =======================
exports.downloadIncomeExcel = async (req, res) => {
  try {
    const incomes = await Income.find({ userId: req.user.id })
      .sort({ date: -1 })
      .lean();

    if (incomes.length === 0) {
      return res.status(404).json({ success: false, message: 'No incomes found' });
    }

    const data = incomes.map(income => ({
      Source: income.source,
      Icon: income.icon || '', // ✅ include icon
      Amount: income.amount,
      Description: income.description || '',
      Date: income.date.toISOString().split('T')[0]
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, 'Incomes');

    // ✅ write to buffer instead of file system
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Incomes.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    return res.send(buffer);
  } catch (error) {
    console.error("Excel generation error:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
