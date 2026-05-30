import "server-only";

import { Client, Receiver } from "@upstash/qstash";

export type WorkerPayload = {
  userId: string;
};

function getQstashToken(): string {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN is not configured");
  }
  return token;
}

function getSigningKeys(): { currentSigningKey: string; nextSigningKey: string } {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) {
    throw new Error(
      "QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY must be configured"
    );
  }
  return { currentSigningKey, nextSigningKey };
}

export function getQstashClient(): Client {
  return new Client({ token: getQstashToken() });
}

export function resolveAppBaseUrl(): string {
  const explicit =
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelProjectProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProjectProductionUrl) {
    return `https://${vercelProjectProductionUrl}`.replace(/\/+$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`.replace(/\/+$/, "");
  }

  throw new Error(
    "Unable to resolve app base URL. Set APP_BASE_URL or NEXT_PUBLIC_APP_URL."
  );
}

export async function publishWorkerMessage(path: string, body: WorkerPayload) {
  const url = `${resolveAppBaseUrl()}${path}`;
  const client = getQstashClient();
  await client.publishJSON({
    url,
    body,
  });
}

export async function verifyQstashSignature(request: Request): Promise<string> {
  const signature = request.headers.get("upstash-signature");
  if (!signature) {
    throw new Error("Missing upstash-signature header");
  }
  const body = await request.text();
  const receiver = new Receiver(getSigningKeys());
  const isValid = await receiver.verify({
    signature,
    body,
    url: request.url,
  });
  if (!isValid) {
    throw new Error("Invalid QStash signature");
  }
  return body;
}

