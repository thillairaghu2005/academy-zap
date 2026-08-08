import { handleAssessment } from "@/lib/server/routes/assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  const values = await context.params;
  return handleAssessment(request, values.path ?? []);
}

export async function POST(request: Request, context: Context): Promise<Response> {
  const values = await context.params;
  return handleAssessment(request, values.path ?? []);
}
