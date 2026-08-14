import "server-only";

import { z } from "zod";

const backendUrlSchema = z.string().url();

export const BACKEND_API_URL = backendUrlSchema.parse(
  process.env.ZAPSTERS_API_URL ?? "http://127.0.0.1:8000",
);
