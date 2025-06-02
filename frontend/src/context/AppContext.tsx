import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  ProductItem,
  Order,
  StaffMember,
  Transaction,
  Expense,
  AppState, // Updated AppState
  AppAction, // Updated AppAction
  User,
  LoginCredentials,
  AuthState,
  ProductItem,
  PurchasePayload,
  Order as OrderType,
  Transaction as TransactionType,
  Expense as ExpenseType,
  ExpensePayload,
  StaffMember as StaffMemberType, // Import StaffMember type
} from '../types';
import { shouldResetAllowance, generateId } from '../utils/helpers';
// Remove sample data for transactions, expenses, and staff
// import { sampleStaffMembers } from '../data/sampleData'; 
import { post as apiPost, get as apiGet, put as apiPut, del as apiDel } from '../utils/api';

// Initial Auth State
const initialAuthState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Attempt to load token and user from localStorage
// In a real app, user data might not be stored directly or might need re-validation
const storedToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
const storedUserString = typeof window !== 'undefined' ? localStorage.getItem('authUser') : null;
let initialUser: User | null = null;

if (storedUserString) {
  try {
    initialUser = JSON.parse(storedUserString);
  } catch (e) {
    console.error("Failed to parse stored user:", e);
    localStorage.removeItem('authUser'); // Clear corrupted data
    localStorage.removeItem('authToken'); // Clear token as well if user data is corrupt
  }
}

if (storedToken && initialUser) {
  initialAuthState.token = storedToken;
  initialAuthState.user = initialUser;
  initialAuthState.isAuthenticated = true;
} else if (storedToken && !initialUser) {
  // If token exists but no user, implies inconsistency or old session.
  // For now, we'll clear the token. A better approach might be to try to fetch user data.
  localStorage.removeItem('authToken');
}

// This was the duplicated section. Corrected AppState is already imported.
// const initialOrder: Order = { ... }; // This was also duplicated by mistake in previous diff read
// const initialState: AppState = { ... }; // This was the problematic part

// Corrected initialOrder definition
const initialOrderState: Order = { // Renamed to avoid conflict if Order type itself is named initialOrder somewhere
  id: generateId(),
  items: [],
  total: 0,
  staffDiscount: false,
  staffName: '',
  paymentMethod: 'Cash',
  timestamp: new Date(),
  completed: false
};

// Corrected initialState definition using AppState from types
const initialState: AppState = {
  inventory: [], 
  currentOrder: initialOrderState, 
  completedOrders: [],
  staffMembers: [], // Initialize as empty, will be fetched
  transactions: [], 
  expenses: [], 
  activeView: 'cashier',
  adminTab: 'inventory',
  auth: initialAuthState,
  isLoadingInventory: false,
  fetchInventoryError: null,
  isMutatingInventory: false,
  mutateInventoryError: null,
  isCreatingPurchase: false, 
  createPurchaseError: null,
  isLoadingPurchases: false,
  fetchPurchasesError: null,
  isLoadingExpenses: false,
  fetchExpensesError: null,
  isAddingExpense: false,
  addExpenseError: null,
  isLoadingStaff: false, // New state for staff
  fetchStaffError: null, // New state for staff
};

function appReducer(state: AppState, action: AppAction): AppState { 
  switch (action.type) {
    // ... other cases (Authentication, Product Fetching, Product CRUD, Purchase Actions, Expenses)
    
    // Authentication Actions
    case 'LOGIN_REQUEST':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: true,
          error: null,
        },
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: false,
          isAuthenticated: true,
          token: action.payload.token,
          user: action.payload.user,
          error: null,
        },
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: false,
          isAuthenticated: false,
          token: null,
          user: null,
          error: action.payload,
        },
      };
    case 'LOGOUT':
      return {
        ...state,
        auth: { // Reset to initial unauthenticated state
          ...initialAuthState, // Use a clean initial state
          token: null, // Ensure token is explicitly null
          user: null, // Ensure user is explicitly null
          isAuthenticated: false, // Ensure isAuth is explicitly false
        },
        // Optionally reset other parts of the state, like currentOrder or activeView
        // activeView: 'cashier', // Example: redirect to cashier/login view
        // Reset inventory loading status on logout
        isLoadingInventory: false,
        fetchInventoryError: null,
        inventory: [], // Clear inventory on logout
      };
    case 'SET_AUTH_LOADING':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: action.payload,
        },
      };
    case 'CLEAR_AUTH_ERROR':
      return {
        ...state,
        auth: {
          ...state.auth,
          error: null,
        },
      };

    // Product Fetching Actions
    case 'FETCH_PRODUCTS_REQUEST':
      return {
        ...state,
        isLoadingInventory: true,
        fetchInventoryError: null,
      };
    case 'FETCH_PRODUCTS_SUCCESS':
      return {
        ...state,
        inventory: action.payload,
        isLoadingInventory: false,
      };
    case 'FETCH_PRODUCTS_FAILURE':
      return {
        ...state,
        fetchInventoryError: action.payload,
        isLoadingInventory: false,
      };

    // Product CRUD Actions
    case 'ADD_PRODUCT_REQUEST':
    case 'UPDATE_PRODUCT_REQUEST':
    case 'DELETE_PRODUCT_REQUEST':
      return {
        ...state,
        isMutatingInventory: true,
        mutateInventoryError: null,
      };
    case 'ADD_PRODUCT_SUCCESS':
      return {
        ...state,
        inventory: [...state.inventory, action.payload],
        isMutatingInventory: false,
      };
    case 'UPDATE_PRODUCT_SUCCESS':
      return {
        ...state,
        inventory: state.inventory.map(product =>
          product.id === action.payload.id ? action.payload : product
        ),
        isMutatingInventory: false,
      };
    case 'DELETE_PRODUCT_SUCCESS':
      return {
        ...state,
        inventory: state.inventory.filter(product => product.id !== action.payload),
        isMutatingInventory: false,
      };
    case 'ADD_PRODUCT_FAILURE':
    case 'UPDATE_PRODUCT_FAILURE':
    case 'DELETE_PRODUCT_FAILURE':
      return {
        ...state,
        mutateInventoryError: action.payload,
        isMutatingInventory: false,
      };

    // Purchase Actions
    case 'CREATE_PURCHASE_REQUEST':
      return {
        ...state,
        isCreatingPurchase: true,
        createPurchaseError: null,
      };
    case 'CREATE_PURCHASE_SUCCESS':
      // If updatedProducts are provided by the backend, update inventory
      // Otherwise, inventory will be refetched by a subsequent FETCH_PRODUCTS_REQUEST
      let updatedInventoryState = state.inventory;
      if (action.payload.updatedProducts) {
        updatedInventoryState = state.inventory.map(p => {
          const updated = action.payload.updatedProducts?.find(up => up.id === p.id);
          return updated || p;
        });
      }
      return {
        ...state,
        completedOrders: [...state.completedOrders, action.payload.completedOrder],
        currentOrder: { // Reset current order
          ...initialOrderState, // Use the clean initialOrderState
          id: generateId(), // Generate a new ID for the next order
        },
        inventory: updatedInventoryState,
        isCreatingPurchase: false,
      };
    case 'CREATE_PURCHASE_FAILURE':
      return {
        ...state,
        createPurchaseError: action.payload,
        isCreatingPurchase: false,
      };

    // Purchases (Transactions) Fetching Actions
    case 'FETCH_PURCHASES_REQUEST':
      return { ...state, isLoadingPurchases: true, fetchPurchasesError: null };
    case 'FETCH_PURCHASES_SUCCESS':
      return { ...state, transactions: action.payload, isLoadingPurchases: false };
    case 'FETCH_PURCHASES_FAILURE':
      return { ...state, fetchPurchasesError: action.payload, isLoadingPurchases: false };

    // Expenses Actions
    case 'FETCH_EXPENSES_REQUEST':
      return { ...state, isLoadingExpenses: true, fetchExpensesError: null };
    case 'FETCH_EXPENSES_SUCCESS':
      return { ...state, expenses: action.payload, isLoadingExpenses: false };
    case 'FETCH_EXPENSES_FAILURE':
      return { ...state, fetchExpensesError: action.payload, isLoadingExpenses: false };
    
    case 'ADD_EXPENSE_REQUEST':
      return { ...state, isAddingExpense: true, addExpenseError: null };
    case 'ADD_EXPENSE_SUCCESS':
      return { 
        ...state, 
        expenses: [...state.expenses, action.payload], 
        isAddingExpense: false 
      };
    case 'ADD_EXPENSE_FAILURE':
      return { ...state, addExpenseError: action.payload, isAddingExpense: false };

    // Staff Fetching Actions
    case 'FETCH_STAFF_REQUEST':
      return { ...state, isLoadingStaff: true, fetchStaffError: null };
    case 'FETCH_STAFF_SUCCESS':
      return {
        ...state,
        staffMembers: action.payload.map(staff => ({
          ...staff,
          // Ensure waterBottleAllowance exists, initialize if not provided by backend
          waterBottleAllowance: staff.waterBottleAllowance || { large: 2, small: 2 }
        })),
        isLoadingStaff: false,
      };
    case 'FETCH_STAFF_FAILURE':
      return { ...state, fetchStaffError: action.payload, isLoadingStaff: false };

    // Old direct mutation actions & COMPLETE_ORDER - ensure they are not used or are deprecated
    // case 'ADD_PRODUCT':
    //   return {
    //     ...state,
    //     inventory: [...state.inventory, action.payload]
    //   };
    // case 'UPDATE_PRODUCT':
    //   return {
    //     ...state,
    //     inventory: state.inventory.map(product =>
    //       product.id === action.payload.id ? action.payload : product
    //     )
    //   };
    // case 'REMOVE_PRODUCT':
    //   return {
    //     ...state,
    //     inventory: state.inventory.filter(product => product.id !== action.payload)
    //   };
    // case 'ADD_EXPENSE': // This is now handled by ADD_EXPENSE_SUCCESS
    //   return {
    //     ...state,
    //     expenses: [...state.expenses, action.payload]
    //   };

    // Existing actions (Cashier/Order related, etc.)
    case 'SET_VIEW':
      return {
        ...state,
        activeView: action.payload
      };
    
    case 'SET_ADMIN_TAB':
      return {
        ...state,
        adminTab: action.payload
      };
    
    case 'ADD_TO_ORDER': {
      const { product, quantity, isStaffPrice } = action.payload;
      const price = isStaffPrice ? product.staffPrice : product.regularPrice;
      
      // Check if item already exists in order
      const existingItemIndex = state.currentOrder.items.findIndex(
        item => item.productId === product.id
      );
      
      let updatedItems;
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        updatedItems = [...state.currentOrder.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity
        };
      } else {
        // Add new item
        updatedItems = [
          ...state.currentOrder.items,
          {
            productId: product.id,
            name: product.name,
            price,
            quantity
          }
        ];
      }
      
      // Calculate new total
      const total = updatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      
      return {
        ...state,
        currentOrder: {
          ...state.currentOrder,
          items: updatedItems,
          total
        }
      };
    }
    
    case 'REMOVE_FROM_ORDER': {
      const updatedItems = state.currentOrder.items.filter(
        item => item.productId !== action.payload
      );
      
      // Calculate new total
      const total = updatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      
      return {
        ...state,
        currentOrder: {
          ...state.currentOrder,
          items: updatedItems,
          total
        }
      };
    }
    
    case 'UPDATE_ORDER_ITEM_QUANTITY': {
      const { productId, quantity } = action.payload;
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        return appReducer(state, { type: 'REMOVE_FROM_ORDER', payload: productId });
      }
      
      const updatedItems = state.currentOrder.items.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      );
      
      // Calculate new total
      const total = updatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      
      return {
        ...state,
        currentOrder: {
          ...state.currentOrder,
          items: updatedItems,
          total
        }
      };
    }
    
    case 'SET_STAFF_DISCOUNT': {
      const { enabled, staffName = '' } = action.payload;
      
      // If enabling staff discount, update prices to staff prices
      let updatedItems = [...state.currentOrder.items];
      
      if (enabled) {
        updatedItems = updatedItems.map(item => {
          const product = state.inventory.find(p => p.id === item.productId);
          if (product) {
            return {
              ...item,
              price: product.staffPrice
            };
          }
          return item;
        });
      } else {
        // Reset to regular prices
        updatedItems = updatedItems.map(item => {
          const product = state.inventory.find(p => p.id === item.productId);
          if (product) {
            return {
              ...item,
              price: product.regularPrice
            };
          }
          return item;
        });
      }
      
      // Calculate new total
      const total = updatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      
      return {
        ...state,
        currentOrder: {
          ...state.currentOrder,
          items: updatedItems,
          total,
          staffDiscount: enabled,
          staffName: enabled ? staffName : ''
        }
      };
    }
    
    case 'COMPLETE_ORDER': {
      // This action is now largely superseded by CREATE_PURCHASE_*.
      // Its current implementation directly mutates state based on frontend logic.
      // For now, we can leave its existing UI-only logic (like staff allowance)
      // but the core order completion (inventory update, adding to completedOrders, resetting currentOrder)
      // is handled by CREATE_PURCHASE_SUCCESS.
      // Ideally, all side effects (like creating transaction record) should be backend-driven.
      // Consider removing this action or refactoring it to only handle purely UI concerns
      // not covered by the new purchase flow.
      // For this task, we'll assume CREATE_PURCHASE_SUCCESS handles the essential parts.
      // The inventory update in COMPLETE_ORDER is now redundant if CREATE_PURCHASE_SUCCESS
      // either gets updated products or triggers a refetch.

      // Retain staff allowance update for now, assuming it's a local client concern not (yet) API driven.
      const { paymentMethod } = action.payload; // paymentMethod is part of the action, but not used if API handles it.
      const completedOrderData = state.currentOrder; // Use current order data for this logic.
      
      let updatedStaffMembers = [...state.staffMembers];
      if (completedOrderData.staffDiscount && completedOrderData.staffName) {
        const staffMember = updatedStaffMembers.find(
          staff => staff.name === completedOrderData.staffName
        );
        if (staffMember) {
          const largeWaterBottleItem = completedOrderData.items.find(
            item => state.inventory.find(p => p.id === item.productId)?.name === 'Large Water Bottle'
          );
          const smallWaterBottleItem = completedOrderData.items.find(
            item => state.inventory.find(p => p.id === item.productId)?.name === 'Small Water Bottle'
          );
          updatedStaffMembers = updatedStaffMembers.map(staff => {
            if (staff.id === staffMember.id) {
              return {
                ...staff,
                waterBottleAllowance: {
                  large: largeWaterBottleItem 
                    ? Math.max(0, staff.waterBottleAllowance.large - largeWaterBottleItem.quantity)
                    : staff.waterBottleAllowance.large,
                  small: smallWaterBottleItem
                    ? Math.max(0, staff.waterBottleAllowance.small - smallWaterBottleItem.quantity)
                    : staff.waterBottleAllowance.small
                }
              };
            }
            return staff;
          });
        }
      }
      // The rest of COMPLETE_ORDER (adding to completedOrders, resetting currentOrder, updating inventory)
      // is now primarily handled by CREATE_PURCHASE_SUCCESS.
      // We only update staff members here.
      return {
        ...state,
        staffMembers: updatedStaffMembers,
        // Note: We are NOT changing currentOrder or completedOrders here anymore.
        // That's for CREATE_PURCHASE_SUCCESS.
        // Also not creating a local transaction object here.
      };
    }
    
    case 'RESET_ORDER':
      return {
        ...state,
        currentOrder: {
          ...initialOrder,
          id: generateId()
        }
      };
    
    // case 'ADD_PRODUCT': 
    // case 'UPDATE_PRODUCT': 
    // case 'REMOVE_PRODUCT': 
    // case 'ADD_EXPENSE': // All handled by new request/success/failure patterns
    
    case 'UPDATE_WATER_BOTTLE_ALLOWANCE': {
      const { staffId, type, newAmount } = action.payload;
      
      return {
        ...state,
        staffMembers: state.staffMembers.map(staff => {
          if (staff.id === staffId) {
            return {
              ...staff,
              waterBottleAllowance: {
                ...staff.waterBottleAllowance,
                [type]: newAmount
              }
            };
          }
          return staff;
        })
      };
    }
    
    case 'RESET_ALLOWANCES':
      return {
        ...state,
        staffMembers: state.staffMembers.map(staff => ({
          ...staff,
          waterBottleAllowance: {
            large: 2,
            small: 2
          }
        }))
      };
    
    default:
      return state;
  }
}

type AppContextType = {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearAuthError: () => void;
  fetchProducts: () => Promise<void>;
  addProduct: (productData: Omit<ProductItem, 'id'>) => Promise<void>;
  updateProduct: (productId: string, productData: Partial<ProductItem>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  createPurchase: (purchaseData: PurchasePayload) => Promise<OrderType | null>;
  fetchPurchases: (filters?: Record<string, any>) => Promise<void>;
  fetchExpenses: () => Promise<void>;
  addExpense: (expenseData: ExpensePayload) => Promise<void>;
  fetchStaff: () => Promise<void>; // Added fetchStaff
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState); // Use initialState directly

  const fetchProductsCb = useCallback(async () => {
    if (state.auth.isAuthenticated && !state.isLoadingInventory && state.inventory.length === 0 && !state.fetchInventoryError) {
      dispatch({ type: 'FETCH_PRODUCTS_REQUEST' });
      try {
        const products = await apiGet('/products');
        dispatch({ type: 'FETCH_PRODUCTS_SUCCESS', payload: products as ProductItem[] });
      } catch (error: any) {
        console.error('Fetch products failed:', error);
        dispatch({ type: 'FETCH_PRODUCTS_FAILURE', payload: error.message || 'Failed to fetch products.' });
      }
    }
  }, [state.auth.isAuthenticated, state.isLoadingInventory, state.inventory.length, state.fetchInventoryError]);

  // Effect for initial auth check and loading user data
  useEffect(() => {
    const attemptRehydrateAuth = () => {
      const token = localStorage.getItem('authToken');
      const userString = localStorage.getItem('authUser');
      if (token && userString) {
        try {
          const user: User = JSON.parse(userString);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
          // Trigger product fetch after successful rehydration
          // This will be handled by the useEffect below that listens to isAuthenticated
        } catch (error) {
          console.error("Failed to parse user from localStorage", error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          dispatch({ type: 'LOGOUT' });
        }
      } else if (token && !userString) {
          localStorage.removeItem('authToken');
          dispatch({ type: 'LOGOUT' });
      }
    };
    attemptRehydrateAuth();
  }, []); 

  // Effect to fetch initial data when user is authenticated
  useEffect(() => {
    if (state.auth.isAuthenticated) {
      if (state.inventory.length === 0 && !state.isLoadingInventory && !state.fetchInventoryError) {
        fetchProductsCb();
      }
      // Fetch staff data if not already loaded
      if (state.staffMembers.length === 0 && !state.isLoadingStaff && !state.fetchStaffError) {
        fetchStaffCb();
      }
      // Note: Purchases and Expenses are typically fetched on demand by their specific views,
      // but could be fetched here too if needed globally upon login.
    }
  }, [
    state.auth.isAuthenticated, 
    state.inventory.length, 
    state.isLoadingInventory, 
    state.fetchInventoryError, 
    fetchProductsCb,
    state.staffMembers.length, // Added staff dependencies
    state.isLoadingStaff,
    state.fetchStaffError,
    fetchStaffCb // Added fetchStaffCb
  ]);

  // Check if water bottle allowances should be reset (on the 1st of each month)
  useEffect(() => {
    if (shouldResetAllowance()) {
      dispatch({ type: 'RESET_ALLOWANCES' });
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN_REQUEST' });
    try {
      const response = await apiPost('/auth/login', credentials);
      if (response && response.token && response.user) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        dispatch({ type: 'LOGIN_SUCCESS', payload: { token: response.token, user: response.user } });
        // Products will be fetched by the useEffect listening to isAuthenticated
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: 'Login failed: Invalid server response.' });
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Login attempt failed.';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearAuthError = useCallback(() => {
    dispatch({ type: 'CLEAR_AUTH_ERROR' });
  }, []);

  // Product CRUD Operations
  const addProductCb = useCallback(async (productData: Omit<ProductItem, 'id'>) => {
    dispatch({ type: 'ADD_PRODUCT_REQUEST' });
    try {
      const newProduct = await apiPost('/products', productData);
      dispatch({ type: 'ADD_PRODUCT_SUCCESS', payload: newProduct as ProductItem });
    } catch (error: any) {
      console.error('Add product failed:', error);
      dispatch({ type: 'ADD_PRODUCT_FAILURE', payload: error.message || 'Failed to add product.' });
      throw error; // Re-throw to allow components to catch it
    }
  }, []);

  const updateProductCb = useCallback(async (productId: string, productData: Partial<ProductItem>) => {
    dispatch({ type: 'UPDATE_PRODUCT_REQUEST' });
    try {
      const updatedProduct = await apiPut(`/products/${productId}`, productData);
      dispatch({ type: 'UPDATE_PRODUCT_SUCCESS', payload: updatedProduct as ProductItem });
    } catch (error: any) {
      console.error('Update product failed:', error);
      dispatch({ type: 'UPDATE_PRODUCT_FAILURE', payload: error.message || 'Failed to update product.' });
      throw error; // Re-throw to allow components to catch it
    }
  }, []);

  const deleteProductCb = useCallback(async (productId: string) => {
    dispatch({ type: 'DELETE_PRODUCT_REQUEST' });
    try {
      await apiDel(`/products/${productId}`); // Assuming del returns success/failure or no content
      dispatch({ type: 'DELETE_PRODUCT_SUCCESS', payload: productId });
    } catch (error: any) {
      console.error('Delete product failed:', error);
      dispatch({ type: 'DELETE_PRODUCT_FAILURE', payload: error.message || 'Failed to delete product.' });
      throw error; // Re-throw to allow components to catch it
    }
  }, []);

  // Purchase Creation
  const createPurchaseCb = useCallback(async (purchaseData: PurchasePayload): Promise<OrderType | null> => {
    dispatch({ type: 'CREATE_PURCHASE_REQUEST' });
    try {
      const newPurchaseOrder = await apiPost('/purchases', purchaseData) as OrderType;
      
      dispatch({ 
        type: 'CREATE_PURCHASE_SUCCESS', 
        payload: { completedOrder: newPurchaseOrder } 
        // If backend sends updated product list:
        // payload: { completedOrder: newPurchaseOrder, updatedProducts: newPurchaseOrder.updatedItemsList }
      });

      // Refetch products to update stock levels after a successful purchase.
      fetchProductsCb(); 

      return newPurchaseOrder;
    } catch (error: any) {
      console.error('Create purchase failed:', error);
      const errorMessage = error.message || 'Failed to create purchase.';
      dispatch({ type: 'CREATE_PURCHASE_FAILURE', payload: errorMessage });
      throw error; 
    }
  }, [fetchProductsCb]);
  
  // Fetch Staff Members
  const fetchStaffCb = useCallback(async () => {
    dispatch({ type: 'FETCH_STAFF_REQUEST' });
    try {
      const staffData = await apiGet('/staff');
      dispatch({ type: 'FETCH_STAFF_SUCCESS', payload: staffData as StaffMemberType[] });
    } catch (error: any) {
      dispatch({ type: 'FETCH_STAFF_FAILURE', payload: error.message || 'Failed to fetch staff.' });
    }
  }, []);

  // Fetch Purchases (Transactions)
  const fetchPurchasesCb = useCallback(async (filters?: Record<string, any>) => {
    dispatch({ type: 'FETCH_PURCHASES_REQUEST' });
    try {
      const purchases = await apiGet('/purchases', filters);
      dispatch({ type: 'FETCH_PURCHASES_SUCCESS', payload: purchases as TransactionType[] });
    } catch (error: any) {
      dispatch({ type: 'FETCH_PURCHASES_FAILURE', payload: error.message || 'Failed to fetch purchases.' });
    }
  }, []);

  // Fetch Expenses
  const fetchExpensesCb = useCallback(async () => {
    dispatch({ type: 'FETCH_EXPENSES_REQUEST' });
    try {
      const expensesData = await apiGet('/expenses');
      dispatch({ type: 'FETCH_EXPENSES_SUCCESS', payload: expensesData as ExpenseType[] });
    } catch (error: any) {
      dispatch({ type: 'FETCH_EXPENSES_FAILURE', payload: error.message || 'Failed to fetch expenses.' });
    }
  }, []);

  // Add Expense
  const addExpenseCb = useCallback(async (expenseData: ExpensePayload) => {
    dispatch({ type: 'ADD_EXPENSE_REQUEST' });
    try {
      const newExpense = await apiPost('/expenses', expenseData);
      dispatch({ type: 'ADD_EXPENSE_SUCCESS', payload: newExpense as ExpenseType });
    } catch (error: any) {
      dispatch({ type: 'ADD_EXPENSE_FAILURE', payload: error.message || 'Failed to add expense.' });
      throw error; // Re-throw for component error handling
    }
  }, []);
  
  const contextValue: AppContextType = {
    state,
    dispatch,
    login,
    logout,
    clearAuthError,
    fetchProducts: fetchProductsCb,
    addProduct: addProductCb,
    updateProduct: updateProductCb,
    deleteProduct: deleteProductCb,
    createPurchase: createPurchaseCb,
    fetchPurchases: fetchPurchasesCb,
    fetchExpenses: fetchExpensesCb,
    addExpense: addExpenseCb,
    fetchStaff: fetchStaffCb, // Expose fetchStaff
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};