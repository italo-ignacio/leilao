import { handlers } from "@/lib/auth";
import { getAuthOrigin, isSameOrigin } from "@/lib/auth-policy";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const response = await handlers.GET(request);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers.get("origin"), getAuthOrigin())) {
    return Response.json({ error: "Origem não permitida." }, { status: 403 });
  }
  return handlers.POST(request);
}
