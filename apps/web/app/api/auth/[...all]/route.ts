import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/server/auth";

// All Better Auth endpoints: sign-in, callbacks, magic-link verify, sign-out…
export const GET = (req: Request) => toNextJsHandler(getAuth()).GET(req);
export const POST = (req: Request) => toNextJsHandler(getAuth()).POST(req);
