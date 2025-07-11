import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { ProductItem, Order, StaffMember, Transaction, Expense, User } from '../types';
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
  adminTab: 'inventory' | 'financial' | 'analytics' | 'staff' | 'water-bottles' | '2fa' | 'users';
  user: User | null;
};

type AppAction =
  | { type: 'SET_VIEW'; payload: 'cashier' | 'admin' }
  | { type: 'SET_ADMIN_TAB'; payload: 'inventory' | 'financial' | 'analytics' | 'staff' | 'water-bottles' | '2fa' | 'users' }
  | { type: 'ADD_TO_ORDER'; payload: { product: ProductItem; quantity: number; isStaffPrice: boolean } }
  | { type: 'REMOVE_FROM_ORDER'; payload: string }
  | { type: 'UPDATE_ORDER_ITEM_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'SET_STAFF_DISCOUNT'; payload: { enabled: boolean; staffName?: string; staffId?: string } }
  | { type: 'COMPLETE_ORDER'; payload: { paymentMethod: 'InstaPay' | 'Cash'; freeBottleInfo?: { productId: string; freeQuantity: number; paidQuantity: number }[] } }
  | { type: 'RESET_ORDER' }
  | { type: 'ADD_PRODUCT'; payload: ProductItem }
  | { type: 'UPDATE_PRODUCT'; payload: ProductItem }
  | { type: 'REMOVE_PRODUCT'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'ADD_STAFF'; payload: StaffMember }
  | { type: 'UPDATE_STAFF'; payload: StaffMember }
  | { type: 'DELETE_STAFF'; payload: string }
  | { type: 'SET_STAFF_LIST'; payload: StaffMember[] }
  | { type: 'UPDATE_WATER_BOTTLE_ALLOWANCE'; payload: { staffId: string; type: 'large' | 'small'; newAmount: number } }
  | { type: 'RESET_ALLOWANCES' }
  | { type: 'SET_USER'; payload: User | null };

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
  adminTab: 'inventory',
  user: null
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
      const price = isStaffPrice ? product.staffPrice : product.sellPrice;

      // Check if item already exists in order
      const existingItemIndex = state.currentOrder.items.findIndex(
        item => item.productId === product._id
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
            productId: product._id,
            name: product.name,
            price,
            quantity,
            regularPrice: product.sellPrice,
            staffPrice: product.staffPrice
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
    } case 'SET_STAFF_DISCOUNT': {
      const { enabled, staffName = '' } = action.payload;

      // Update prices for all items based on the new discount setting
      const updatedItems = state.currentOrder.items.map(item => ({
        ...item,
        price: enabled
          ? (typeof item.staffPrice === 'number' ? item.staffPrice : item.price)
          : (typeof item.regularPrice === 'number' ? item.regularPrice : item.price)
      }));

      // Calculate new total with updated prices
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
      const { paymentMethod, freeBottleInfo } = action.payload;

      // Copy the items with free bottle information if provided
      let itemsWithFreeBottleInfo = [...state.currentOrder.items];

      if (freeBottleInfo) {
        // Update items with free bottle information
        itemsWithFreeBottleInfo = state.currentOrder.items.map(item => {
          const bottleInfo = freeBottleInfo.find(info => info.productId === item.productId);
          if (bottleInfo) {
            return {
              ...item,
              freeQuantity: bottleInfo.freeQuantity,
              paidQuantity: bottleInfo.paidQuantity
            };
          }
          return item;
        });
      }      // Calculate the actual total based on free bottle info
      const calculatedTotal = itemsWithFreeBottleInfo.reduce((total, item) => {
        // If this item has free quantity info, only count the paid portion
        if (item.freeQuantity) {
          return total + ((item.paidQuantity || 0) * item.price);
        }
        // Otherwise count the full amount
        return total + (item.quantity * item.price);
      }, 0);

      const completedOrder: Order = {
        ...state.currentOrder,
        items: itemsWithFreeBottleInfo,
        paymentMethod,
        timestamp: new Date(),
        completed: true,
        total: calculatedTotal // Use the calculated total instead
      };      // Create transaction record
      const transaction: Transaction = {
        id: generateId(),
        orderId: completedOrder.id,
        total: calculatedTotal,
        displayAmount: calculatedTotal, // Add displayAmount to match backend
        paymentMethod,
        timestamp: new Date(),
        staffDiscount: completedOrder.staffDiscount,
        staffName: completedOrder.staffName || undefined
      };

      // Update inventory quantities
      const updatedInventory = state.inventory.map(product => {
        const orderItem = completedOrder.items.find(item => item.productId === product._id);
        if (orderItem) {
          return {
            ...product,
            stock: Math.max(0, product.stock - orderItem.quantity)
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
              const product = state.inventory.find(p => p._id === item.productId);
              return product && product.name === 'Large Water Bottle';
            }
          );

          const smallWaterBottleItem = completedOrder.items.find(
            item => {
              const product = state.inventory.find(p => p._id === item.productId);
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
      };    // Update product in inventory
    case 'UPDATE_PRODUCT': {
      return {
        ...state,
        inventory: state.inventory.map(product =>
          product._id === action.payload._id ? action.payload : product
        )
      };
    }

    // Remove product from inventory
    case 'REMOVE_PRODUCT': {
      return {
        ...state,
        inventory: state.inventory.filter(product => product._id !== action.payload)
      };
    }

    // Add staff member
    case 'ADD_STAFF': {
      return {
        ...state,
        staffMembers: [...state.staffMembers, action.payload]
      };
    }

    // Update staff member
    case 'UPDATE_STAFF': {
      return {
        ...state,
        staffMembers: state.staffMembers.map(staff =>
          staff.id === action.payload.id ? action.payload : staff
        )
      };
    }

    // Delete staff member
    case 'DELETE_STAFF': {
      return {
        ...state,
        staffMembers: state.staffMembers.filter(staff => staff.id !== action.payload)
      };
    }

    // Set staff list
    case 'SET_STAFF_LIST': {
      return {
        ...state,
        staffMembers: action.payload
      };
    }

    // Update water bottle allowance
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
                [type]: Math.max(0, Math.min(2, newAmount)) // Ensure value is between 0 and 2
              }
            };
          }
          return staff;
        })
      };
    }

    // Reset all water bottle allowances
    case 'RESET_ALLOWANCES': {
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
    }

    // Set user
    case 'SET_USER': {
      return {
        ...state,
        user: action.payload
      };
    }

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