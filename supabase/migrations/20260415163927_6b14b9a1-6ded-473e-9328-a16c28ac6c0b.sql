
-- Fix email mismatch: user vasamsetty993@gmail.com paid via deekshitha4793@gmail.com (Stripe cus_UlyKDymudeLceB)
UPDATE profiles 
SET is_premium = true, updated_at = now() 
WHERE user_id = 'c30f7c46-9b4b-4828-9824-f80121574998';

UPDATE user_subscriptions 
SET is_subscribed = true, 
    stripe_customer_id = 'cus_UlyKDymudeLceB', 
    next_renewal_date = '2026-05-09T00:00:00Z',
    updated_at = now()
WHERE user_id = 'c30f7c46-9b4b-4828-9824-f80121574998';
