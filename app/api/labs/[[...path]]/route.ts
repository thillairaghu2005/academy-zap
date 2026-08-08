import { handleLab } from "@/lib/server/routes/lab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const values = await params;
  return handleLab(request, values.path ?? []);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const values = await params;
  return handleLab(request, values.path ?? []);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const values = await params;
  return handleLab(request, values.path ?? []);
}
