import { NextResponse } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";
import { auditLog } from "@/lib/audit";

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

const KEYS = ["license.trialDays", "license.priceBasic", "license.priceShs", "license.currency", "license.momoPhones", "license.monthlyGoal", "license.freeSchools"] as const;

/** GET — the vendor's sales configuration (trial length, prices, MoMo numbers). */
export const GET = handle(async () => {
  await requireDeveloper();
  const values = await Promise.all(KEYS.map((k) => getSetting(k)));
  return ok({
    trialDays: values[0] || "30",
    priceBasic: values[1] || "3000",
    priceShs: values[2] || "5000",
    price: values[1] || "3000",
    currency: values[3] || "GHS",
    momoPhones: values[4] || "",
    monthlyGoal: values[5] || "",
    freeSchools: values[6] || "3",
  });
});

/** PUT — save the sales configuration. */
export const PUT = handle(async (req) => {
  const user = await requireDeveloper();
  const body = await readJson<{ trialDays?: string; price?: string; priceBasic?: string; priceShs?: string; currency?: string; momoPhones?: string; monthlyGoal?: string; freeSchools?: string }>(req);
  const priceBasic = body.priceBasic?.trim() || body.price?.trim() || "3000";
  const priceShs = body.priceShs?.trim() || "5000";
  await Promise.all([
    setSetting("license.trialDays", body.trialDays?.trim() || "30"),
    setSetting("license.priceBasic", priceBasic),
    setSetting("license.priceShs", priceShs),
    // Mirror the basic price into the legacy single-price key so any remaining
    // single-price surfaces (e.g. the developer activation flow) stay in sync.
    setSetting("license.price", priceBasic),
    setSetting("license.currency", body.currency?.trim() || "GHS"),
    setSetting("license.momoPhones", body.momoPhones?.trim() || ""),
    setSetting("license.monthlyGoal", body.monthlyGoal?.trim() || ""),
    // The free-schools count feeds `schools.freeLimit` (read by the schools API
    // and the Schools page) — keep both in sync so the UI + enforcement agree.
    setSetting("license.freeSchools", body.freeSchools?.trim() || "3"),
    setSetting("schools.freeLimit", body.freeSchools?.trim() || "3"),
  ]);
  await auditLog(user.id, "UPDATE", "license.config", user.id, { trialDays: body.trialDays, priceBasic, priceShs, freeSchools: body.freeSchools });
  return NextResponse.json({ ok: true, data: { saved: true } });
});
