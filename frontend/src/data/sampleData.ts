import { ProductItem, StaffMember, Transaction, Expense } from '../types';
import { generateId } from '../utils/helpers';

// Sample product data
export const sampleProducts: ProductItem[] = [
  {
    id: generateId(),
    name: 'Large Water Bottle',
    regularPrice: 3.99,
    staffPrice: 2.99,
    purchaseCost: 1.50,
    quantity: 50,
    reorderThreshold: 10,
    category: 'Drinks'
  },
  {
    id: generateId(),
    name: 'Small Water Bottle',
    regularPrice: 2.49,
    staffPrice: 1.99,
    purchaseCost: 0.89,
    quantity: 75,
    reorderThreshold: 15,
    category: 'Drinks'
  },
  {
    id: generateId(),
    name: 'Coffee (Regular)',
    regularPrice: 3.49,
    staffPrice: 2.79,
    purchaseCost: 1.20,
    quantity: 100,
    reorderThreshold: 20,
    category: 'Drinks'
  },
  {
    id: generateId(),
    name: 'Sandwich',
    regularPrice: 6.99,
    staffPrice: 5.99,
    purchaseCost: 3.50,
    quantity: 25,
    reorderThreshold: 5,
    category: 'Food'
  },
  {
    id: generateId(),
    name: 'Salad',
    regularPrice: 8.99,
    staffPrice: 7.49,
    purchaseCost: 4.25,
    quantity: 15,
    reorderThreshold: 3,
    category: 'Food'
  },
  {
    id: generateId(),
    name: 'Muffin',
    regularPrice: 3.49,
    staffPrice: 2.99,
    purchaseCost: 1.25,
    quantity: 30,
    reorderThreshold: 8,
    category: 'Food'
  },
  {
    id: generateId(),
    name: 'Protein Bar',
    regularPrice: 2.99,
    staffPrice: 2.49,
    purchaseCost: 1.40,
    quantity: 45,
    reorderThreshold: 10,
    category: 'Snacks'
  },
  {
    id: generateId(),
    name: 'Chips',
    regularPrice: 1.99,
    staffPrice: 1.49,
    purchaseCost: 0.80,
    quantity: 60,
    reorderThreshold: 15,
    category: 'Snacks'
  }
];

// Sample staff members
export const sampleStaffMembers: StaffMember[] = [
  {
    id: generateId(),
    name: 'John Doe',
    waterBottleAllowance: {
      large: 2,
      small: 2
    }
  },
  {
    id: generateId(),
    name: 'Jane Smith',
    waterBottleAllowance: {
      large: 2,
      small: 2
    }
  },
  {
    id: generateId(),
    name: 'Mike Johnson',
    waterBottleAllowance: {
      large: 2,
      small: 2
    }
  }
];

// Sample transactions for the past month
export const generateSampleTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const now = new Date();
  
  // Generate 50 sample transactions spread over the last 30 days
  for (let i = 0; i < 50; i++) {
    const date = new Date();
    date.setDate(now.getDate() - Math.floor(Math.random() * 30));
    date.setHours(Math.floor(Math.random() * 12) + 8); // Between 8am and 8pm
    
    transactions.push({
      id: generateId(),
      orderId: generateId(),
      total: parseFloat((Math.random() * 50 + 5).toFixed(2)),
      paymentMethod: Math.random() > 0.5 ? 'InstaPay' : 'Cash',
      timestamp: date,
      staffDiscount: Math.random() > 0.7,
      staffName: Math.random() > 0.7 ? sampleStaffMembers[Math.floor(Math.random() * sampleStaffMembers.length)].name : undefined
    });
  }
  
  return transactions;
};

// Sample expenses
export const generateSampleExpenses = (): Expense[] => {
  const expenses: Expense[] = [];
  const categories = ['Inventory', 'Utilities', 'Maintenance', 'Marketing', 'Miscellaneous'];
  const now = new Date();
  
  // Generate 20 sample expenses spread over the last 30 days
  for (let i = 0; i < 20; i++) {
    const date = new Date();
    date.setDate(now.getDate() - Math.floor(Math.random() * 30));
    
    expenses.push({
      id: generateId(),
      description: `Expense ${i + 1}`,
      amount: parseFloat((Math.random() * 200 + 20).toFixed(2)),
      date: date,
      category: categories[Math.floor(Math.random() * categories.length)]
    });
  }
  
  return expenses;
};