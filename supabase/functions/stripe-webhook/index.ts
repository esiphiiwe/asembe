import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const PRICE_TIER_MAP: Record<string, 'standard' | 'premium' | 'founding'> = {
  price_standard_monthly: 'standard',
  price_premium_monthly: 'premium',
  price_founding_yearly: 'founding',
};

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return new Response(message, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId || !session.subscription) break;

      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;

      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = stripeSubscription.items.data[0]?.price.id ?? '';
      const tier = PRICE_TIER_MAP[priceId] ?? 'standard';
      const periodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString();
      const periodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();

      await supabase
        .from('subscriptions')
        .update({
          tier,
          status: 'active',
          stripe_subscription_id: subscriptionId,
          period_start: periodStart,
          period_end: periodEnd,
        })
        .eq('user_id', userId);

      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;

      const priceId = sub.items.data[0]?.price.id ?? '';
      const tier = PRICE_TIER_MAP[priceId] ?? 'standard';
      const status = sub.status === 'active'
        ? 'active'
        : sub.status === 'past_due'
        ? 'past_due'
        : 'cancelled';

      await supabase
        .from('subscriptions')
        .update({
          tier,
          status,
          stripe_subscription_id: sub.id,
          period_start: new Date(sub.current_period_start * 1000).toISOString(),
          period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
        .eq('user_id', userId);

      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) break;

      await supabase
        .from('subscriptions')
        .update({
          tier: 'free',
          status: 'active',
          stripe_subscription_id: null,
          period_start: null,
          period_end: null,
        })
        .eq('user_id', userId);

      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;
      if (!subscriptionId) break;

      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = stripeSubscription.metadata?.supabase_user_id;
      if (!userId) break;

      await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('user_id', userId);

      break;
    }

    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
