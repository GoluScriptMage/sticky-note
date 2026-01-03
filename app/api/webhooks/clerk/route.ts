import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  console.log("🔔 Webhook received!");

  // 1. Get the webhook secret from env
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  //Check the webhook secret
  if (!WEBHOOK_SECRET) {
    console.error("❌ CLERK_WEBHOOK_SECRET is not defined");
    throw new Error("CLERK_WEBHOOK_SECRET is not defined");
  }

  console.log("✅ Webhook secret found");

  // Get the svix headers
  const headersPayload = await headers();
  const svixId = headersPayload.get("svix-id");
  const svixTimestamp = headersPayload.get("svix-timestamp");
  const svixSignature = headersPayload.get("svix-signature");

  // Throw a error if any header is Missing
  if (!svixId || !svixSignature || !svixTimestamp) {
    console.error("❌ Missing svix headers");
    return new Response("Missing svix headers", { status: 400 });
  }

  console.log("✅ Svix headers found");

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify the webhooks
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  // Try to verify the webhook we got to ensure it's from the clerk
  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Webhook Verification Failed", {
      status: 400,
    });
  }

  // 5 Handle the event
  const eventType = evt.type;
  console.log(`📨 Event type: ${eventType}`);

  switch (eventType) {
    case "user.created":
      {
        console.log("👤 Creating user in database...");
        const {
          id,
          email_addresses,
          first_name,
          last_name,
          image_url,
          username,
        } = evt.data as WebhookEvent["data"] & { username?: string };

        const email = email_addresses[0]?.email_address ?? "";
        const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim();
        const safeUsername = username?.trim() || "";

        try {
          await db.user.create({
            data: {
              clerkId: id,
              email,
              name: fullName || safeUsername,
              username: safeUsername,
              imageUrl: image_url ?? null,
            },
          });

          console.log("✅ User created in DB with clerkId: ", id);
        } catch (error) {
          console.error("❌ Error creating user in DB:", error);
          throw error;
        }
      }
      break;
    case "user.updated":
      {
        const { id, email_addresses, first_name, last_name, image_url } =
          evt.data;
        // Update user in db
        await db.user.update({
          where: {
            clerkId: id,
          },
          data: {
            email: email_addresses[0]?.email_address ?? "",
            name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || null,
            imageUrl: image_url ?? null,
          },
        });
        console.log("User updated in DB with clerkId: ", id);
      }
      break;

    case "user.deleted":
      {
        const { id } = evt.data;

        // Delte the use from db
        await db.user.delete({
          where: {
            clerkId: id,
          },
        });

        console.log("User deleted from Db with Clerk ID:", id);
      }
      break;

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }

  return new Response("Ok", { status: 200 });
}
