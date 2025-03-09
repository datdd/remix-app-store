import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  Layout,
  Page,
  IndexTable,
} from "@shopify/polaris";

import { getOrders } from "../models/order.server";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const orders = await getOrders();

  return json({
    orders,
  });
}

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

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
    <IndexTable.Cell>{order.tags}</IndexTable.Cell>
    <IndexTable.Cell>
      {new Date(order.createdAt).toDateString()}
    </IndexTable.Cell>
    <IndexTable.Cell>
      <Link to={`/app/orders/${order.orderId}`}>Edit</Link>
    </IndexTable.Cell>
  </IndexTable.Row>
);

const generateCSVContent = (orders: any[]) => {
  const header = "orderId,orderNumber,totalPrice,tags,createdAt";
  const rows = orders.map(order => 
    `${order.orderId},${order.orderNumber},${order.totalPrice},"${order.tags || ""}",${order.createdAt.toString()}`
  );
  return [header, ...rows].join("\n");
};

const exportCSV = (orders: any[]) => {
  const blob = new Blob([generateCSVContent(orders)], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_${new Date().toString()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export default function Index() {
  const { orders } : {orders: any[]} = useLoaderData();

  const handleExport = () => {
    if (orders.length === 0) {
      alert("No orders to export");
      return;
    }
    exportCSV(orders);
  };

  return (
    <Page
      title="Orders"
      primaryAction={{
        content: "Export CSV",
        onAction: () => handleExport(),
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
}