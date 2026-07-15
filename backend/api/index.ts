import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createApp } from "../src/main";

let expressHandlerPromise: Promise<express.Express> | null = null;

async function getHandler() {
  if (!expressHandlerPromise) {
    expressHandlerPromise = (async () => {
      const server = express();
      const app = await createApp(server);
      await app.init();
      return server;
    })();
  }
  return expressHandlerPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = await getHandler();
  return server(req, res);
}
