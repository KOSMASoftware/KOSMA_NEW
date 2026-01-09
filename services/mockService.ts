
import { User, UserRole, License, SubscriptionStatus, Invoice, PlanTier } from '../types';

export const USERS: User[] = [
  { id: 'u1', email: 'customer@demo.com', name: 'Hans Müller', role: UserRole.CUSTOMER, registeredAt: '2023-01-15', stripeCustomerId: 'cus_123' },
  { id: 'u2', email: 'admin@demo.com', name: 'System Admin', role: UserRole.ADMIN, registeredAt: '2023-01-01' },
];

export const LICENSES: License[] = [
  { 
    id: 'l1', 
    userId: 'u1', 
    productName: 'KOSMA',
    planTier: PlanTier.BUDGET,
    billingCycle: 'yearly',
    validUntil: '2024-01-15', 
    licenseKey: 'KOS-BUD-1029', 
    status: SubscriptionStatus.ACTIVE,
    stripeSubscriptionId: 'sub_xyz123',
    billingProjectName: 'Demo Project'
  }
];