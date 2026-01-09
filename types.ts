
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

export interface Project {
  id: string;
  name: string;
  lastSynced: string;
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
  
  // The logic 'validUntil' displayed to user. 
  // Should be calculated as COALESCE(adminOverride, currentPeriodEnd, originalValidUntil)
  validUntil: string | null; 
  
  licenseKey: string | null;
  billingProjectName?: string; 

  // V2 Fields
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string;
  currentPeriodEnd?: string;
  
  // Admin Overrides
  adminValidUntilOverride?: string;
  adminOverrideReason?: string;
  adminOverrideBy?: string;
  adminOverrideAt?: string;
}

export interface AuditLog {
  id: string;
  createdAt: string;
  actorUserId?: string;
  actorEmail?: string;
  action: string;
  targetUserId: string;
  details: any;
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

export interface Session {
  user: User | null;
  token: string | null;
}
