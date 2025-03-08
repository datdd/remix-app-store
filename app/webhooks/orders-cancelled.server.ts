import { upsertOrder } from "../models/order.server";
import { processOrderCancelledWebhook } from "../services/shopify/orders-webhook.server";
import { log } from "../utils/logger.server";

export async function handleOrdersCancelled({ payload, shop, session }) {
  log.debug("Handling ORDERS_CANCELLED", { shop, payload, sessionId: session?.id });

  let response;
  if (!payload || !shop) {
    log.error("Invalid payload or shop information", { payload, shop });
    response = new Response("Bad Request", { status: 400 });
  } else {
    try {
      const orderData = processOrderCancelledWebhook(payload);
      if (!orderData) {
        log.error("Failed to process order data from webhook", { payload });
        response = new Response("Unprocessable Entity", { status: 422 });
      } else {
        await upsertOrder(orderData);
        log.info("Order cancelled", { shopifyOrderId: orderData.orderId });
        response = new Response(null, { status: 200 });
      }
    } catch (error) {
      log.error("Failed to process ORDERS_CANCELLED", { error: error.message, shop });
      response = new Response("Internal Server Error", { status: 500 });
    }
  }

  return response;
}