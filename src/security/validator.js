// Validator — Zod-based input validation schemas

import { z } from 'zod';

export const TaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  source: z.enum(['notion', 'github', 'manual']).optional().default('manual'),
});

export const OrchestratorCommandSchema = z.object({
  action: z.enum(['start', 'stop', 'step', 'reset']),
  config: z.object({
    intervalMs: z.number().min(1000).max(300000).optional(),
  }).optional(),
});

export const MemoryQuerySchema = z.object({
  layer: z.enum(['short-term', 'long-term', 'reflection']),
  category: z.string().optional(),
  agent: z.string().optional(),
  limit: z.number().min(1).max(200).optional().default(50),
});

export function validateRequest(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    return { valid: false, errors };
  }
  return { valid: true, data: result.data };
}
