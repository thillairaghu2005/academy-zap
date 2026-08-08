import { handleContent } from "@/lib/server/routes/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const values = await params;
  return handleContent(request, values.path ?? []);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const values = await params;
  return handleContent(request, values.path ?? []);
}
