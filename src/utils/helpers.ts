// Helper functions for the POS system

/**
 * Format currency values
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Format date to readable string
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Check if water bottle allowance should reset
 */
export const shouldResetAllowance = (): boolean => {
  const today = new Date();
  return today.getDate() === 1; // Reset on the 1st of each month
};

/**
 * Get week dates (Friday to Thursday)
 */
export const getWeekDates = (): { start: Date; end: Date } => {
  const today = new Date();
  const day = today.getDay(); // 0 is Sunday, 6 is Saturday
  
  // Calculate days until previous Friday (5 is Friday)
  const daysToFriday = day >= 5 ? day - 5 : day + 2;
  
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysToFriday);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return { start: startDate, end: endDate };
};

/**
 * Get month dates (1st to last day)
 */
export const getMonthDates = (): { start: Date; end: Date } => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  
  return { start: startDate, end: endDate };
};