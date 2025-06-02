import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import { Expense } from '../../types';
import { formatCurrency, formatDate, generateId } from '../../utils/helpers';
import { Plus, Calendar, DollarSign } from 'lucide-react';
import { createExpense, getExpenses } from '../../services/api';

const FinancialTracking: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  const [expenseData, setExpenseData] = useState<Omit<Expense, 'id'>>({
    description: '',
    amount: 0,
    date: new Date(),
    category: 'Inventory'
  });

  const [dbExpenses, setDbExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    getExpenses().then(setDbExpenses);
  }, []);

  // Only show expenses from the database
  const filteredExpenses = dbExpenses
    .filter(expense => selectedCategory === 'all' || expense.category === selectedCategory)
    .filter(expense => {
      if (dateRange === 'all') return true;
      const now = new Date();
      const expenseDate = new Date(expense.date);

      if (dateRange === 'thisMonth') {
        return (
          expenseDate.getMonth() === now.getMonth() &&
          expenseDate.getFullYear() === now.getFullYear()
        );
      }

      if (dateRange === 'lastMonth') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        return (
          expenseDate.getMonth() === lastMonth.getMonth() &&
          expenseDate.getFullYear() === lastMonth.getFullYear()
        );
      }

      if (dateRange === 'thisWeek') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return expenseDate >= weekStart;
      }

      return true;
    });

  // Calculate total expenses
  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  // Available expense categories
  const expenseCategories = [
    'Inventory',
    'Utilities',
    'Maintenance',
    'Marketing',
    'Salaries',
    'Rent',
    'Miscellaneous'
  ];

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExpenseData(prev => ({
      ...prev,
      [name]: name === 'description' ? value : parseFloat(value)
    }));
  };

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setExpenseData(prev => ({
      ...prev,
      category: value
    }));
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpenseData(prev => ({
      ...prev,
      date: new Date(e.target.value)
    }));
  };

  // Handle adding new expense
  const handleAddExpense = async () => {
    try {
      await createExpense(expenseData);
      const updated = await getExpenses();
      setDbExpenses(updated);
      setExpenseModalOpen(false);
      setExpenseData({
        description: '',
        amount: 0,
        date: new Date(),
        category: 'Inventory'
      });
    } catch (err) {
      alert('Failed to add expense.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Financial Tracking</h1>
        <Button
          variant="primary"
          onClick={() => setExpenseModalOpen(true)}
          leftIcon={<Plus size={18} />}
        >
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <DollarSign size={24} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Expenses This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    dbExpenses.filter(expense => {
                      const now = new Date();
                      const expenseDate = new Date(expense.date);
                      return (
                        expenseDate.getMonth() === now.getMonth() &&
                        expenseDate.getFullYear() === now.getFullYear()
                      );
                    }).reduce((sum, expense) => sum + expense.amount, 0)
                  )}
                </p>
              </div>
              <div className="bg-teal-100 p-3 rounded-full text-teal-600">
                <Calendar size={24} />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Expense Records</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select
              options={[
                { value: 'all', label: 'All Categories' },
                ...expenseCategories.map(cat => ({ value: cat, label: cat }))
              ]}
              value={selectedCategory}
              onChange={setSelectedCategory}
              className="w-full sm:w-48"
            />
            <Select
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'thisWeek', label: 'This Week' },
                { value: 'thisMonth', label: 'This Month' },
                { value: 'lastMonth', label: 'Last Month' }
              ]}
              value={dateRange}
              onChange={setDateRange}
              className="w-full sm:w-48"
            />
          </div>
        </CardHeader>

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No expenses found
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(expense.date)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{expense.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{expense.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-red-600">{formatCurrency(expense.amount)}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right font-medium">
                    Total
                  </td>
                  <td className="px-6 py-4 text-right font-bold">
                    {formatCurrency(totalExpenses)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Add Expense Modal */}
      <Modal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title="Add Expense"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Description"
            name="description"
            value={expenseData.description}
            onChange={handleInputChange}
            fullWidth
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Amount"
              name="amount"
              value={expenseData.amount}
              onChange={handleInputChange}
              fullWidth
              step="0.01"
              min="0"
            />
            <Select
              label="Category"
              options={expenseCategories.map(cat => ({ value: cat, label: cat }))}
              value={expenseData.category}
              onChange={handleCategoryChange}
              fullWidth
            />
          </div>

          <Input
            type="date"
            label="Date"
            value={expenseData.date.toISOString().substring(0, 10)}
            onChange={handleDateChange}
            fullWidth
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setExpenseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddExpense}
              disabled={!expenseData.description || expenseData.amount <= 0}
            >
              Add Expense
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FinancialTracking;