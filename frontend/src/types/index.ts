// Define types for the POS system

export interface ProductItem {
  _id: string;
  name: string;
  sellPrice: number;
  staffPrice: number;
  costPrice?: number;
  stock: number;
  categoryId: string;
  subcategory: string;
  description: string;
  isAvailable: boolean;
  owner: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  regularPrice?: number;
  staffPrice?: number;
  freeQuantity?: number;
  paidQuantity?: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  staffDiscount: boolean;
  staffName: string;
  paymentMethod?: 'Cash' | 'InstaPay';
  timestamp: Date;
  completed: boolean;
}

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
  displayAmount?: number; // Add displayAmount field to match backend
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