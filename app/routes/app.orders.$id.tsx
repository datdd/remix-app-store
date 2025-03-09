// app/routes/app.orders.$id.tsx
import { useState, useCallback, useEffect } from "react";
import { json, type ActionArgs, type LoaderArgs } from "@remix-run/node";
import { useLoaderData, Form, useActionData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { updateOrderTags } from "../models/order.server";
import {
  Page,
  Card,
  Tag,
  TextField,
  BlockStack,
  Button,
  InlineStack,
  Text,
  Banner,
} from "@shopify/polaris";

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
  const currentTags = formData.get("currentTags")?.toString().split(",").filter(Boolean) || [];

  const addsArray = adds.split(",").filter(Boolean);
  const removesArray = removes.split(",").filter(Boolean);

  let userErrors: any[] = [];

  if (removesArray.length > 0) {
    const removeResponse = await admin.graphql(`
      mutation RemoveOrderTags($id: ID!, $tags: [String!]!) {
        tagsRemove(id: $id, tags: $tags) {
          userErrors {
            field
            message
          }
        }
      }`, {
      variables: {
        id: `gid://shopify/Order/${params.id}`,
        tags: removesArray,
      },
    });
    const removeData = await removeResponse.json();
    userErrors = userErrors.concat(removeData.data?.tagsRemove?.userErrors || []);
  }

  if (addsArray.length > 0) {
    const addResponse = await admin.graphql(`
      mutation AddOrderTags($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          userErrors {
            field
            message
          }
        }
      }`, {
      variables: {
        id: `gid://shopify/Order/${params.id}`,
        tags: addsArray,
      },
    });
    const addData = await addResponse.json();
    userErrors = userErrors.concat(addData.data?.tagsAdd?.userErrors || []);
  }

  if (userErrors.length > 0) {
    return json({ errors: userErrors, adds: addsArray, removes: removesArray }, { status: 400 });
  }

  try {
    await updateOrderTags(params.id, currentTags, addsArray, removesArray);
  } catch (error) {
    console.error("Prisma sync failed:", error);
  }

  return json({ success: true, adds: addsArray, removes: removesArray });
};

export default function OrderDetails() {
  const { order } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [tags, setTags] = useState<string[]>(order.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
  const [tagsToRemove, setTagsToRemove] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTag = useCallback(() => {
    if (tagInput.trim()) {
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setTagsToAdd([...tagsToAdd, newTag]);
      }
      setTagInput("");
    }
  }, [tagInput, tags, tagsToAdd]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
    if (!tagsToRemove.includes(tagToRemove) && order.tags.includes(tagToRemove)) {
      setTagsToRemove([...tagsToRemove, tagToRemove]);
    }
  }, [tags, tagsToRemove, order.tags]);

  const handleSubmit = useCallback(() => {
    setIsSaving(true);
  }, []);

  useEffect(() => {
    if (actionData) {
      setIsSaving(false);
      if (actionData.success) {
        setTagsToAdd([]);
        setTagsToRemove([]);
      }
    }
  }, [actionData]);

  return (
    <Page
      title={`Order ${order.name}`}
      backAction={{ content: "Orders", url: "/app/orders" }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">Order Summary</Text>
            <InlineStack gap="400">
              <Text as="p" fontWeight="bold">Name:</Text>
              <Text as="p">{order.name}</Text>
            </InlineStack>
            <InlineStack gap="400">
              <Text as="p" fontWeight="bold">Total Price:</Text>
              <Text as="p">
                {order.totalPriceSet.shopMoney.amount} {order.totalPriceSet.shopMoney.currencyCode}
              </Text>
            </InlineStack>
            <InlineStack gap="400">
              <Text as="p" fontWeight="bold">Customer:</Text>
              <Text as="p">{order.customer?.displayName || "N/A"}</Text>
            </InlineStack>
            <InlineStack gap="400">
              <Text as="p" fontWeight="bold">Email:</Text>
              <Text as="p">{order.customer?.email || "N/A"}</Text>
            </InlineStack>
            <InlineStack gap="400">
              <Text as="p" fontWeight="bold">Created At:</Text>
              <Text as="p">{new Date(order.createdAt).toLocaleString()}</Text>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">Tags</Text>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {tags.map((tag) => (
                <Tag key={tag} onRemove={() => handleRemoveTag(tag)}>
                  {tag}
                </Tag>
              ))}
            </div>
            <Form method="post" onSubmit={handleSubmit}>
              <BlockStack gap="400">
                <input type="hidden" name="currentTags" value={order.tags.join(",")} />
                <input type="hidden" name="adds" value={tagsToAdd.join(",")} />
                <input type="hidden" name="removes" value={tagsToRemove.join(",")} />
                <TextField
                  label="Add Tag"
                  value={tagInput}
                  onChange={setTagInput}
                  autoComplete="off"
                  connectedRight={<Button onClick={handleAddTag}>Add</Button>}
                  helpText="Enter a tag and click Add to include it."
                />
                <Button
                  variant="primary"
                  submit
                  loading={isSaving}
                  disabled={tagsToAdd.length === 0 && tagsToRemove.length === 0}
                >
                  Save Tags
                </Button>
              </BlockStack>
            </Form>
          </BlockStack>
          {actionData?.success && (
            <Banner title="Success" tone="success">
              <p>
                Tags updated successfully.
                {actionData.adds.length > 0 && ` Added: ${actionData.adds.join(", ")}`}
                {actionData.removes.length > 0 && ` Removed: ${actionData.removes.join(", ")}`}
              </p>
            </Banner>
          )}
          {actionData?.errors && (
            <Banner title="Error" tone="critical">
              <p>{actionData.errors.map((e: any) => e.message).join(", ")}</p>
            </Banner>
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}