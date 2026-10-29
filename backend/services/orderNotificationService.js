const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendExpoPushNotificationToUser } = require('../utils/expoPush');
const { extractAllPushTokens } = require('../utils/pushTokenSelection');
const { getUserNotificationLanguage } = require('../utils/notificationLocalization');

const COPY = {
  fr: {
    confirmed: (ctx) => ({ title: 'Commande accept\u00e9e', message: `${ctx.company} a accept\u00e9 ta commande ${ctx.orderNumber}. Ta facture est disponible dans Mes commandes.` }),
    ready: (ctx) => ({
      title: 'Commande pr\u00eate !',
      message: ctx.takeaway
        ? `Ta commande ${ctx.orderNumber} est pr\u00eate \u00e0 \u00eatre r\u00e9cup\u00e9r\u00e9e chez ${ctx.company}.`
        : `Ta commande ${ctx.orderNumber} est pr\u00eate chez ${ctx.company}.`,
    }),
    fulfilled: (ctx) => ({ title: 'Commande servie', message: `Bon app\u00e9tit ! Ta commande ${ctx.orderNumber} a \u00e9t\u00e9 servie.` }),
    cancelled: (ctx) => ({ title: 'Commande annul\u00e9e', message: `${ctx.company} a annul\u00e9 ta commande ${ctx.orderNumber}.` }),
  },
  en: {
    confirmed: (ctx) => ({ title: 'Order accepted', message: `${ctx.company} accepted your order ${ctx.orderNumber}. Your invoice is available in My orders.` }),
    ready: (ctx) => ({
      title: 'Your order is ready!',
      message: ctx.takeaway
        ? `Order ${ctx.orderNumber} is ready for pickup at ${ctx.company}.`
        : `Order ${ctx.orderNumber} is ready at ${ctx.company}.`,
    }),
    fulfilled: (ctx) => ({ title: 'Order served', message: `Enjoy your meal! Order ${ctx.orderNumber} has been served.` }),
    cancelled: (ctx) => ({ title: 'Order cancelled', message: `${ctx.company} cancelled your order ${ctx.orderNumber}.` }),
  },
};

const RETAIL_COPY = {
  fr: {
    confirmed: (ctx) => ({ title: 'Commande acceptee', message: `${ctx.company} a accepte ta commande ${ctx.orderNumber}.` }),
    ready: (ctx) => ({
      title: ctx.delivery ? 'Commande en livraison' : 'Commande prete au retrait',
      message: ctx.delivery
        ? `Ta commande ${ctx.orderNumber} est en cours de livraison par ${ctx.company}.`
        : `Ta commande ${ctx.orderNumber} est prete a etre recuperee chez ${ctx.company}.`,
    }),
    fulfilled: (ctx) => ({ title: 'Commande remise', message: `Ta commande ${ctx.orderNumber} a ete remise par ${ctx.company}.` }),
    cancelled: (ctx) => ({ title: 'Commande annulee', message: `${ctx.company} a annule ta commande ${ctx.orderNumber}.` }),
  },
  en: {
    confirmed: (ctx) => ({ title: 'Order accepted', message: `${ctx.company} accepted your order ${ctx.orderNumber}.` }),
    ready: (ctx) => ({
      title: ctx.delivery ? 'Order out for delivery' : 'Order ready for pickup',
      message: ctx.delivery
        ? `Order ${ctx.orderNumber} is out for delivery from ${ctx.company}.`
        : `Order ${ctx.orderNumber} is ready for pickup at ${ctx.company}.`,
    }),
    fulfilled: (ctx) => ({ title: 'Order handed over', message: `${ctx.company} completed order ${ctx.orderNumber}.` }),
    cancelled: (ctx) => ({ title: 'Order cancelled', message: `${ctx.company} cancelled your order ${ctx.orderNumber}.` }),
  },
};

function buildOrderStatusCopy(language, status, context) {
  const packs = context?.retail ? RETAIL_COPY : COPY;
  const pack = packs[language] || packs.en;
  const builder = pack[status];
  return builder ? builder(context) : null;
}

async function notifyOrderStatusChange({ order, companyName, actorId }) {
  if (!order?.createdBy || !['restaurant_app', 'retail_app'].includes(order.channel) || !actorId) return null;
  try {
    const receiver = await User.findById(order.createdBy);
    if (!receiver) return null;
    const copy = buildOrderStatusCopy(getUserNotificationLanguage(receiver), order.status, {
      company: companyName || 'GoOn',
      orderNumber: order.orderNumber,
      takeaway: order.fulfillmentType === 'takeaway',
      retail: order.channel === 'retail_app',
      delivery: order.fulfillmentType === 'delivery',
    });
    if (!copy) return null;

    const notification = await Notification.create({
      companyId: order.companyId,
      senderId: actorId,
      receiverId: receiver._id,
      title: copy.title,
      message: copy.message,
      type: 'order',
      status: order.status,
      read: false,
    });

    await sendExpoPushNotificationToUser(receiver, {
      title: copy.title,
      body: copy.message,
      data: {
        type: 'order',
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        companyId: String(order.companyId),
        status: order.status,
        notificationId: String(notification._id),
      },
    }, { tokens: extractAllPushTokens(receiver) });
    return notification;
  } catch (error) {
    console.warn('Order notification failed:', error?.message || error);
    return null;
  }
}

module.exports = { buildOrderStatusCopy, notifyOrderStatusChange };
