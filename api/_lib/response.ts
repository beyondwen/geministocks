// api/_lib/response.ts
import type { VercelResponse } from '@vercel/node';

export function success(res: VercelResponse, data: any, status = 200) {
  return res.status(status).json({
    success: true,
    data,
  });
}

export function error(res: VercelResponse, message: string, status = 400, code?: string) {
  return res.status(status).json({
    success: false,
    error: {
      message,
      code,
    },
  });
}

export function unauthorized(res: VercelResponse) {
  return error(res, 'Unauthorized', 401, 'UNAUTHORIZED');
}

export function methodNotAllowed(res: VercelResponse) {
  return error(res, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');
}
