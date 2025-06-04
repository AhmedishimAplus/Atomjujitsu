import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { formatCurrency, getWeekDates, getMonthDates, groupDataByWeeks } from '../../utils/helpers';
import { TrendingUp, Download, ShoppingBag, DollarSign, RefreshCw } from 'lucide-react';

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
  const [topProductsByQuantity, setTopProductsByQuantity] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [totalSalesAmount, setTotalSalesAmount] = useState<number>(0);
  const [totalExpensesAmount, setTotalExpensesAmount] = useState<number>(0);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [totalTransactionsCount, setTotalTransactionsCount] = useState<number>(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isChangingReportType, setIsChangingReportType] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Memoize date ranges to prevent flickering
  const weekDates = useMemo(() => getWeekDates(), []);
  const monthDates = useMemo(() => getMonthDates(), []);

  // Fetch backend data
  useEffect(() => {
    // Get authentication token
    const token = localStorage.getItem('token');

    // Function to fetch data
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
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
        setTotalTransactionsCount(salesData.totalCount || 0);        // Fetch profit data for reference, but we'll always calculate it ourselves
        try {
          const profitEndpoint = `/api/sales/profit/${reportType === 'weekly' ? 'week' : 'month'}`;
          const profitRes = await fetch(profitEndpoint, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
          });

          if (profitRes.ok) {
            // We get the profit for reference, but we'll always calculate it ourselves
            const profitData = await profitRes.json();
            console.log('Backend profit calculation:', profitData.totalProfit);
          }
        } catch (profitError) {
          console.error('Error fetching profit data:', profitError);
        }
        // We'll set the profit in the dedicated useEffect that calculates totalSalesAmount - totalExpensesAmount

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
        }      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
        setIsChangingReportType(false);
      }
    };

    fetchData();
  }, [reportType]);
  // Generate analytics based on report type
  useEffect(() => {
    const token = localStorage.getItem('token');

    // We don't want to show the loading indicator again for this second data fetch
    // since we already have the main metrics displayed
    // setIsLoading(true) is only in the first useEffect

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
          if (Array.isArray(dailySalesData)) {
            dailySalesData.forEach((item: any) => {
              const date = new Date(item.date).toISOString().substring(0, 10);
              // Exclude Sharoofa products by using the non-Sharoofa total
              salesByDay[date] = item.nonSharoofaTotal || 0;
            });
          }
        }

        // Fetch daily expenses data
        const dailyExpensesEndpoint = reportType === 'weekly' ? '/api/expenses/daily/week' : '/api/expenses/daily/month';
        const dailyExpensesRes = await fetch(dailyExpensesEndpoint, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });

        if (dailyExpensesRes.ok) {
          const dailyExpensesData = await dailyExpensesRes.json();

          // Update expenses chart data
          if (Array.isArray(dailyExpensesData)) {
            dailyExpensesData.forEach((item: any) => {
              const date = new Date(item.date).toISOString().substring(0, 10);
              expensesByDay[date] = item.total || 0;
            });
          }
        }        // Format data for charts
        const rawSalesData = Object.entries(salesByDay).map(([date, value]) => ({
          label: date.substring(5), // MM-DD format
          value
        }));

        const rawExpensesData = Object.entries(expensesByDay).map(([date, value]) => ({
          label: date.substring(5), // MM-DD format
          value
        }));

        // For weekly data, use as is; for monthly data, group by weeks
        if (reportType === 'weekly') {
          setSalesData(rawSalesData);
          setExpensesData(rawExpensesData);
        } else {
          // Group by weeks for monthly view
          setSalesData(groupDataByWeeks(rawSalesData, monthDates.start));
          setExpensesData(groupDataByWeeks(rawExpensesData, monthDates.start));
        }

        // Fetch top products
        const topProductsEndpoint = reportType === 'weekly' ?
          '/api/sales/top-products/week' : '/api/sales/top-products/month';

        const topProductsRes = await fetch(topProductsEndpoint, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });

        if (topProductsRes.ok) {
          const topProductsData = await topProductsRes.json();          // Filter out Sharoofa products
          if (Array.isArray(topProductsData)) {
            const filteredProducts = topProductsData.filter((product: any) =>
              product.owner !== 'Sharoofa'
            );

            // Set top products by revenue
            setTopProducts(
              filteredProducts.map((product: any) => ({
                name: product.name,
                quantity: product.quantity,
                revenue: product.revenue
              })).slice(0, 5)
            );

            // Set top products by quantity
            setTopProductsByQuantity(
              [...filteredProducts]
                .sort((a, b) => b.quantity - a.quantity)
                .map((product: any) => ({
                  name: product.name,
                  quantity: product.quantity,
                  revenue: product.revenue
                })).slice(0, 5)
            );
          } else {
            setTopProducts([]);
          }
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
        // Don't overwrite main error if it's already set
        if (!error) {
          setError('Failed to load chart data. Please try again.');
        }      } finally {
        // Always update the timestamp when data is refreshed
        setLastUpdated(new Date());
        setIsChangingReportType(false);
      }
    };

    fetchChartData();
  }, [reportType, weekDates, monthDates]);  // Calculate total profit as sales minus expenses
  useEffect(() => {
    // Always calculate profit locally to ensure it's sales minus expenses
    setTotalProfit(totalSalesAmount - totalExpensesAmount);
  }, [totalSalesAmount, totalExpensesAmount]);  // Handle refreshing data
  const handleRefresh = () => {
    if (isChangingReportType) return; // Prevent refresh during report type change
    
    // Show loading state
    setIsLoading(true);

    // Directly trigger both data fetching functions
    const token = localStorage.getItem('token');

    // Create fresh fetch functions
    const fetchMainData = async () => {
      try {
        const endpoint = reportType === 'weekly' ? '/api/sales/totals/week' : '/api/sales/totals/month';
        const salesRes = await fetch(endpoint, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
          cache: 'no-store' // Prevent caching
        });

        if (salesRes.ok) {
          const salesData = await salesRes.json();
          setTotalSalesAmount(salesData.totalSales || 0);
          setTotalTransactionsCount(salesData.totalCount || 0);

          if (salesData.totalProfit !== undefined) {
            setTotalProfit(salesData.totalProfit);
          }
        }

        // Fetch expenses
        const expenseEndpoint = reportType === 'weekly' ? '/api/expenses/current-week-total' : '/api/expenses/current-month-total';
        const expensesRes = await fetch(expenseEndpoint, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
          cache: 'no-store' // Prevent caching
        });

        if (expensesRes.ok) {
          const expenseData = await expensesRes.json();
          setTotalExpensesAmount(expenseData.total || 0);
        }

        // Fetch low stock products
        const productsRes = await fetch('/api/products/low-stock', {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
          cache: 'no-store' // Prevent caching
        });

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setLowStockProducts(productsData);
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      } finally {
        setIsLoading(false);
        setLastUpdated(new Date());
      }
    };

    fetchMainData();
  };

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()} on {lastUpdated.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            leftIcon={<RefreshCw size={18} />}
            disabled={isLoading}
            className="mr-2"
          >
            Refresh
          </Button>
          <Select
            options={[
              { value: 'weekly', label: 'Weekly Report' },
              { value: 'monthly', label: 'Monthly Report' }            ]}
            value={reportType}
            onChange={(value) => {
              if (value !== reportType && !isChangingReportType) {
                setIsChangingReportType(true);
                // Small delay to ensure we don't get rapid toggling
                setTimeout(() => {
                  setReportType(value);
                }, 50);
              }
            }}
            className="w-48"
            disabled={isLoading || isChangingReportType}
          />
          <Button
            variant="outline"
            onClick={handleExportReport}
            leftIcon={<Download size={18} />}
            disabled={isLoading || salesData.length === 0}
          >
            Export
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}      {isLoading && (
        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-600">Loading data...</p>
        </div>
      )}

      {/* Always show the dashboard content, regardless of loading state */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSalesAmount)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {reportType === 'weekly' ? 'This Week' : 'This Month'}
                </p>
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
                <p className="text-xs text-gray-500 mt-1">
                  {reportType === 'weekly' ? 'This Week' : 'This Month'}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full text-red-600">
                <DollarSign size={24} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex justify-between items-center">              <div>
              <p className="text-sm text-gray-500">Total Profit</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalProfit)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {totalSalesAmount > 0
                  ? `${(Math.max(0, (totalProfit / totalSalesAmount) * 100)).toFixed(1)}% margin`
                  : 'No sales'}
              </p>
            </div>
              <div className={`${totalProfit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'} p-3 rounded-full`}>
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
                <p className="text-2xl font-bold text-gray-900">{totalTransactionsCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalTransactionsCount && totalSalesAmount
                    ? `Avg ${formatCurrency(totalSalesAmount / totalTransactionsCount)}`
                    : 'No transactions'}
                </p>
              </div>
              <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                <ShoppingBag size={24} />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">        <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-800">
            {reportType === 'weekly' ? 'Weekly Sales' : 'Monthly Sales (By Week)'}
          </h2>
        </CardHeader>
        <CardBody className="p-4">
          <div className="h-64">
            {salesData.length > 0 ? (<div className="h-full flex items-end space-x-2">
              {salesData.map((item, index) => {
                const maxValue = Math.max(...salesData.map(d => d.value), 1); // Ensure we don't divide by zero
                const heightPercentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

                return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="flex flex-col items-center w-full">
                      <span className="text-xs text-gray-600 mb-1">
                        {formatCurrency(item.value)}
                      </span>
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all duration-500 ease-in-out"
                        style={{
                          height: `${Math.max(heightPercentage, 2)}%`, // Ensure a minimum height for visibility
                          minHeight: item.value > 0 ? '8px' : '0' // Only show bars for non-zero values
                        }}
                      ></div>
                      <div className="text-xs mt-2 text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                        {item.label}
                      </div>
                    </div>
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
      </Card>        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-800">
              {reportType === 'weekly' ? 'Weekly Expenses' : 'Monthly Expenses (By Week)'}
            </h2>
          </CardHeader>
          <CardBody className="p-4">
            <div className="h-64">
              {expensesData.length > 0 ? (<div className="h-full flex items-end space-x-2">
                {expensesData.map((item, index) => {
                  const maxValue = Math.max(...expensesData.map(d => d.value), 1); // Ensure we don't divide by zero
                  const heightPercentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div className="flex flex-col items-center w-full">
                        <span className="text-xs text-gray-600 mb-1">
                          {formatCurrency(item.value)}
                        </span>
                        <div
                          className="w-full bg-red-500 rounded-t transition-all duration-500 ease-in-out"
                          style={{
                            height: `${Math.max(heightPercentage, 2)}%`, // Ensure a minimum height for visibility
                            minHeight: item.value > 0 ? '8px' : '0' // Only show bars for non-zero values
                          }}
                        ></div>
                        <div className="text-xs mt-2 text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                          {item.label}
                        </div>
                      </div>
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
            <h2 className="text-lg font-semibold text-gray-800">Sales vs Expenses</h2>
          </CardHeader>
          <CardBody className="p-4">
            <div className="h-64 flex flex-col justify-center">
              <div className="w-full bg-gray-200 rounded-full h-8 mb-6">
                {totalSalesAmount + totalExpensesAmount > 0 ? (
                  <div
                    className="bg-blue-500 h-8 rounded-l-full flex items-center justify-start pl-3"
                    style={{
                      width: `${Math.min(100, (totalSalesAmount / (totalSalesAmount + totalExpensesAmount)) * 100)}%`
                    }}
                  >
                    <span className="text-xs font-medium text-white">
                      Sales {((totalSalesAmount / (totalSalesAmount + totalExpensesAmount)) * 100).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div className="h-8 flex items-center justify-center">
                    <span className="text-xs text-gray-600">No data</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between mb-2">
                <div className="text-sm text-gray-600">Sales: {formatCurrency(totalSalesAmount)}</div>
                <div className="text-sm text-gray-600">Expenses: {formatCurrency(totalExpensesAmount)}</div>
              </div>

              <div className="mb-4">
                <h3 className="text-base font-medium mb-2">Profit Margin</h3>
                <div className="relative pt-1">
                  {totalSalesAmount > 0 ? (
                    <>
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                            {totalSalesAmount > 0
                              ? `${((totalProfit / totalSalesAmount) * 100).toFixed(1)}%`
                              : '0%'
                            }
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold inline-block text-blue-600">
                            {formatCurrency(totalProfit)}
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                        <div style={{ width: `${Math.max(0, Math.min(100, (totalProfit / totalSalesAmount) * 100))}%` }}
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${totalProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-2">No sales data available</div>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-800">Top Products by Revenue</h2>
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
                      <tr key={index} className={`hover:bg-gray-50 ${index < 3 ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`text-gray-900 font-${index < 3 ? 'medium' : 'normal'}`}>
                              {index < 3 && <span className="inline-flex items-center justify-center w-5 h-5 mr-2 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">{index + 1}</span>}
                              {product.name}
                            </div>
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

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-800">Top Products by Quantity</h2>
          </CardHeader>
          <CardBody className="p-0">
            {topProductsByQuantity.length > 0 ? (
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
                    {topProductsByQuantity.map((product, index) => (
                      <tr key={index} className={`hover:bg-gray-50 ${index < 3 ? 'bg-purple-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`text-gray-900 font-${index < 3 ? 'medium' : 'normal'}`}>
                              {index < 3 && <span className="inline-flex items-center justify-center w-5 h-5 mr-2 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">{index + 1}</span>}
                              {product.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-gray-900">{product.quantity}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-900">
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
          <div className="text-sm text-gray-600">
            {lowStockProducts.length} {lowStockProducts.length === 1 ? 'product' : 'products'} need attention
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {lowStockProducts.length > 0 ? (
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
                  {lowStockProducts.map((product) => {
                    // Calculate the percentage of stock remaining relative to threshold
                    const stockPercentage = Math.min(100, (product.stock / product.minStock) * 100);
                    const criticalThreshold = product.stock <= product.minStock * 0.5;

                    return (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900 font-semibold">{product.stock}</div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2"></div>
                            <div
                              className={`h-2.5 rounded-full ${criticalThreshold ? 'bg-red-600' :
                                product.stock <= product.minStock ? 'bg-yellow-500' : 'bg-yellow-300'
                                }`}
                              style={{ width: `${stockPercentage}%` }}
                            ></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">{product.minStock}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {criticalThreshold ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Critical - Reorder Now
                            </span>
                          ) : product.stock <= product.minStock ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Below Threshold
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-50 text-yellow-700">
                              Low Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">No low stock products</div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;