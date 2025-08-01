// Define types for the POS system

export type UserRole = 'Admin' | 'Cashier';

export interface User {
  id: string;
  _id?: string; // MongoDB ID
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  password?: string; // Hashed password, only available for admins with verification
  isTwoFactorEnabled: boolean;
  isEmailVerified: boolean;
  isApproved?: boolean; // Added for cashier approval system
  loginAttempts?: number;
  lockUntil?: Date | null;
  createdAt?: string;
  updatedAt?: string;
}

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
  paymentMethod?: 'Cash' | 'InstaPay' | 'Bundles';
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
  paymentMethod: 'InstaPay' | 'Cash' | 'Bundles';
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

export interface Bundle {
  _id: string;
  phoneNumber: string;
  amount: number;
  isStaff: boolean;
  staffName?: string;
  staffId?: {
    _id: string;
    name: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}