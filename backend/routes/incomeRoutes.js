const express = require('express');
const {addIncome, getIncomesByDate, deleteIncome,downloadIncomeExcel} = require('../controllers/incomeController.js');

const { protect } = require('../middleware/authMiddleware.js');

const incomeRouter = express.Router();

incomeRouter.post('/add', protect, addIncome);
incomeRouter.get('/get', protect, getIncomesByDate);
incomeRouter.delete('/:id', protect, deleteIncome);
incomeRouter.get('/download', protect, downloadIncomeExcel);

module.exports = incomeRouter;
