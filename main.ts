import { Hono } from "https://deno.land/x/hono@v3.2.1/mod.ts";
import { Server } from "https://deno.land/std@0.188.0/http/server.ts";
import { connect } from "https://deno.land/x/redis@v0.29.4/mod.ts";
import { rateLimit } from "./rate-limit.ts";
import { assertEquals } from "https://deno.land/std@0.188.0/testing/asserts.ts";

const runServer = async () => {
  const redis = await connect({
    hostname: "127.0.0.1",
    port: 6379,
  });

  const app = new Hono();

  app
    .use("*", rateLimit(redis))
    .get("/", (ctx) => {
      return ctx.text("Hello World");
    });

  const server = new Server({ port: 8080, handler: app.fetch });
  return { server, redis };
};

Deno.test("rate limit", async () => {
  const { server, redis } = await runServer();
  const p = server.listenAndServe();
  const ip = "127.0.0.1";
  await redis.del(ip);

  for (let i = 0; i < 10; i++) {
    const res = await fetch("http://localhost:8080/");
    await res.arrayBuffer();
    assertEquals(res.status, 200);
  }

  const res = await fetch("http://localhost:8080/");
  const status = res.status;
  await res.arrayBuffer();

  assertEquals(status, 429);

  server.close();
  redis.close();
  await p;
});
