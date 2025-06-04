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
export const formatDate = (date: Date | string): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
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

/**
 * Group date data by weeks
 * Groups an array of daily data into weekly buckets (4 weeks)
 */
export const groupDataByWeeks = (
  dailyData: Array<{ label: string; value: number }>,
  startDate: Date
): Array<{ label: string; value: number }> => {
  if (!dailyData || dailyData.length === 0) return [];

  // Create 4 week buckets
  const weeklyData = Array(4).fill(null).map(() => ({ value: 0 }));

  // Calculate which week each data point belongs to
  dailyData.forEach(dataPoint => {
    // Convert MM-DD label to a date object
    const dateParts = dataPoint.label.split('-');
    if (dateParts.length !== 2) return;

    const month = parseInt(dateParts[0]) - 1; // JS months are 0-indexed
    const day = parseInt(dateParts[1]);

    const date = new Date(startDate.getFullYear(), month, day);

    // Calculate days since start of month
    const dayDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Determine which week bucket (0-3) this belongs to
    const weekIndex = Math.min(3, Math.floor(dayDiff / 7));

    // Add the value to the appropriate week bucket
    if (weekIndex >= 0 && weekIndex < 4) {
      weeklyData[weekIndex].value += dataPoint.value;
    }
  });

  // Create labels for each week
  return weeklyData.map((data, index) => {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (index * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const formatShortDate = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
    const label = `${formatShortDate(weekStart)}-${formatShortDate(weekEnd)}`;

    return {
      label,
      value: data.value
    };
  });
};