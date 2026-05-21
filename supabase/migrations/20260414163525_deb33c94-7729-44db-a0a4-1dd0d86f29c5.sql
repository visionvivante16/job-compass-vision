-- Link Vakshika's Stripe customer to her active account and grant premium
UPDATE public.profiles 
SET is_premium = true 
WHERE user_id = '0b8946f9-01b2-444f-8606-75e3825cdb48';

UPDATE public.user_subscriptions 
SET is_subscribed = true, 
    stripe_customer_id = 'cus_UJl5Rre889Uwzb',
    updated_at = now()
WHERE user_id = '0b8946f9-01b2-444f-8606-75e3825cdb48';
