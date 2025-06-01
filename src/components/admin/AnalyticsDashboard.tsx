import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { formatCurrency, getWeekDates, getMonthDates } from '../../utils/helpers';
import { BarChart3, TrendingUp, Download, ShoppingBag, DollarSign, Package } from 'lucide-react';

const AnalyticsDashboard: React.FC = () => {
  const { state } = useAppContext();
  const [reportType, setReportType] = useState<string>('weekly');
  const [salesData, setSalesData] = useState<{ label: string; value: number }[]>([]);
  const [expensesData, setExpensesData] = useState<{ label: string; value: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  
  // Calculate date ranges
  const weekDates = getWeekDates();
  const monthDates = getMonthDates();
  
  // Generate analytics based on report type
  useEffect(() => {
    // Determine date range
    const { start, end } = reportType === 'weekly' ? weekDates : monthDates;
    
    // Filter transactions by date range
    const filteredTransactions = state.transactions.filter(
      transaction => {
        const date = new Date(transaction.timestamp);
        return date >= start && date <= end;
      }
    );
    
    // Filter expenses by date range
    const filteredExpenses = state.expenses.filter(
      expense => {
        const date = new Date(expense.date);
        return date >= start && date <= end;
      }
    );
    
    // Calculate sales by day
    const salesByDay: Record<string, number> = {};
    const daysInRange = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    
    for (let i = 0; i <= daysInRange; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateString = date.toISOString().substring(0, 10);
      salesByDay[dateString] = 0;
    }
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.timestamp).toISOString().substring(0, 10);
      salesByDay[date] = (salesByDay[date] || 0) + transaction.total;
    });
    
    // Calculate expenses by day
    const expensesByDay: Record<string, number> = { ...salesByDay };
    
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date).toISOString().substring(0, 10);
      expensesByDay[date] = (expensesByDay[date] || 0) + expense.amount;
    });
    
    // Format data for charts
    setSalesData(
      Object.entries(salesByDay).map(([date, value]) => ({
        label: date.substring(5), // MM-DD format
        value
      }))
    );
    
    setExpensesData(
      Object.entries(expensesByDay).map(([date, value]) => ({
        label: date.substring(5), // MM-DD format
        value
      }))
    );
    
    // Calculate top products
    const productSales: Record<string, { quantity: number; revenue: number }> = {};
    
    filteredTransactions.forEach(transaction => {
      const order = state.completedOrders.find(order => order.id === transaction.orderId);
      if (order) {
        order.items.forEach(item => {
          if (!productSales[item.name]) {
            productSales[item.name] = { quantity: 0, revenue: 0 };
          }
          productSales[item.name].quantity += item.quantity;
          productSales[item.name].revenue += item.price * item.quantity;
        });
      }
    });
    
    setTopProducts(
      Object.entries(productSales)
        .map(([name, data]) => ({
          name,
          quantity: data.quantity,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
    );
  }, [reportType, state.transactions, state.expenses, state.completedOrders, weekDates, monthDates]);
  
  // Calculate summary metrics
  const totalSales = salesData.reduce((sum, item) => sum + item.value, 0);
  const totalExpenses = expensesData.reduce((sum, item) => sum + item.value, 0);
  const totalProfit = totalSales - totalExpenses;
  const totalTransactions = reportType === 'weekly'
    ? state.transactions.filter(t => {
        const date = new Date(t.timestamp);
        return date >= weekDates.start && date <= weekDates.end;
      }).length
    : state.transactions.filter(t => {
        const date = new Date(t.timestamp);
        return date >= monthDates.start && date <= monthDates.end;
      }).length;
  
  // Handle exporting report
  const handleExportReport = () => {
    const { start, end } = reportType === 'weekly' ? weekDates : monthDates;
    
    // Create report content
    const reportContent = {
      reportType: reportType === 'weekly' ? 'Weekly Report' : 'Monthly Report',
      dateRange: `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
      summary: {
        totalSales,
        totalExpenses,
        totalProfit,
        totalTransactions
      },
      salesByDay: salesData,
      expensesByDay: expensesData,
      topProducts
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(reportContent, null, 2);
    
    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}-report-${new Date().toISOString().substring(0, 10)}.json`;
    link.click();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Select
            options={[
              { value: 'weekly', label: 'Weekly Report' },
              { value: 'monthly', label: 'Monthly Report' }
            ]}
            value={reportType}
            onChange={setReportType}
            className="w-48"
          />
          <Button
            variant="outline"
            onClick={handleExportReport}
            leftIcon={<Download size={18} />}
          >
            Export
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full text-green-600">
                <DollarSign size={24} />
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full text-red-600">
                <DollarSign size={24} />
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total Profit</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalProfit)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <TrendingUp size={24} />
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                <ShoppingBag size={24} />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-800">
              {reportType === 'weekly' ? 'Weekly' : 'Monthly'} Sales
            </h2>
          </CardHeader>
          <CardBody className="p-4">
            <div className="h-64">
              {salesData.length > 0 ? (
                <div className="h-full flex items-end space-x-2">
                  {salesData.map((item, index) => {
                    const maxValue = Math.max(...salesData.map(d => d.value));
                    const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all duration-500 ease-in-out"
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="text-xs mt-2 text-gray-600">{item.label}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-800">Top Products</h2>
          </CardHeader>
          <CardBody className="p-0">
            {topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity Sold
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {topProducts.map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-gray-900">{product.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-900">{product.quantity}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(product.revenue)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">No data available</div>
            )}
          </CardBody>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Inventory Status</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reorder Threshold
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {state.inventory
                  .filter(product => product.quantity <= product.reorderThreshold * 1.2)
                  .sort((a, b) => (a.quantity / a.reorderThreshold) - (b.quantity / b.reorderThreshold))
                  .map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{product.quantity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{product.reorderThreshold}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {product.quantity <= product.reorderThreshold ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Reorder Now
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Low Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;