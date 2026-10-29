const Stripe = require('stripe');

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw Object.assign(new Error('Stripe n’est pas configuré sur le serveur.'), { status: 503 });
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getReturnUrl() {
  const value = String(process.env.ONLINE_PAYMENT_RETURN_URL || '').trim();
  if (!/^https:\/\//i.test(value)) {
    throw Object.assign(new Error('Une URL HTTPS de retour vers GoOn est requise.'), { status: 503 });
  }
  return value;
}

async function ensureStripeCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripeClient().customers.create({
    name: user.name || undefined,
    email: user.email || undefined,
    metadata: { goonUserId: String(user._id), firebaseUid: user.firebaseUid },
  }, { idempotencyKey: `goon_user_customer_${user._id}` });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

async function createCardSetupUrl(user, consentVersion) {
  const customerId = await ensureStripeCustomer(user);
  const returnUrl = new URL(getReturnUrl());
  returnUrl.searchParams.set('cardSetup', 'success');
  const cancelUrl = new URL(getReturnUrl());
  cancelUrl.searchParams.set('cardSetup', 'cancelled');
  const session = await stripeClient().checkout.sessions.create({
    mode: 'setup',
    currency: 'usd',
    customer: customerId,
    setup_intent_data: {
      metadata: { goonUserId: String(user._id), consentVersion },
    },
    success_url: returnUrl.toString(),
    cancel_url: cancelUrl.toString(),
  }, { idempotencyKey: `goon_card_setup_${user._id}_${Date.now()}` });
  if (!session.url) throw new Error('Stripe n’a pas retourné de lien sécurisé.');
  return { url: session.url };
}

async function listUserCards(user) {
  if (!user.stripeCustomerId) return [];
  const stripe = stripeClient();
  const [methods, customer] = await Promise.all([
    stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: 'card', limit: 20 }),
    stripe.customers.retrieve(user.stripeCustomerId),
  ]);
  const defaultId = customer.deleted ? '' : customer.invoice_settings?.default_payment_method;
  return methods.data.map((method) => ({
    id: method.id,
    brand: method.card?.brand || 'card',
    last4: method.card?.last4 || '',
    expMonth: method.card?.exp_month || null,
    expYear: method.card?.exp_year || null,
    isDefault: method.id === defaultId,
  }));
}

async function setDefaultUserCard(user, paymentMethodId) {
  if (!user.stripeCustomerId) throw Object.assign(new Error('Aucune carte enregistrée.'), { status: 404 });
  const stripe = stripeClient();
  const method = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (method.customer !== user.stripeCustomerId || method.type !== 'card') {
    throw Object.assign(new Error('Cette carte n’appartient pas à votre compte.'), { status: 404 });
  }
  await stripe.customers.update(user.stripeCustomerId, {
    invoice_settings: { default_payment_method: method.id },
  });
}

async function removeUserCard(user, paymentMethodId) {
  if (!user.stripeCustomerId) throw Object.assign(new Error('Aucune carte enregistrée.'), { status: 404 });
  const stripe = stripeClient();
  const method = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (method.customer !== user.stripeCustomerId || method.type !== 'card') {
    throw Object.assign(new Error('Cette carte n’appartient pas à votre compte.'), { status: 404 });
  }
  const customer = await stripe.customers.retrieve(user.stripeCustomerId);
  if (!customer.deleted && customer.invoice_settings?.default_payment_method === method.id) {
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: '' },
    });
  }
  await stripe.paymentMethods.detach(method.id);
  const remainingMethods = await stripe.paymentMethods.list({
    customer: user.stripeCustomerId,
    type: 'card',
    limit: 1,
  });
  if (!remainingMethods.data.length) {
    await stripe.customers.del(user.stripeCustomerId);
    user.stripeCustomerId = '';
    user.stripeCardConsentAt = null;
    user.stripeCardConsentVersion = '';
    await user.save();
  }
}

module.exports = {
  createCardSetupUrl,
  listUserCards,
  removeUserCard,
  setDefaultUserCard,
};
