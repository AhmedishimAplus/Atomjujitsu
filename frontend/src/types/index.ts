// Define types for the POS system

export type ProductItem = {
  _id: string;
  name: string;
  staffPrice: number;
  sellPrice: number;
  costPrice?: number;
  stock: number;
  owner: 'Quarter' | 'Sharoofa';
  categoryId: string;
  categoryName?: string;
  subcategory: string;
  description?: string;
  isAvailable: boolean;
};

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  staffDiscount: boolean;
  staffName: string;
  paymentMethod: 'InstaPay' | 'Cash';
  timestamp: Date;
  completed: boolean;
};

export type StaffMember = {
  id: string;
  name: string;
  waterBottleAllowance: {
    large: number;
    small: number;
  };
};

export type Transaction = {
  id: string;
  orderId: string;
  total: number;
  paymentMethod: 'InstaPay' | 'Cash';
  timestamp: Date;
  staffDiscount: boolean;
  staffName?: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  date: Date;
  category: string;
};

export type Report = {
  startDate: Date;
  endDate: Date;
  sales: number;
  expenses: number;
  profit: number;
  itemsSold: {
    [productId: string]: {
      quantity: number;
      revenue: number;
    };
  };
};