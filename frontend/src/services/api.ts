import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (email: string, password: string, twoFactorToken?: string) => {
  const response = await api.post('/users/login', { email, password, twoFactorToken });
  return response.data;
};

export const register = async (userData: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'Admin' | 'Cashier';
}) => {
  const response = await api.post('/users/register', userData);
  return response.data;
};

export const verifyEmail = async (email: string, otp: string) => {
  const response = await api.post('/users/verify-email', { email, otp });
  return response.data;
};

export const resendVerification = async (email: string) => {
  const response = await api.post('/users/resend-verification', { email });
  return response.data;
};

// Products
export const getProducts = async () => {
  const response = await api.get('/products');
  return response.data;
};

export const createProduct = async (productData: any) => {
  const response = await api.post('/products', productData);
  return response.data;
};

export const updateProduct = async (id: string, productData: any) => {
  const response = await api.put(`/products/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};

export const getFormattedProducts = async () => {
  const response = await api.get('/products/formatted-prices');
  return response.data;
};

// Categories
export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

export const createCategory = async (categoryData: any) => {
  const response = await api.post('/categories', categoryData);
  return response.data;
};

export const deleteCategory = async (id: string) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};

export const deleteSubcategory = async (categoryId: string, subcategoryName: string) => {
  const response = await api.delete(`/categories/${categoryId}/subcategories/${encodeURIComponent(subcategoryName)}`);
  return response.data;
};

// Sales
export const createSale = async (saleData: any) => {
  const response = await api.post('/sales', saleData);
  return response.data;
};

export const getSales = async (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  const response = await api.get('/sales', { params });
  return response.data;
};

export const getStaffPurchases = async (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  const response = await api.get('/sales/staff-purchases', { params });
  return response.data;
};

// Water Bottle Reports
export const getWaterBottleUsage = async (startDate?: string, endDate?: string) => {
  const response = await api.get('/reports/water-bottle-usage', {
    params: { startDate, endDate }
  });
  return response.data;
};

export const getStaffWaterBottleUsage = async (staffId: string) => {
  const response = await api.get(`/reports/staff/${staffId}/water-bottle-usage`);
  return response.data;
};

export const getStaffRecentPurchases = async (staffId: string) => {
  const response = await api.get(`/sales/staff/${staffId}/recent-purchases`);
  return response.data;
};

export const getRecentStaffPurchases = async (staffId: string) => {
  const response = await api.get(`/sales/staff-purchases/${staffId}/recent`);
  return response.data;
};

export const getSalesHistoryWithCost = async (params?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  subcategory?: string;
}) => {
  const response = await api.get('/sales/history-with-cost', { params });
  return response.data;
};

export async function getCurrentWeekTotal() {
  const response = await api.get('/sales/current-week-total');
  return response.data;
}

// Sales totals for analytics
export const getSalesMonthTotals = async () => {
  const response = await api.get('/sales/totals/month');
  return response.data;
};

export const getSalesWeekTotals = async () => {
  const response = await api.get('/sales/totals/week');
  return response.data;
};

// Sales profit endpoints
export const getSalesMonthProfit = async () => {
  const response = await api.get('/sales/profit/month');
  return response.data;
};

export const getSalesWeekProfit = async () => {
  const response = await api.get('/sales/profit/week');
  return response.data;
};

// Expenses totals
export const getExpensesMonthTotal = async () => {
  const response = await api.get('/expenses/current-month-total');
  return response.data;
};

export const getExpensesWeekTotal = async () => {
  const response = await api.get('/expenses/current-week-total');
  return response.data;
};

// Daily data for charts
export const getDailySalesMonth = async () => {
  const response = await api.get('/sales/daily/month');
  return response.data;
};

export const getDailySalesWeek = async () => {
  const response = await api.get('/sales/daily/week');
  return response.data;
};

export const getDailyExpensesMonth = async () => {
  const response = await api.get('/expenses/daily/month');
  return response.data;
};

export const getDailyExpensesWeek = async () => {
  const response = await api.get('/expenses/daily/week');
  return response.data;
};

// Staff
export const getStaff = async () => {
  const response = await api.get('/staff');
  return response.data;
};

export const createStaff = async (staffData: any) => {
  const response = await api.post('/staff', staffData);
  return response.data;
};

export const updateStaffBottles = async (
  id: string,
  bottleData: { Large_bottles?: number; Small_bottles?: number }
) => {
  const response = await api.patch(`/staff/${id}/bottles`, bottleData);
  return response.data;
};

// Expenses
export const getExpenses = async () => {
  const response = await api.get('/expenses');
  return response.data;
};

export const createExpense = async (expenseData: any) => {
  const response = await api.post('/expenses', expenseData);
  return response.data;
};

// Two-Factor Authentication
export const enable2FA = async () => {
  const response = await api.post('/users/enable-2fa');
  return response.data;
};

export const verify2FASetup = async (token: string) => {
  const response = await api.post('/users/verify-2fa-setup', { token });
  return response.data;
};

export const disable2FA = async (token: string) => {
  const response = await api.post('/users/disable-2fa', { token });
  return response.data;
};



// Enhanced User Management with Verification
export const searchUsers = async (query: string) => {
  const response = await api.get(`/users/search`, {
    params: { query }
  });
  return response.data;
};

export const getUserById = async (id: string) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

// Password Reset
export const requestPasswordReset = async (email: string) => {
  const response = await api.post('/users/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (email: string, resetCode: string, newPassword: string) => {
  const response = await api.post('/users/reset-password', { email, resetCode, newPassword });
  return response.data;
};

// Admin user management
export const getCashiers = async () => {
  const response = await api.get('/admin/cashiers');
  return response.data;
};

export const getCashierDetails = async (id: string) => {
  const response = await api.get(`/admin/cashiers/${id}`);
  return response.data;
};

export const approveCashier = async (id: string) => {
  const response = await api.post(`/admin/cashiers/${id}/approve`);
  return response.data;
};

export const deleteCashier = async (id: string) => {
  const response = await api.delete(`/admin/cashiers/${id}`);
  return response.data;
};

// Top products endpoints
export const getTopProductsWeek = async () => {
  const response = await api.get('/sales/top-products/week');
  return response.data;
};

export const getTopProductsMonth = async () => {
  const response = await api.get('/sales/top-products/month');
  return response.data;
};

// Bundle management endpoints
export const getBundles = async (search?: string) => {
  const response = await api.get('/bundles', { params: { search } });
  return response.data;
};

export const getBundleByPhone = async (phoneNumber: string) => {
  const response = await api.get(`/bundles/phone/${phoneNumber}`);
  return response.data;
};

export const getBundleByStaffId = async (staffId: string) => {
  const response = await api.get(`/bundles/staff/${staffId}`);
  return response.data;
};

export const createBundle = async (bundleData: {
  phoneNumber: string;
  amount: number;
  isStaff?: boolean;
  staffId?: string;
}) => {
  const response = await api.post('/bundles', bundleData);
  return response.data;
};

export const addFundsToBundle = async (bundleId: string, amount: number) => {
  const response = await api.put(`/bundles/${bundleId}/add-funds`, { amount });
  return response.data;
};

export const deductFromBundle = async (bundleId: string, amount: number) => {
  const response = await api.put(`/bundles/${bundleId}/deduct`, { amount });
  return response.data;
};

export const settleBundle = async (bundleId: string) => {
  const response = await api.delete(`/bundles/${bundleId}`);
  return response.data;
};

export default api;