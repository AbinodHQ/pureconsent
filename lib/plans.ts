export const PLANS = {
  free: { name: "Free", price: 0, sites: 1, views: 5000, retention: 30, description: "A clear starting point for your first website." },
  pro: { name: "Pro", price: 14, sites: 5, views: 100000, retention: 180, description: "More room for growing businesses." },
  business: { name: "Business", price: 39, sites: 25, views: 1000000, retention: 365, description: "Manage your portfolio from one workspace." }
} as const;
export type Plan = keyof typeof PLANS;
export function effectivePlan(account: { plan: Plan; subscriptionStatus?: string; paidThrough?: number }) {
  return ["active", "trialing"].includes(account.subscriptionStatus || "") && (account.paidThrough || 0) > Date.now() ? account.plan : "free";
}
export function priceId(plan: Plan) {
  return plan === "pro" ? process.env.STRIPE_PRICE_PRO : plan === "business" ? process.env.STRIPE_PRICE_BUSINESS : undefined;
}
export function planForPrice(id: string): Plan | null {
  if (id && id === process.env.STRIPE_PRICE_PRO) return "pro";
  if (id && id === process.env.STRIPE_PRICE_BUSINESS) return "business";
  return null;
}
