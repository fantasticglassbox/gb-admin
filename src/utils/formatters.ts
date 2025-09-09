// Number formatting utilities for charts and displays

/**
 * Format large numbers with K, M, B suffixes
 * @param value - The number to format
 * @param currency - Optional currency symbol (default: 'Rp')
 * @returns Formatted string like "1.2M", "500K", "1.5B"
 */
export const formatCompactNumber = (value: number, currency: string = 'Rp'): string => {
  if (value === 0) return `${currency}0`;
  
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (abs >= 1000000000) {
    // Billions
    return `${sign}${currency}${(abs / 1000000000).toFixed(1)}B`;
  } else if (abs >= 1000000) {
    // Millions
    return `${sign}${currency}${(abs / 1000000).toFixed(1)}M`;
  } else if (abs >= 1000) {
    // Thousands
    return `${sign}${currency}${(abs / 1000).toFixed(1)}K`;
  } else {
    // Less than 1000
    return `${sign}${currency}${abs.toFixed(0)}`;
  }
};

/**
 * Format month number to 3-character abbreviation
 * @param month - Month number (1-12)
 * @returns 3-character month abbreviation like "Jan", "Feb", etc.
 */
export const formatMonthShort = (month: number): string => {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  if (month < 1 || month > 12) {
    return 'Invalid';
  }
  
  return monthNames[month - 1];
};

/**
 * Format month value (number or string) to 3-character abbreviation
 * Handles both month numbers (1-12) and full month names ("January", "February")
 * @param month - Month number (1-12) or full month name string
 * @returns 3-character month abbreviation like "Jan", "Feb", etc.
 */
export const formatMonthDisplay = (month: number | string): string => {
  if (typeof month === 'number') {
    return formatMonthShort(month);
  }
  
  if (typeof month === 'string') {
    // Handle full month names like "January", "February"
    const fullMonthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = fullMonthNames.findIndex(name => 
      name.toLowerCase() === month.toLowerCase()
    );
    if (monthIndex !== -1) {
      return formatMonthShort(monthIndex + 1);
    }
    
    // Handle already short month names like "Jan", "Feb"
    const shortMonthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    if (shortMonthNames.includes(month)) {
      return month;
    }
  }
  
  return month?.toString() || 'Invalid';
};

/**
 * Format date string to short month-day format
 * @param dateString - Date string in format "YYYY-MM-DD" or Date object
 * @returns Formatted string like "Jan 15", "Feb 28"
 */
export const formatDateShort = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  const month = formatMonthShort(date.getMonth() + 1);
  const day = date.getDate();
  
  return `${month} ${day}`;
};

/**
 * Format year-month to short format
 * @param year - Year number
 * @param month - Month number (1-12)
 * @returns Formatted string like "Jan '24", "Dec '23"
 */
export const formatYearMonthShort = (year: number, month: number): string => {
  const monthShort = formatMonthShort(month);
  const yearShort = year.toString().slice(-2);
  return `${monthShort} '${yearShort}`;
};

/**
 * Enhanced currency formatter for tooltips and detailed views
 * @param value - The number to format
 * @param currency - Currency code (default: 'IDR')
 * @returns Formatted currency string with full precision
 */
export const formatCurrencyDetailed = (value: number, currency: string = 'IDR'): string => {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format percentage with appropriate precision
 * @param value - Percentage value (0-100)
 * @param precision - Decimal places (default: 1)
 * @returns Formatted percentage string like "15.5%"
 */
export const formatPercentage = (value: number, precision: number = 1): string => {
  return `${value.toFixed(precision)}%`;
};

/**
 * Get appropriate tick values for Y-axis based on data range
 * @param maxValue - Maximum value in the dataset
 * @param tickCount - Desired number of ticks (default: 5)
 * @returns Array of tick values
 */
export const getYAxisTicks = (maxValue: number, tickCount: number = 5): number[] => {
  if (maxValue === 0) return [0];
  
  const step = Math.ceil(maxValue / tickCount);
  const ticks = [];
  
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(i * step);
  }
  
  return ticks;
};

/**
 * Smart number formatter for different contexts
 * @param value - Number to format
 * @param context - Context: 'axis' (compact), 'tooltip' (detailed), 'card' (compact with symbol)
 * @param currency - Currency symbol
 * @returns Formatted string
 */
export const formatSmartNumber = (
  value: number, 
  context: 'axis' | 'tooltip' | 'card' = 'axis',
  currency: string = 'Rp'
): string => {
  switch (context) {
    case 'tooltip':
      return formatCurrencyDetailed(value, currency === 'Rp' ? 'IDR' : 'USD');
    case 'card':
      return formatCompactNumber(value, currency);
    case 'axis':
    default:
      return formatCompactNumber(value, '');
  }
};
