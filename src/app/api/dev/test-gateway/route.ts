import { handle, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { probeGatewayKeys, type MomoProvider } from "@/lib/payments";

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

/**
 * Test the DEVELOPER'S OWN gateway credentials live, right from the console.
 * Runs the real provider handshake (token exchange for Mobile Money, balance
 * call for Paystack) — never creates a transaction and never prompts a payer.
 * Returns a clean pass/fail message the console renders inline.
 */
export const POST = handle(async (req) => {
  await requireDeveloper();
  const body = await readJson<{ method?: string; provider?: string }>(req);
  const method = body.method === "PAYSTACK" ? "PAYSTACK" : "MOMO";
  const provider = (body.provider ?? "MTN") as MomoProvider;
  const result = await probeGatewayKeys(method, provider);
  return ok(result);
});
