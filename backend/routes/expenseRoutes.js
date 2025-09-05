const express = require('express');
const {addExpense, getExpensesByDate, deleteExpense,downloadExpenseExcel} = require('../controllers/expenseController.js');

const { protect } = require('../middleware/authMiddleware.js');

const expenseRouter = express.Router();

expenseRouter.post('/add', protect, addExpense);
expenseRouter.get('/get', protect, getExpensesByDate);
expenseRouter.delete('/:id', protect, deleteExpense);
expenseRouter.get('/download', protect, downloadExpenseExcel);

module.exports = expenseRouter;
