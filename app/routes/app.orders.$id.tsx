import { json, type LoaderArgs, type ActionArgs } from "@remix-run/node";
import { useLoaderData, Form, useActionData } from "@remix-run/react";
import { useState, useCallback, useEffect } from "react";
import { Page, Frame, Text, Card, Tag, TextField, Button, Toast } from "@shopify/polaris";
import { BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export async function loader({ request, params }: LoaderArgs) {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    query GetOrder($id: ID!) {
      order(id: $id) {
        id
        name
        tags
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          id
          displayName
          email
        }
        createdAt
      }
    }`, {
    variables: { id: `gid://shopify/Order/${params.id}` },
  });

  const { data: { order } } = await response.json();
  if (!order) throw new Response("Order not found", { status: 404 });

  return json({ order });
}

export const action = async ({ request, params }: ActionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const adds = formData.get("adds")?.toString() || "";
  const removes = formData.get("removes")?.toString() || "";

  const addsArray = adds.split(",").filter(Boolean);
  const removesArray = removes.split(",").filter(Boolean);

  const response = await admin.graphql(`
    mutation UpdateOrderTags($id: ID!, $addTags: [String!]!, $removeTags: [String!]!) {
      tagsAdd(id: $id, tags: $addTags) {
        userErrors {
          field
          message
        }
      }
      tagsRemove(id: $id, tags: $removeTags) {
        userErrors {
          field
          message
        }
      }
    }`, {
    variables: {
      id: `gid://shopify/Order/${params.id}`,
      addTags: addsArray,
      removeTags: removesArray,
    },
  });

  const data = await response.json();
  const tagsAddErrors = data.data?.tagsAdd?.userErrors || [];
  const tagsRemoveErrors = data.data?.tagsRemove?.userErrors || [];

  if (tagsAddErrors.length === 0 && tagsRemoveErrors.length === 0) {
    // Đồng bộ với Prisma (tùy chọn, có thể bỏ nếu ORDERS_UPDATED đủ)
    const currentOrder = await prisma.order.findUnique({ where: { orderId: params.id } });
    if (currentOrder) {
      const currentTags = currentOrder.tags?.split(",").filter(Boolean) || [];
      const updatedTags = [
        ...currentTags.filter((tag) => !removesArray.includes(tag)),
        ...addsArray,
      ].filter((tag, index, self) => tag && self.indexOf(tag) === index);
      await prisma.order.update({
        where: { orderId: params.id },
        data: { tags: updatedTags.length ? updatedTags.join(",") : null },
      });
    }
    return json({ data, adds: addsArray, removes: removesArray });
  }

  return json(
    { errors: [...tagsAddErrors, ...tagsRemoveErrors], adds: addsArray, removes: removesArray },
    { status: 400 }
  );
};

export default function OrderDetails() {
  const actionResponse = useActionData<typeof action>();
  const { order } = useLoaderData<typeof loader>();
  const [tags, setTags] = useState(order.tags);

  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
  const [tagsToRemove, setTagsToRemove] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const newTag = tagInput.trim();
      setTags([...tags, newTag]);
      setTagsToAdd([...tagsToAdd, newTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (index: number) => {
    const updatedTags = [...tags];
    const removedTag = updatedTags.splice(index, 1)[0];
    setTags(updatedTags);
    setTagsToRemove([...tagsToRemove, removedTag]);
  };

  return (
    <Frame>
      <Page title={`Order ${order.name}`}>
        <BlockStack gap="500">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Order Details</Text>
              <Text as="p">Name: {order.name}</Text>
              <Text as="p">
                Total Price: {order.totalPriceSet.shopMoney.amount} {order.totalPriceSet.shopMoney.currencyCode}
              </Text>
              <Text as="p">Customer: {order.customer?.displayName || "N/A"}</Text>
              <Text as="p">Email: {order.customer?.email || "N/A"}</Text>
              <Text as="p">Created At: {new Date(order.createdAt).toLocaleString()}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Tags</Text>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {tags.map((tag, index) => (
                  <Tag key={index} onRemove={() => handleRemoveTag(index)}>
                    {tag}
                  </Tag>
                ))}
              </div>
              <Form method="post">
                <BlockStack gap="400">
                  <input type="hidden" name="adds" value={tagsToAdd.join(",")} />
                  <input type="hidden" name="removes" value={tagsToRemove.join(",")} />
                  <TextField
                    label="Add New Tag"
                    value={tagInput}
                    onChange={setTagInput}
                    autoComplete="off"
                    connectedRight={<Button onClick={handleAddTag}>Add</Button>}
                  />
                  <Button
                    variant="primary"
                    submit
                    disabled={tagsToAdd.length === 0 && tagsToRemove.length === 0}
                  >
                    Save Tags
                  </Button>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </BlockStack>
      </Page>
    </Frame>
  );
}