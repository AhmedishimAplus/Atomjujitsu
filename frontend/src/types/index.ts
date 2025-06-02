// Define types for the POS system

export type ProductItem = {
  id: string;
  name: string;
  regularPrice: number;
  staffPrice: number;
  purchaseCost: number;
  quantity: number;
  reorderThreshold: number;
  category: string;
  image?: string;
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

// --- Authentication Types ---

export type User = {
  id: string;
  username: string;
  email?: string; // Optional: email might be used for login
  roles?: string[]; // Optional: for role-based access control
  // Add any other user-specific fields returned by your backend
};

export type LoginCredentials = {
  username_email: string; // Can be username or email
  password_hash: string; // Field name as expected by backend
};

export type AuthState = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

// --- App State and Actions ---

export type AppState = {
  inventory: ProductItem[];
  currentOrder: Order;
  completedOrders: Order[];
  staffMembers: StaffMember[];
  transactions: Transaction[];
  expenses: Expense[];
  activeView: 'cashier' | 'admin';
  adminTab: 'inventory' | 'financial' | 'analytics' | 'staff';
  auth: AuthState; // Added auth state
  isLoadingInventory: boolean;
  fetchInventoryError: string | null;
  isMutatingInventory: boolean;
  mutateInventoryError: string | null;
  isCreatingPurchase: boolean;
  createPurchaseError: string | null;
  // Purchases (Transactions)
  isLoadingPurchases: boolean;
  fetchPurchasesError: string | null;
  // Expenses
  isLoadingExpenses: boolean;
  fetchExpensesError: string | null;
  isAddingExpense: boolean;
  addExpenseError: string | null;
  // Staff
  isLoadingStaff: boolean;
  fetchStaffError: string | null;
};

export type PurchaseProductPayload = {
  productId: string;
  quantity: number;
  // priceAtPurchase?: number; // Optional: if you want to record the price at the time of sale
};

export type PurchasePayload = {
  items: PurchaseProductPayload[];
  paymentMethod: 'InstaPay' | 'Cash';
  staffName?: string; // Optional, only if staff discount is applied
  totalAmount: number;
  staffDiscountApplied: boolean; // To explicitly state if discount was applied
  // transactionId?: string; // Optional: if InstaPay provides a transaction ID
};

export type ExpensePayload = Omit<Expense, 'id'>;

export type AppAction =
  | { type: 'SET_VIEW'; payload: 'cashier' | 'admin' }
  | { type: 'SET_ADMIN_TAB'; payload: 'inventory' | 'financial' | 'analytics' | 'staff' }
  | { type: 'ADD_TO_ORDER'; payload: { product: ProductItem; quantity: number; isStaffPrice: boolean } }
  | { type: 'REMOVE_FROM_ORDER'; payload: string }
  | { type: 'UPDATE_ORDER_ITEM_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'SET_STAFF_DISCOUNT'; payload: { enabled: boolean; staffName?: string } }
  | { type: 'COMPLETE_ORDER'; payload: { paymentMethod: 'InstaPay' | 'Cash' } }
  | { type: 'RESET_ORDER' }
  // | { type: 'ADD_PRODUCT'; payload: ProductItem } // Replaced
  // | { type: 'UPDATE_PRODUCT'; payload: ProductItem } // Replaced
  // | { type: 'REMOVE_PRODUCT'; payload: string } // Replaced
  // | { type: 'ADD_EXPENSE'; payload: Expense } // Replaced by new expense actions
  | { type: 'UPDATE_WATER_BOTTLE_ALLOWANCE'; payload: { staffId: string; type: 'large' | 'small'; newAmount: number } }
  | { type: 'RESET_ALLOWANCES' }
  // Auth actions
  | { type: 'LOGIN_REQUEST' }
  | { type: 'LOGIN_SUCCESS'; payload: { token: string; user: User } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'CLEAR_AUTH_ERROR' }
  // Product Fetching Actions
  | { type: 'FETCH_PRODUCTS_REQUEST' }
  | { type: 'FETCH_PRODUCTS_SUCCESS'; payload: ProductItem[] }
  | { type: 'FETCH_PRODUCTS_FAILURE'; payload: string }
  // Product CRUD Actions
  | { type: 'ADD_PRODUCT_REQUEST' }
  | { type: 'ADD_PRODUCT_SUCCESS'; payload: ProductItem }
  | { type: 'ADD_PRODUCT_FAILURE'; payload: string }
  | { type: 'UPDATE_PRODUCT_REQUEST' }
  | { type: 'UPDATE_PRODUCT_SUCCESS'; payload: ProductItem }
  | { type: 'UPDATE_PRODUCT_FAILURE'; payload: string }
  | { type: 'DELETE_PRODUCT_REQUEST' }
  | { type: 'DELETE_PRODUCT_SUCCESS'; payload: string /* productId */ }
  | { type: 'DELETE_PRODUCT_FAILURE'; payload: string }
  // Purchase Actions
  | { type: 'CREATE_PURCHASE_REQUEST' }
  | { type: 'CREATE_PURCHASE_SUCCESS'; payload: { completedOrder: Order, updatedProducts?: ProductItem[] } }
  | { type: 'CREATE_PURCHASE_FAILURE'; payload: string }
  // Purchases (Transactions) Fetching Actions
  | { type: 'FETCH_PURCHASES_REQUEST' }
  | { type: 'FETCH_PURCHASES_SUCCESS'; payload: Transaction[] }
  | { type: 'FETCH_PURCHASES_FAILURE'; payload: string }
  // Expenses Actions
  | { type: 'FETCH_EXPENSES_REQUEST' }
  | { type: 'FETCH_EXPENSES_SUCCESS'; payload: Expense[] }
  | { type: 'FETCH_EXPENSES_FAILURE'; payload: string }
  | { type: 'ADD_EXPENSE_REQUEST' }
  | { type: 'ADD_EXPENSE_SUCCESS'; payload: Expense }
  | { type: 'ADD_EXPENSE_FAILURE'; payload: string }
  // Staff Fetching Actions
  | { type: 'FETCH_STAFF_REQUEST' }
  | { type: 'FETCH_STAFF_SUCCESS'; payload: StaffMember[] }
  | { type: 'FETCH_STAFF_FAILURE'; payload: string };