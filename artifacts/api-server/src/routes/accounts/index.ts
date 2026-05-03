import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateAccountBody, DeleteAccountParams } from "@workspace/api-zod";

const router = Router();

// List accounts
router.get("/accounts", async (req, res) => {
  try {
    const accounts = await db.select().from(accountsTable);
    res.json(
      accounts.map((a) => ({
        id: a.id,
        platform: a.platform,
        accountName: a.accountName,
        isConnected: a.isConnected,
        createdAt: a.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list accounts");
    res.status(500).json({ error: "Failed to list accounts" });
  }
});

// Create account
router.post("/accounts", async (req, res) => {
  try {
    const body = CreateAccountBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid request body" });

    const [account] = await db
      .insert(accountsTable)
      .values({
        platform: body.data.platform,
        accountName: body.data.accountName,
        credentials: JSON.stringify(body.data.credentials || {}),
        isConnected: true,
      })
      .returning();

    res.status(201).json({
      id: account.id,
      platform: account.platform,
      accountName: account.accountName,
      isConnected: account.isConnected,
      createdAt: account.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create account");
    res.status(500).json({ error: "Failed to create account" });
  }
});

// Delete account
router.delete("/accounts/:accountId", async (req, res) => {
  try {
    const params = DeleteAccountParams.safeParse({ accountId: Number(req.params.accountId) });
    if (!params.success) return res.status(400).json({ error: "Invalid accountId" });

    await db.delete(accountsTable).where(eq(accountsTable.id, params.data.accountId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete account");
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
