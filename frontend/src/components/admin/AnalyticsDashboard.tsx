import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { formatCurrency, getWeekDates, getMonthDates } from '../../utils/helpers';
import { BarChart3, TrendingUp, Download, ShoppingBag, DollarSign, Package } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  stock: number;
  minStock: number;
}

const AnalyticsDashboard: React.FC = () => {
  const { } = useAppContext(); // Context available for future use if needed
  const [reportType, setReportType] = useState<string>('weekly');
  const [salesData, setSalesData] = useState<{ label: string; value: number }[]>([]);
  const [expensesData, setExpensesData] = useState<{ label: string; value: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [totalSalesAmount, setTotalSalesAmount] = useState<number>(0);
  const [totalExpensesAmount, setTotalExpensesAmount] = useState<number>(0);
  const [totalTransactionsCount, setTotalTransactionsCount] = useState<number>(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  // Calculate date ranges
  const weekDates = getWeekDates();
  const monthDates = getMonthDates();

  // Fetch backend data
  useEffect(() => {
    // Get authentication token
    const token = localStorage.getItem('token');

    // Function to fetch data
    const fetchData = async () => {
      try {
        // Fetch sales data based on report type
        const endpoint = reportType === 'weekly' ? '/api/sales/totals/week' : '/api/sales/totals/month';
        const salesRes = await fetch(endpoint, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });

        if (!salesRes.ok) {
          throw new Error('Failed to fetch sales data');
        }

        const salesData = await salesRes.json();
        setTotalSalesAmount(salesData.totalSales || 0);
        setTotalTransactionsCount(salesData.totalCount || 0);

        // Fetch expenses total
        const expenseEndpoint = reportType === 'weekly' ? '/api/expenses/current-week-total' : '/api/expenses/current-month-total';
        const expensesRes = await fetch(expenseEndpoint, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });

        if (!expensesRes.ok) {
          throw new Error('Failed to fetch expense data');
        }

        const expenseData = await expensesRes.json();
        setTotalExpensesAmount(expenseData.total || 0);

        // Fetch low stock products
        const productsRes = await fetch('/api/products/low-stock', {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setLowStockProducts(productsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [reportType]);

  // Generate analytics based on report type
  useEffect(() => {
    const token = localStorage.getItem('token');

    // Function to fetch chart data
    const fetchChartData = async () => {
      try {
        // Get the date range for the charts
        const daysInRange = ((reportType === 'weekly' ? weekDates.end : monthDates.end).getTime() -
          (reportType === 'weekly' ? weekDates.start : monthDates.start).getTime()) / (1000 * 3600 * 24);

        // Initialize empty chart data
        const salesByDay: Record<string, number> = {};
        const expensesByDay: Record<string, number> = {};

        // Create empty data points for each day in the range
        for (let i = 0; i <= daysInRange; i++) {
          const date = new Date(reportType === 'weekly' ? weekDates.start : monthDates.start);
          date.setDate(date.getDate() + i);
          const dateString = date.toISOString().substring(0, 10);
          salesByDay[dateString] = 0;
          expensesByDay[dateString] = 0;
        }

        // Fetch daily sales data
        const dailySalesEndpoint = reportType === 'weekly' ? '/api/sales/daily/week' : '/api/sales/daily/month';
        const dailySalesRes = await fetch(dailySalesEndpoint, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });

        if (dailySalesRes.ok) {
          const dailySalesData = await dailySalesRes.json();

          // Update sales chart data
          dailySalesData.forEach((item: any) => {
            const date = new Date(item.date).toISOString().substring(0, 10);
            // Exclude Sharoofa products by using the non-Sharoofa total
            salesByDay[date] = item.nonSharoofaTotal || 0;
          });
        }

        // Fetch daily expenses data
        const dailyExpensesEndpoint = reportType === 'weekly' ? '/api/expenses/daily/week' : '/api/expenses/daily/month';
        const dailyExpensesRes = await fetch(dailyExpensesEndpoint, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });

        if (dailyExpensesRes.ok) {
          const dailyExpensesData = await dailyExpensesRes.json();

          // Update expenses chart data
          dailyExpensesData.forEach((item: any) => {
            const date = new Date(item.date).toISOString().substring(0, 10);
            expensesByDay[date] = item.total || 0;
          });
        }

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

        // Fetch top products
        const topProductsEndpoint = reportType === 'weekly' ?
          '/api/sales/top-products/week' : '/api/sales/top-products/month';

        const topProductsRes = await fetch(topProductsEndpoint, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });

        if (topProductsRes.ok) {
          const topProductsData = await topProductsRes.json();

          // Filter out Sharoofa products
          const filteredProducts = topProductsData.filter((product: any) =>
            product.owner !== 'Sharoofa'
          );

          setTopProducts(
            filteredProducts.map((product: any) => ({
              name: product.name,
              quantity: product.quantity,
              revenue: product.revenue
            })).slice(0, 5)
          );
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };

    fetchChartData();
  }, [reportType, weekDates, monthDates]);

  // Calculate summary metrics
  const totalProfit = totalSalesAmount - totalExpensesAmount;

  // Handle exporting report
  const handleExportReport = () => {
    const { start, end } = reportType === 'weekly' ? weekDates : monthDates;

    // Create report content
    const reportContent = {
      reportType: reportType === 'weekly' ? 'Weekly Report' : 'Monthly Report',
      dateRange: `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
      summary: {
        totalSales: totalSalesAmount,
        totalExpenses: totalExpensesAmount,
        totalProfit,
        totalTransactions: totalTransactionsCount
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
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSalesAmount)}</p>
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
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpensesAmount)}</p>
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
                <p className="text-2xl font-bold text-gray-900">{totalTransactionsCount}</p>
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
                {lowStockProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{product.stock}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{product.minStock}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {product.stock <= product.minStock ? (
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