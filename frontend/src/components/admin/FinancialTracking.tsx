import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import { Expense, ExpensePayload, Transaction } from '../../types'; // Import Transaction
import { formatCurrency, formatDate } from '../../utils/helpers'; // Removed generateId
import { Plus, Calendar, DollarSign, ShoppingCart, AlertTriangle, Loader2 } from 'lucide-react'; // Added icons

const initialExpenseFormData: ExpensePayload = {
  description: '',
  amount: 0,
  date: new Date(),
  category: 'Inventory'
};

const FinancialTracking: React.FC = () => {
  const { 
    state, 
    fetchPurchases, 
    fetchExpenses, 
    addExpense 
  } = useAppContext();

  const { 
    transactions, 
    expenses, 
    isLoadingPurchases, 
    fetchPurchasesError,
    isLoadingExpenses,
    fetchExpensesError,
    isAddingExpense,
    addExpenseError
  } = state;

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [localAddExpenseError, setLocalAddExpenseError] = useState<string | null>(null);
  
  const [expenseFormData, setExpenseFormData] = useState<ExpensePayload>(initialExpenseFormData);

  useEffect(() => {
    fetchPurchases(); // TODO: Add filter options if needed
    fetchExpenses();
  }, [fetchPurchases, fetchExpenses]);
  
  // Filter logic for both transactions and expenses
  const filterByDateRange = <T extends { date?: Date, timestamp?: Date }>(item: T, range: string): boolean => {
    if (range === 'all') return true;
    const itemDate = new Date(item.date || item.timestamp || 0);
    if (isNaN(itemDate.getTime())) return false; // Invalid date
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    if (range === 'thisMonth') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    if (range === 'lastMonth') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear();
    }
    if (range === 'thisWeek') {
      const firstDayOfWeek = new Date(now);
      firstDayOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday as first day
      firstDayOfWeek.setHours(0,0,0,0);
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      lastDayOfWeek.setHours(23,59,59,999);
      return itemDate >= firstDayOfWeek && itemDate <= lastDayOfWeek;
    }
    return true;
  };

  const filteredExpenses = expenses
    .filter(expense => selectedExpenseCategory === 'all' || expense.category === selectedExpenseCategory)
    .filter(expense => filterByDateRange(expense, selectedDateRange));
  
  const filteredTransactions = transactions
    .filter(transaction => filterByDateRange(transaction, selectedDateRange));

  const totalSales = filteredTransactions.reduce((sum, transaction) => sum + transaction.total, 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = totalSales - totalExpenses;

  // Available expense categories - can be dynamic from fetched expenses or predefined
  const expenseCategories = [ // Or derive from fetched expenses: Array.from(new Set(expenses.map(e => e.category)))
    'Inventory',
    'Utilities',
    'Maintenance',
    'Marketing',
    'Salaries',
    'Rent',
    'Miscellaneous'
  ];
  
  // Handle form input changes
  const handleExpenseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setExpenseFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };
  
  // Handle category selection for expense
  const handleExpenseCategoryChange = (value: string) => {
    setExpenseFormData(prev => ({
      ...prev,
      category: value
    }));
  };
  
  // Handle date change for expense
  const handleExpenseDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpenseFormData(prev => ({
      ...prev,
      date: new Date(e.target.value)
    }));
  };
  
  // Handle adding new expense
  const handleAddExpense = async () => {
    setLocalAddExpenseError(null);
    if (!expenseFormData.description || expenseFormData.amount <= 0) {
      setLocalAddExpenseError("Description and a positive amount are required.");
      return;
    }
    try {
      await addExpense(expenseFormData);
      setExpenseModalOpen(false);
      setExpenseFormData(initialExpenseFormData); // Reset form
    } catch (error: any) {
      setLocalAddExpenseError(error.message || addExpenseError || "Failed to add expense.");
    }
  };

  const openExpenseModal = () => {
    setLocalAddExpenseError(null);
    setExpenseFormData(initialExpenseFormData);
    setExpenseModalOpen(true);
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Financial Overview</h1>
        <Button
          variant="primary"
          onClick={openExpenseModal}
          leftIcon={<Plus size={20} />}
          disabled={isAddingExpense}
        >
          Add Expense
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Total Sales</h2>
            <ShoppingCart className="text-green-500" size={24}/>
          </CardHeader>
          <CardBody>
            {isLoadingPurchases ? <Loader2 className="animate-spin" /> : <p className="text-3xl font-bold">{formatCurrency(totalSales)}</p>}
            {fetchPurchasesError && <p className="text-xs text-red-500 mt-1">{fetchPurchasesError}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Total Expenses</h2>
            <DollarSign className="text-red-500" size={24}/>
          </CardHeader>
          <CardBody>
            {isLoadingExpenses ? <Loader2 className="animate-spin" /> : <p className="text-3xl font-bold">{formatCurrency(totalExpenses)}</p>}
            {fetchExpensesError && <p className="text-xs text-red-500 mt-1">{fetchExpensesError}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Net Profit</h2>
            <Calendar className="text-blue-500" size={24}/>
          </CardHeader>
          <CardBody>
            {(isLoadingPurchases || isLoadingExpenses) ? <Loader2 className="animate-spin" /> : <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p>}
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row gap-4 p-4">
          <Select
            label="Filter by Date Range:"
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'thisWeek', label: 'This Week' },
              { value: 'thisMonth', label: 'This Month' },
              { value: 'lastMonth', label: 'Last Month' }
            ]}
            value={selectedDateRange}
            onChange={setSelectedDateRange}
            className="w-full sm:w-auto"
          />
          <Select
            label="Filter Expense Category:"
            options={[
              { value: 'all', label: 'All Categories' },
              ...expenseCategories.map(cat => ({ value: cat, label: cat }))
            ]}
            value={selectedExpenseCategory}
            onChange={setSelectedExpenseCategory}
            className="w-full sm:w-auto"
          />
        </CardBody>
      </Card>

      {/* Sales Transactions Table */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-800">Sales Transactions</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            {isLoadingPurchases && <div className="p-4 text-center"><Loader2 className="animate-spin inline-block" /> Loading transactions...</div>}
            {fetchPurchasesError && <div className="p-4 text-red-600 text-center"><AlertTriangle className="inline-block mr-2" />Error: {fetchPurchasesError}</div>}
            {!isLoadingPurchases && !fetchPurchasesError && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Discount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No transactions found for this period.</td></tr>
                ) : (
                  filteredTransactions.map(transaction => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(transaction.timestamp)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{transaction.orderId}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{transaction.paymentMethod}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{transaction.staffDiscount ? `Yes (${transaction.staffName || 'N/A'})` : 'No'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-green-600">{formatCurrency(transaction.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
               <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-right font-semibold text-gray-700">Total Sales for Period:</td>
                  <td className="px-6 py-3 text-right font-bold text-gray-700">{formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.total, 0))}</td>
                </tr>
              </tfoot>
            </table>
            )}
          </div>
        </CardBody>
      </Card>
      
      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-800">Expense Records</h2>
        </CardHeader>
        <CardBody className="p-0">
           <div className="overflow-x-auto">
            {isLoadingExpenses && <div className="p-4 text-center"><Loader2 className="animate-spin inline-block" /> Loading expenses...</div>}
            {fetchExpensesError && <div className="p-4 text-red-600 text-center"><AlertTriangle className="inline-block mr-2" />Error: {fetchExpensesError}</div>}
            {!isLoadingExpenses && !fetchExpensesError && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No expenses found for this period/category.</td></tr>
                ) : (
                  filteredExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(expense.date)}</td>
                      <td className="px-6 py-4">{expense.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{expense.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-red-600">{formatCurrency(expense.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan={3} className="px-6 py-3 text-right font-semibold text-gray-700">Total Expenses for Period:</td>
                  <td className="px-6 py-3 text-right font-bold text-gray-700">{formatCurrency(totalExpenses)}</td>
                </tr>
              </tfoot>
            </table>
            )}
          </div>
        </CardBody>
      </Card>
      
      {/* Add Expense Modal */}
      <Modal
        isOpen={expenseModalOpen}
        onClose={() => !isAddingExpense && setExpenseModalOpen(false)}
        title="Add New Expense"
        size="md"
      >
        <div className="space-y-4">
          {(localAddExpenseError || addExpenseError) && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
              <strong className="font-bold">Error: </strong>
              <span>{localAddExpenseError || addExpenseError}</span>
            </div>
          )}
          <Input
            label="Description"
            name="description"
            value={expenseFormData.description}
            onChange={handleExpenseInputChange}
            fullWidth
            disabled={isAddingExpense}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Amount"
              name="amount"
              value={expenseFormData.amount.toString()}
              onChange={handleExpenseInputChange}
              fullWidth
              step="0.01"
              min="0.01"
              disabled={isAddingExpense}
              required
            />
            <Select
              label="Category"
              options={expenseCategories.map(cat => ({ value: cat, label: cat }))}
              value={expenseFormData.category}
              onChange={handleExpenseCategoryChange}
              fullWidth
              disabled={isAddingExpense}
            />
          </div>
          <Input
            type="date"
            label="Date"
            value={expenseFormData.date.toISOString().substring(0, 10)}
            onChange={handleExpenseDateChange}
            fullWidth
            disabled={isAddingExpense}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setExpenseModalOpen(false)}
              disabled={isAddingExpense}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddExpense}
              disabled={isAddingExpense || !expenseFormData.description || expenseFormData.amount <= 0}
              leftIcon={isAddingExpense ? <Loader2 className="animate-spin" /> : undefined}
            >
              {isAddingExpense ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FinancialTracking;