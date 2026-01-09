
export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  NONE = 'none',
  TRIAL = 'trial'
}

export enum PlanTier {
  FREE = 'Free',
  BUDGET = 'Budget',
  COST_CONTROL = 'Cost Control',
  PRODUCTION = 'Production'
}

export interface BillingAddress {
  companyName?: string;
  vatId?: string;
  street: string;
  city: string;
  zip: string;
  country: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  registeredAt: string;
  stripeCustomerId?: string;
  billingAddress?: BillingAddress;
}

export interface License {
  id: string;
  userId: string;
  productName: string; 
  planTier: PlanTier;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  billingCycle: 'monthly' | 'yearly' | 'none' | 'trial';
  status: SubscriptionStatus;
  validUntil: string | null; 
  licenseKey: string | null;
  billingProjectName?: string; 
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string;
  currentPeriodEnd?: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open';
  pdfUrl: string;
  projectName?: string;
}