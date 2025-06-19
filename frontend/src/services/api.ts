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

export const login = async (email: string, password: string) => {
  const response = await api.post('/users/login', { email, password });
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

export async function getCurrentWeekTotal(token: string) {
  const res = await fetch('/api/sales/current-week-total', {
    headers: {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
  if (!res.ok) throw new Error('Failed to fetch current week total');
  return res.json();
}

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

export default api;