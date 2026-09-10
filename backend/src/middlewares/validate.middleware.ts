import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';

/** Valida body/params/query com um schema Zod antes de chegar ao controller. */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    req.body = parsed.body ?? req.body;
    next();
  };
}
