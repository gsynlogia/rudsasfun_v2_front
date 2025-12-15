/**
 * Default values for all data types
 * Used when backend is unavailable or data is missing
 */

// Camp defaults
export const DEFAULT_CAMP = {
  id: 0,
  name: '',
  description: '',
  period: 'lato' as const,
  created_at: null,
  updated_at: null,
};

// Camp Property defaults
export const DEFAULT_CAMP_PROPERTY = {
  id: 0,
  camp_id: 0,
  period: 'lato' as const,
  city: '',
  start_date: '',
  end_date: '',
  days_count: 0,
  max_participants: 0,
  use_default_diet: false,
  registered_count: 0,
  is_full: false,
  is_ended: false,
  created_at: null,
  updated_at: null,
};

// Diet defaults
export const DEFAULT_DIET = {
  id: 0,
  name: '',
  price: 0,
  description: '',
  icon_url: null,
  icon_svg: null,
  start_date: '',
  end_date: '',
  is_active: true,
  created_at: null,
  updated_at: null,
};

// General Diet defaults
export const DEFAULT_GENERAL_DIET = {
  id: 0,
  name: '',
  price: 0,
  description: '',
  icon_url: null,
  icon_svg: null,
  start_date: '',
  end_date: '',
  is_active: true,
  created_at: null,
  updated_at: null,
};

// Addon defaults
export const DEFAULT_ADDON = {
  id: 0,
  name: '',
  description: '',
  price: 0,
  icon_url: null,
  icon_svg: null,
  display_order: 0,
  is_active: true,
  created_at: null,
  updated_at: null,
};

// Source defaults
export const DEFAULT_SOURCE = {
  id: 0,
  name: '',
  description: '',
  is_active: true,
  is_other: false,
  created_at: null,
  updated_at: null,
};

// User defaults
export const DEFAULT_USER = {
  id: 0,
  login: '',
  email: '',
  user_type: 'client' as const,
  is_active: true,
  created_at: null,
  updated_at: null,
};

// Reservation defaults
export const DEFAULT_RESERVATION = {
  id: 0,
  user_id: 0,
  camp_id: 0,
  property_id: 0,
  status: 'draft' as const,
  total_price: 0,
  created_at: null,
  updated_at: null,
};

// Document defaults
export const DEFAULT_DOCUMENT = {
  id: 0,
  name: '',
  description: '',
  file_url: null,
  is_public: false,
  created_at: null,
  updated_at: null,
};

// Payment defaults
export const DEFAULT_PAYMENT = {
  id: 0,
  reservation_id: 0,
  amount: 0,
  status: 'pending' as const,
  payment_method: '',
  transaction_id: null,
  created_at: null,
  updated_at: null,
};

// Invoice defaults
export const DEFAULT_INVOICE = {
  id: 0,
  reservation_id: 0,
  invoice_number: '',
  amount: 0,
  status: 'draft' as const,
  file_url: null,
  created_at: null,
  updated_at: null,
};

// Transport defaults
export const DEFAULT_TRANSPORT = {
  id: 0,
  name: '',
  description: '',
  is_active: true,
  created_at: null,
  updated_at: null,
};

// Group defaults
export const DEFAULT_GROUP = {
  id: 0,
  name: '',
  description: '',
  created_at: null,
  updated_at: null,
};

// Helper function to create default object from type
export function createDefault<T extends Record<string, any>>(defaultValue: T): T {
  return { ...defaultValue };
}

// Helper function to merge defaults with partial data
export function withDefaults<T extends Record<string, any>>(
  data: Partial<T> | null | undefined,
  defaults: T,
): T {
  if (!data) {
    return { ...defaults };
  }
  return { ...defaults, ...data };
}







