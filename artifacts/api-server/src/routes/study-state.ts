import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, studyStateTable } from "@workspace/db";

const router: IRouter = Router();
const cookieName = "my_own_world_id";

function getVisitorId(req: Request, res: Response) {
  const existingId = req.cookies?.[cookieName];
  if (typeof existingId === "string" && existingId.length > 0) return existingId;

  const id = randomUUID();
  res.cookie(cookieName, id, {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return id;
}

router.get("/study-state", async (req, res) => {
  try {
    const visitorId = getVisitorId(req, res);
    const [record] = await db
      .select({ state: studyStateTable.state })
      .from(studyStateTable)
      .where(eq(studyStateTable.id, visitorId))
      .limit(1);
    res.json({ state: record?.state ?? null });
  } catch (error) {
    req.log.error({ error }, "Failed to load study state");
    res.status(500).json({ message: "Unable to load study state" });
  }
});

router.put("/study-state", async (req, res) => {
  const state = req.body?.state;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    res.status(400).json({ message: "Study state must be an object" });
    return;
  }

  try {
    const visitorId = getVisitorId(req, res);
    await db
      .insert(studyStateTable)
      .values({ id: visitorId, state })
      .onConflictDoUpdate({
        target: studyStateTable.id,
        set: { state, updatedAt: new Date() },
      });
    res.status(204).end();
  } catch (error) {
    req.log.error({ error }, "Failed to save study state");
    res.status(500).json({ message: "Unable to save study state" });
  }
});

router.delete("/study-state", async (req, res) => {
  try {
    const visitorId = getVisitorId(req, res);
    await db.delete(studyStateTable).where(eq(studyStateTable.id, visitorId));
    res.status(204).end();
  } catch (error) {
    req.log.error({ error }, "Failed to reset study state");
    res.status(500).json({ message: "Unable to reset study state" });
  }
});

export default router;