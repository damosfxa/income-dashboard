import { ok } from "@/lib/response";

export async function POST() {
  const response = ok({ loggedOut: true });
  response.cookies.set("session", "", { path: "/", maxAge: 0 });
  return response;
}
