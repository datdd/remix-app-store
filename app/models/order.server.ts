import { PrismaClient } from "@prisma/client";
import { log } from "../utils/logger.server";

const prisma = new PrismaClient();

export async function upsertOrder(orderData: {
  orderId: string; 
  orderNumber: string;
  totalPrice: string;
  paymentGateway: string | null;
  customerEmail: string | null;
  customerFullName: string | null;
  customerAddress: string | null;
  tags: string | null;
  createdAt: Date;
}) {
  try {
    const result = await prisma.order.upsert({
      where: { orderId: orderData.orderId },
      update: { ...orderData },
      create: { ...orderData },
    });
    log.info("Order upserted successfully", { orderId: result.orderId });
    return result;
  } catch (error) {
    log.error("Failed to upsert order", { error: error.message, orderId: orderData.orderId });
    throw new Error("Failed to upsert order");
  }
}

export async function getOrders() {
  try {
    const orders = await prisma.order.findMany();
    log.info("Orders retrieved successfully");
    return orders;
  } catch (error) {
    log.error("Failed to retrieve orders", { error: error.message });
    throw new Error("Failed to retrieve orders");
  }
}

export async function updateTags(orderId: number, tags: string | null) {
  try {
    const result = await prisma.order.update({
      where: { id: orderId },
      data: { tags },
    });
    log.info("Tags updated successfully", { orderId });
    return result;
  } catch (error) {
    log.error("Failed to update tags", { error: error.message, orderId });
    throw new Error("Failed to update tags");
  }
}