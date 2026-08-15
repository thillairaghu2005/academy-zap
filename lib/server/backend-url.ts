import "server-only";

import { z } from "zod";

const backendUrlSchema = z.string().url();

const configuredBackendUrl = process.env.ZAPSTERS_API_URL?.trim();

export const BACKEND_API_URL = configuredBackendUrl
  ? backendUrlSchema.parse(configuredBackendUrl)
  : null;
