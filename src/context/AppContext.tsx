import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { ProductItem, OrderItem, Order, StaffMember, Transaction, Expense } from '../types';
import { shouldResetAllowance, generateId } from '../utils/helpers';
import { sampleProducts, sampleStaffMembers, generateSampleTransactions, generateSampleExpenses } from '../data/sampleData';

type AppState = {
  inventory: ProductItem[];
  currentOrder: Order;
  completedOrders: Order[];
  staffMembers: StaffMember[];
  transactions: Transaction[];
  expenses: Expense[];
  activeView: 'cashier' | 'admin';
  adminTab: 'inventory' | 'financial' | 'analytics' | 'staff';
};

type AppAction =
  | { type: 'SET_VIEW'; payload: 'cashier' | 'admin' }
  | { type: 'SET_ADMIN_TAB'; payload: 'inventory' | 'financial' | 'analytics' | 'staff' }
  | { type: 'ADD_TO_ORDER'; payload: { product: ProductItem; quantity: number; isStaffPrice: boolean } }
  | { type: 'REMOVE_FROM_ORDER'; payload: string }
  | { type: 'UPDATE_ORDER_ITEM_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'SET_STAFF_DISCOUNT'; payload: { enabled: boolean; staffName?: string } }
  | { type: 'COMPLETE_ORDER'; payload: { paymentMethod: 'InstaPay' | 'Cash' } }
  | { type: 'RESET_ORDER' }
  | { type: 'ADD_PRODUCT'; payload: ProductItem }
  | { type: 'UPDATE_PRODUCT'; payload: ProductItem }
  | { type: 'REMOVE_PRODUCT'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_WATER_BOTTLE_ALLOWANCE'; payload: { staffId: string; type: 'large' | 'small'; newAmount: number } }
  | { type: 'RESET_ALLOWANCES' };

const initialOrder: Order = {
  id: generateId(),
  items: [],
  total: 0,
  staffDiscount: false,
  staffName: '',
  paymentMethod: 'Cash',
  timestamp: new Date(),
  completed: false
};

const initialState: AppState = {
  inventory: sampleProducts,
  currentOrder: initialOrder,
  completedOrders: [],
  staffMembers: sampleStaffMembers,
  transactions: generateSampleTransactions(),
  expenses: generateSampleExpenses(),
  activeView: 'cashier',
  adminTab: 'inventory'
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
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
      const { paymentMethod } = action.payload;
      const completedOrder: Order = {
        ...state.currentOrder,
        paymentMethod,
        timestamp: new Date(),
        completed: true
      };
      
      // Create transaction record
      const transaction: Transaction = {
        id: generateId(),
        orderId: completedOrder.id,
        total: completedOrder.total,
        paymentMethod,
        timestamp: new Date(),
        staffDiscount: completedOrder.staffDiscount,
        staffName: completedOrder.staffName || undefined
      };
      
      // Update inventory quantities
      const updatedInventory = state.inventory.map(product => {
        const orderItem = completedOrder.items.find(item => item.productId === product.id);
        if (orderItem) {
          return {
            ...product,
            quantity: Math.max(0, product.quantity - orderItem.quantity)
          };
        }
        return product;
      });
      
      // Update staff water bottle allowance if applicable
      let updatedStaffMembers = [...state.staffMembers];
      
      if (completedOrder.staffDiscount && completedOrder.staffName) {
        const staffMember = updatedStaffMembers.find(
          staff => staff.name === completedOrder.staffName
        );
        
        if (staffMember) {
          const largeWaterBottleItem = completedOrder.items.find(
            item => {
              const product = state.inventory.find(p => p.id === item.productId);
              return product && product.name === 'Large Water Bottle';
            }
          );
          
          const smallWaterBottleItem = completedOrder.items.find(
            item => {
              const product = state.inventory.find(p => p.id === item.productId);
              return product && product.name === 'Small Water Bottle';
            }
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
      
      return {
        ...state,
        inventory: updatedInventory,
        currentOrder: {
          ...initialOrder,
          id: generateId()
        },
        completedOrders: [...state.completedOrders, completedOrder],
        transactions: [...state.transactions, transaction],
        staffMembers: updatedStaffMembers
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
    
    case 'ADD_PRODUCT':
      return {
        ...state,
        inventory: [...state.inventory, action.payload]
      };
    
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        inventory: state.inventory.map(product =>
          product.id === action.payload.id ? action.payload : product
        )
      };
    
    case 'REMOVE_PRODUCT':
      return {
        ...state,
        inventory: state.inventory.filter(product => product.id !== action.payload)
      };
    
    case 'ADD_EXPENSE':
      return {
        ...state,
        expenses: [...state.expenses, action.payload]
      };
    
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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Check if water bottle allowances should be reset (on the 1st of each month)
  useEffect(() => {
    if (shouldResetAllowance()) {
      dispatch({ type: 'RESET_ALLOWANCES' });
    }
  }, []);
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
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