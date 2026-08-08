import { handleAdmin } from "@/lib/server/routes/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  const values = await context.params;
  return handleAdmin(request, values.path ?? []);
}

export async function POST(request: Request, context: Context): Promise<Response> {
  const values = await context.params;
  return handleAdmin(request, values.path ?? []);
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  const values = await context.params;
  return handleAdmin(request, values.path ?? []);
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  const values = await context.params;
  return handleAdmin(request, values.path ?? []);
}
