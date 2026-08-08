import { handleJudge } from "@/lib/server/routes/judge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  const values = await context.params;
  return handleJudge(request, values.path ?? []);
}

export async function POST(request: Request, context: Context): Promise<Response> {
  const values = await context.params;
  return handleJudge(request, values.path ?? []);
}
