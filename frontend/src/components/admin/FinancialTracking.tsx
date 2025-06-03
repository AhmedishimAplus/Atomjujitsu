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
import { createExpense, getExpenses, getCategories, getSales, getProducts, getCurrentWeekTotal } from '../../services/api';
import { ProductItem } from '../../types';

const FinancialTracking: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [view, setView] = useState<'expenses' | 'sales'>('expenses');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedSalesCategory, setSelectedSalesCategory] = useState<string>('all');
  const [selectedSalesSubcategory, setSelectedSalesSubcategory] = useState<string>('all');
  const [salesDateRange, setSalesDateRange] = useState<string>('all');
  const [expenseData, setExpenseData] = useState<Omit<Expense, 'id'>>({
    description: '',
    amount: 0,
    date: new Date(),
    category: 'Inventory'
  });
  const [dbExpenses, setDbExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productCostMap, setProductCostMap] = useState<Record<string, number>>({});
  const [weekAnalytics, setWeekAnalytics] = useState<any>({});
  const [weekAnalyticsError, setWeekAnalyticsError] = useState<string | null>(null);
  const [weekAnalyticsLoading, setWeekAnalyticsLoading] = useState<boolean>(true);

  // Fetch backend analytics for month and week
  const [backendMonthTotals, setBackendMonthTotals] = useState<{ totalSales: number, totalProfit: number } | null>(null);
  const [backendWeekTotals, setBackendWeekTotals] = useState<{ totalSales: number, totalProfit: number } | null>(null);
  const [backendTotalsLoading, setBackendTotalsLoading] = useState(true);
  const [backendTotalsError, setBackendTotalsError] = useState<string | null>(null);

  useEffect(() => {
    getExpenses().then(setDbExpenses);
    getCategories().then(setCategories);
    getSales().then(setSales);
    getProducts().then((prods) => {
      setProducts(prods);
      // Build productId → costPrice map
      const map: Record<string, number> = {};
      prods.forEach((p: ProductItem) => {
        map[p._id] = typeof p.costPrice === 'number' ? p.costPrice : 0;
      });
      setProductCostMap(map);
    });
    fetchAnalytics();
    fetchWeekAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await fetch('/api/sales/current-month-total', { headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' } });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        setAnalyticsError('Failed to load analytics');
      }
    } catch (e) {
      setAnalyticsError('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchWeekAnalytics = async () => {
    setWeekAnalyticsLoading(true);
    setWeekAnalyticsError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const data = await getCurrentWeekTotal(token);
      setWeekAnalytics(data);
    } catch (e) {
      setWeekAnalyticsError('Failed to load week analytics');
    } finally {
      setWeekAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    async function fetchBackendTotals() {
      setBackendTotalsLoading(true);
      setBackendTotalsError(null);
      try {
        const token = localStorage.getItem('token') || '';
        const monthRes = await fetch('/api/sales/totals/month', { headers: { 'Authorization': token ? `Bearer ${token}` : '' } });
        const weekRes = await fetch('/api/sales/totals/week', { headers: { 'Authorization': token ? `Bearer ${token}` : '' } });
        if (!monthRes.ok || !weekRes.ok) throw new Error('Failed to fetch totals');
        const monthData = await monthRes.json();
        const weekData = await weekRes.json();
        setBackendMonthTotals(monthData);
        setBackendWeekTotals(weekData);
      } catch (e) {
        setBackendTotalsError('Failed to load backend totals');
      } finally {
        setBackendTotalsLoading(false);
      }
    }
    fetchBackendTotals();
  }, []);

  useEffect(() => {
    if (view === 'sales') {
      // Build params for backend
      let params: any = {};
      if (salesDateRange !== 'all') {
        const now = new Date();
        let startDate, endDate;
        if (salesDateRange === 'thisMonth') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (salesDateRange === 'lastMonth') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        }
        if (startDate && endDate) {
          params.startDate = startDate.toISOString();
          params.endDate = endDate.toISOString();
        }
      }
      // Only include categoryId/subcategory if not 'all'
      if (selectedSalesCategory !== 'all') params.categoryId = selectedSalesCategory;
      if (selectedSalesSubcategory !== 'all') params.subcategory = selectedSalesSubcategory;
      getSales().then(setSales);
    }
  }, [view, selectedSalesCategory, selectedSalesSubcategory, salesDateRange]);

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

  // Helper to get week start/end (Friday to Thursday)
  function getCurrentWeekRange() {
    const now = new Date();
    const day = now.getDay();
    // Friday = 5
    const daysSinceFriday = (day + 2) % 7; // 0=Sunday, 5=Friday
    const start = new Date(now);
    start.setDate(now.getDate() - daysSinceFriday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // Calculate sales/profit for current week and month (excluding Sharoofa)
  const { start: weekStart, end: weekEnd } = getCurrentWeekRange();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let weekSales = 0, weekProfit = 0, monthSales = 0, monthProfit = 0;
  sales.forEach((sale: any) => {
    const saleDate = new Date(sale.createdAt);
    sale.items.forEach((item: any) => {
      const product = typeof item.productId === 'string' ? products.find(p => p._id === item.productId) : undefined;
      const owner = product?.owner || item.owner;
      if (owner === 'Sharoofa') return;
      const costPrice = productCostMap[item.productId] !== undefined ? productCostMap[item.productId] : (typeof item.costPrice === 'number' && !isNaN(item.costPrice) ? item.costPrice : 0);
      const saleAmount = item.priceUsed * item.quantity;
      const profit = (item.priceUsed - costPrice) * item.quantity;
      if (saleDate >= weekStart && saleDate <= weekEnd) {
        weekSales += saleAmount;
        weekProfit += profit;
      }
      if (saleDate >= monthStart && saleDate <= monthEnd) {
        monthSales += saleAmount;
        monthProfit += profit;
      }
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Financial Tracking</h1>
        <div className="flex gap-2">
          <Button variant={view === 'expenses' ? 'primary' : 'outline'} onClick={() => setView('expenses')}>Expenses</Button>
          <Button variant={view === 'sales' ? 'primary' : 'outline'} onClick={() => setView('sales')}>Sales</Button>
          {view === 'expenses' && (
            <Button variant="primary" onClick={() => setExpenseModalOpen(true)} leftIcon={<Plus size={18} />}>Add Expense</Button>
          )}
        </div>
      </div>
      {view === 'expenses' ? (
        <>
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
        </>
      ) : (
        <>
          {/* Sales dashboard */}
          {analyticsLoading || weekAnalyticsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading analytics...</div>
          ) : analyticsError || weekAnalyticsError ? (
            <div className="text-center py-8 text-red-500">{analyticsError || weekAnalyticsError}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Total Profit Overall */}
              <Card>
                <CardBody className="p-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Profit</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(analytics.profit || 0)}
                    </p>
                  </div>
                </CardBody>
              </Card>
              {/* Profit This Month */}
              <Card>
                <CardBody className="p-4">
                  <div>
                    <p className="text-sm text-gray-500">Profit This Month</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(analytics.profit || 0)}
                    </p>
                  </div>
                </CardBody>
              </Card>
              {/* Profit This Week */}
              <Card>
                <CardBody className="p-4">
                  <div>
                    <p className="text-sm text-gray-500">Profit This Week</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(weekAnalytics.profit || 0)}
                    </p>
                  </div>
                </CardBody>
              </Card>
              {/* Sales This Month */}
              <Card>
                <CardBody className="p-4">
                  <div>
                    <p className="text-sm text-gray-500">Sales This Month</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {formatCurrency(analytics.sales || 0)}
                    </p>
                  </div>
                </CardBody>
              </Card>
              {/* Sales This Week */}
              <Card>
                <CardBody className="p-4">
                  <div>
                    <p className="text-sm text-gray-500">Sales This Week</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {formatCurrency(weekAnalytics.sales || 0)}
                    </p>
                  </div>
                </CardBody>
              </Card>
              {/* Total Sales Overall */}
              <Card>
                <CardBody className="p-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Sales</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {formatCurrency(sales.reduce((sum, sale) => sum + (sale.total || 0), 0))}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
          {/* Backend Month/Week Totals Cards */}
          {backendTotalsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading backend totals...</div>
          ) : backendTotalsError ? (
            <div className="text-center py-8 text-red-500">{backendTotalsError}</div>
          ) : backendMonthTotals && backendWeekTotals ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Card>
                <CardBody className="p-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Sales This Month</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(backendMonthTotals.totalSales)}</p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="p-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Profit This Month</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(backendMonthTotals.totalProfit)}</p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="p-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Sales This Week</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(backendWeekTotals.totalSales)}</p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="p-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Profit This Week</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(backendWeekTotals.totalProfit)}</p>
                  </div>
                </CardBody>
              </Card>
            </div>
          ) : null}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-800">Sales Records</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select
                  options={[{ value: 'all', label: 'All Categories' }, ...categories.map(cat => ({ value: cat._id, label: cat.name }))]}
                  value={selectedSalesCategory}
                  onChange={setSelectedSalesCategory}
                  className="w-full sm:w-48"
                />
                <Select
                  options={[{ value: 'all', label: 'All Subcategories' }, ...(selectedSalesCategory !== 'all' ? (categories.find(cat => cat._id === selectedSalesCategory)?.subcategories || []).map((sub: any) => ({ value: sub.name, label: sub.name })) : [])]}
                  value={selectedSalesSubcategory}
                  onChange={setSelectedSalesSubcategory}
                  className="w-full sm:w-48"
                />
                <Select
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: 'thisMonth', label: 'This Month' },
                    { value: 'lastMonth', label: 'Last Month' }
                  ]}
                  value={salesDateRange}
                  onChange={setSalesDateRange}
                  className="w-full sm:w-48"
                />
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategory</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price Used</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales.length === 0 ? (
                      <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">No sales found</td></tr>
                    ) : (
                      sales.flatMap((sale: any) => sale.items.map((item: any, idx: number) => {
                        // Get product info for category/subcategory/owner
                        const product = typeof item.productId === 'string' ? products.find(p => p._id === item.productId) : undefined;
                        const costPrice = productCostMap[item.productId] !== undefined ? productCostMap[item.productId] : (typeof item.costPrice === 'number' && !isNaN(item.costPrice) ? item.costPrice : 0);
                        const owner = product?.owner || item.owner;
                        // Only count profit if owner is not Sharoofa
                        const profit = owner !== 'Sharoofa' ? (item.priceUsed - costPrice) * item.quantity : 0;
                        // Get category name from product.categoryId
                        let categoryName = '';
                        if (product && product.categoryId) {
                          let catId: string = '';
                          if (typeof product.categoryId === 'string') {
                            catId = product.categoryId;
                          } else if (typeof product.categoryId === 'object' && product.categoryId !== null && '_id' in product.categoryId) {
                            catId = (product.categoryId as any)._id;
                          }
                          const cat = categories.find((c: any) => c._id === catId);
                          categoryName = cat ? cat.name : '';
                        }
                        return (
                          <tr key={sale._id + '-' + idx}>
                            <td className="px-6 py-4 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{categoryName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{product?.subcategory || ''}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">{item.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">{formatCurrency(item.priceUsed)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">{formatCurrency(costPrice)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">{formatCurrency(profit)}</td>
                          </tr>
                        );
                      }))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

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
              value={typeof expenseData.amount === 'number' && !isNaN(expenseData.amount) ? expenseData.amount : ''}
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