import { Webhook } from "svix";
import { headers } from "next/headers";
import { clerkClient, WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { STATUS_CODES } from "http";
import { url } from "inspector";

export async function POST(req: Request) {
  // 1. Get the webhook secret from env
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  //Check the webhook secret
  if (!WEBHOOK_SECRET) {
    throw new Error("CLERK_WEBHOOK_SECRET is not defined");
  }

  // Get the svix headers
  const headersPayload = await headers();
  const svixId = headersPayload.get("svix-id");
  const svixTimestamp = headersPayload.get("svix-timestamp");
  const svixSignature = headersPayload.get("svix-signature");

  // Throw a error if any header is Missing
  if (!svixId || !svixSignature || !svixTimestamp) {
    throw new Error("Missing svix headers ", { status: 400 });
  }

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
      status: STATUS_CODES[400],
    });
  }

  // 5 Handle the event
  const eventType = evt.type;

  switch (eventType) {
    case "user.created": {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;

      // Create new user in db
      await db.user.create({
        data: {
          clerkId: id,
          email: email_addresses[0]?.email_address ?? "",
          name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || null,
          imageUrl: image_url ?? null,
        },
      });

      console.log("User created in DB with clerkId: ", id);
    }
    case "user.updated": {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;
      // Update user in db
      await db.user.update({
        where: {
          clerkId: id,
        },
        data: {
          email_addresses: email_addresses[0]?.email_address ?? "",
          name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || null,
          image_url: image_url ?? null,
        },
      });
      console.log("User updated in DB with clerkId: ", id);
    }

    case "user.deleted": {
      const { id } = evt.data;

      // Delte the use from db
      await db.user.delete({
        where: {
          clerkId: id,
        },
      });

      console.log("User deleted from Db with Clerk ID:", id);
    }

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }
}
