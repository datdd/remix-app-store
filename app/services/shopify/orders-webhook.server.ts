import { log } from "../../utils/logger.server";

interface OrderWebhookPayload {
  id: number;
  order_number: string;
  total_price: string;
  payment_gateway_names: string[];
  customer?: { email: string; first_name?: string; last_name?: string };
  shipping_address?: Record<string, any>;
  tags?: string;
  created_at: string;
  updated_at?: string;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
}

function processBaseOrderPayload(payload: OrderWebhookPayload) {
  return {
    orderId: payload.id.toString(),
    orderNumber: payload.order_number.toString(),
    totalPrice: payload.total_price,
    paymentGateway: payload.payment_gateway_names[0] || null,
    customerEmail: payload.customer?.email || null,
    customerFullName: `${payload.customer?.first_name || ""} ${payload.customer?.last_name || ""}`.trim() || null,
    customerAddress: payload.shipping_address ? JSON.stringify(payload.shipping_address) : null,
    tags: payload.tags || null,
    createdAt: new Date(payload.created_at),
  };
}

export function processOrderWebhook(payload: OrderWebhookPayload) {
  return processBaseOrderPayload(payload);
}

export function processOrderUpdateWebhook(payload: OrderWebhookPayload) {
  return processBaseOrderPayload(payload);
}

export function processOrderCancelledWebhook(payload: OrderWebhookPayload) {
  return processBaseOrderPayload(payload);
}