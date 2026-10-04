import { getReviewerAccess, saveReviewerAccess } from "../src/shared/storage";

async function main() {
  const accountId = process.argv[2]?.trim();
  const grantedBy = process.argv[3]?.trim();
  if (!accountId || !/^[a-f0-9]{40}$/.test(accountId) || !grantedBy) throw new Error("Usage: npm run grant:reviewer -- <40-character-account-id> <operator-reference>");
  const existing = await getReviewerAccess(accountId);
  const now = new Date().toISOString();
  await saveReviewerAccess({ partitionKey: "reviewers", rowKey: accountId, accountId, role: "reviewer", status: "active", grantedBy, grantedAt: existing?.grantedAt ?? now, updatedAt: now });
  process.stdout.write(`Reviewer access granted for account ${accountId.slice(0, 8)}…\n`);
}
void main();
