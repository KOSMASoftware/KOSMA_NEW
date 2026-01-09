
import { PlanTier } from '../types';

/**
 * STRIPE CONFIGURATION
 * 
 * Source of Truth for Payment Links.
 * Supports switching between Test and Live modes via VITE_STRIPE_MODE env var.
 */

// Define structure for links using the Enum keys
type StripeLinks = {
  [key in PlanTier]?: {
    monthly: string;
    yearly: string;
  }
};

const TEST_LINKS: StripeLinks = {
  [PlanTier.BUDGET]: {
    monthly: 'https://buy.stripe.com/test_6oU5kD690gMt18Bgaw93y05', 
    yearly: 'https://buy.stripe.com/test_dRmaEX9lceElg3v7E093y04'
  },
  [PlanTier.COST_CONTROL]: {
    monthly: 'https://buy.stripe.com/test_9B600jbtkgMt9F7gaw93y03',
    yearly: 'https://buy.stripe.com/test_6oU5kD40SgMt3gJ2jG93y02'
  },
  [PlanTier.PRODUCTION]: {
    monthly: 'https://buy.stripe.com/test_5kQ8wPfJA67PeZr8I493y01',
    yearly:  'https://buy.stripe.com/test_00waEX7d42VD6sVf6s93y00'
  },
  [PlanTier.FREE]: undefined // No link for free
};

const LIVE_LINKS: StripeLinks = {
  // TODO: Replace with real live links before switching VITE_STRIPE_MODE to 'live'
  [PlanTier.BUDGET]: {
    monthly: 'https://buy.stripe.com/live_...', 
    yearly: 'https://buy.stripe.com/live_...'
  },
  [PlanTier.COST_CONTROL]: {
    monthly: 'https://buy.stripe.com/live_...',
    yearly: 'https://buy.stripe.com/live_...'
  },
  [PlanTier.PRODUCTION]: {
    monthly: 'https://buy.stripe.com/live_...',
    yearly:  'https://buy.stripe.com/live_...'
  },
  [PlanTier.FREE]: undefined
};

// Determine mode from Env or default to 'test'
const env = (import.meta as any).env || {};
const MODE = (env.VITE_STRIPE_MODE as string) || 'test';

export const STRIPE_LINKS = MODE === 'live' ? LIVE_LINKS : TEST_LINKS;

export const STRIPE_CONFIG = {
  isLive: MODE === 'live',
  links: STRIPE_LINKS
};
