/**
 * Calculate deal score based on value and account association
 * A = High priority (value > 10000€ AND has account)
 * B = Medium priority (value > 5000€ OR has account)
 * C = Low priority (default)
 */
export function calculateDealScore(deal: { amount?: string | number | null; accountId?: string | null }): 'A' | 'B' | 'C' {
  const value = typeof deal.amount === 'string' ? parseFloat(deal.amount) : (deal.amount || 0);
  const hasAccount = !!deal.accountId;

  if (value > 10000 && hasAccount) {
    return 'A';
  }
  if (value > 5000 || hasAccount) {
    return 'B';
  }
  return 'C';
}
