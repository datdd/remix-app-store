import { authenticate } from "../shopify.server";
import { handleAppUninstalled } from "../webhooks/app-uninstalled.server";
import { handleOrdersCreate } from "../webhooks/orders-create.server";
import { handleOrdersUpdate } from "../webhooks/orders-update.server";
import { handleOrdersCancelled } from "../webhooks/orders-cancelled.server";
import { log } from "../utils/logger.server";

import type { ActionFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  log.info("Webhook received", { topic, shop });

  switch (topic) {
    case "APP_UNINSTALLED":
      return handleAppUninstalled({ shop, session });
    case "ORDERS_CREATE":
      return handleOrdersCreate({ payload, shop, session });
    case "ORDERS_UPDATED":
      return handleOrdersUpdate({ payload, shop, session });
    case "ORDERS_CANCELLED":
      return handleOrdersCancelled({ payload, shop, session });
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      log.warn("Unhandled webhook topic", { topic });
      throw new Response(`Unhandled webhook topic: ${topic}`, { status: 404 });
  }
};