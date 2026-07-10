import { getBillingStateForUser } from "../../billing-guard";

export async function getSubscriptionBillingState(
  actorUserId: string,
  _input: Record<string, never>,
) {
  return getBillingStateForUser(actorUserId);
}
