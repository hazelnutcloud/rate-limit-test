import { Context, Next } from "https://deno.land/x/hono@v3.2.1/mod.ts";
import { Redis } from "https://deno.land/x/redis@v0.29.4/mod.ts";

export const rateLimit = (
  redis: Redis,
  params?: { window?: number; max?: number },
) => {
  const defaultParams = { window: 60, max: 10 };
  const mergedParams = { ...defaultParams, ...params };

  return async (ctx: Context, next: Next) => {
    await next();
    const ip = (ctx.req.headers.get("x-forwarded-for") ||
      ctx.env?.remoteAddr.hostname) as
        | string
        | undefined;
    if (!ip) {
      ctx.status(400);
      return ctx.text("Bad Request");
    }
    const count = await redis.get(ip);
    console.log(count);
    if (!count) {
      await redis.set(ip, 1, { ex: mergedParams.window });
      return;
    }
    if (parseInt(count) >= (mergedParams.max)) {
      ctx.res = undefined;
      ctx.res = new Response("Too Many Requests", {
        status: 429,
      });
      return;
    }
    await redis.incr(ip);
  };
};
