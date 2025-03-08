import { json } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  IndexTable,
  Thumbnail,
  Text,
  Icon,
  InlineStack,
} from "@shopify/polaris";

import { getOrders } from "../models/order.server";
import { AlertDiamondIcon, ImageIcon } from "@shopify/polaris-icons";

// [START loader]
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const orders = await getOrders();

  return json({
    orders,
  });
}
// [END loader]

// [START empty]
const EmptyQRCodeState = ({ onAction }) => (
  <EmptyState
    heading="Create unique QR codes for your product"
    action={{
      content: "Create QR code",
      onAction,
    }}
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  >
    <p>Allow customers to scan codes and buy products using their phones.</p>
  </EmptyState>
);
// [END empty]

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

// [START table]
const OrderTable = ({ orders }) => {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    <IndexTable
      resourceName={{
        singular: "Order",
        plural: "Orders",
      }}
      itemCount={orders.length}
      headings={[
        { title: "Order id" },
        { title: "Order number" },
        { title: "Total price" },
        { title: "Payment gateway" },
        { title: "Customer email" },
        { title: "Customer full name" },
        //   { title: "Customer address"},
        { title: "Tags" },
        { title: "Created at" },
        { title: "Actions" },
      ]}
      selectable={false}
    >
      {orders.map((order) => (
        <OrderTableRow key={order.id} order={order} />
      ))}
    </IndexTable>
  );
};
// [END table]

// [START row]
const OrderTableRow = ({ order }) => (
  <IndexTable.Row id={order.id} position={order.id}>
    <IndexTable.Cell>
      <Link to={`/app/orders/${order.orderId}`}>{truncate(order.orderId)}</Link>
    </IndexTable.Cell>
    <IndexTable.Cell>{order.orderNumber}</IndexTable.Cell>
    <IndexTable.Cell>{order.totalPrice}</IndexTable.Cell>
    <IndexTable.Cell>{order.paymentGateway}</IndexTable.Cell>
    <IndexTable.Cell>{order.customerEmail}</IndexTable.Cell>
    <IndexTable.Cell>{order.customerFullName}</IndexTable.Cell>
    {/* <IndexTable.Cell>
        {order.customerAddress}
    </IndexTable.Cell> */}
    <IndexTable.Cell>{order.tags}</IndexTable.Cell>
    <IndexTable.Cell>
      {new Date(order.createdAt).toDateString()}
    </IndexTable.Cell>
    <IndexTable.Cell>
      <Link to={`/app/orders/${order.id}`}>Edit</Link>
    </IndexTable.Cell>
  </IndexTable.Row>
);
// [END row]

export default function Index() {
  const { orders } : {orders: any[]} = useLoaderData();
  const navigate = useNavigate();

  // [START page]
  return (
    <Page
      title="Orders"
      primaryAction={{
        content: "Export CSV",
        onAction: () => navigate("/app/orders/new"),
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <OrderTable orders={orders} />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
  // [END page]
}