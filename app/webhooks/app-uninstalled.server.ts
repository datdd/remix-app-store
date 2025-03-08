import db from "../db.server";
import { log } from "../utils/logger.server";

export async function handleAppUninstalled({ shop, session }) {
  log.info("Handling APP_UNINSTALLED", { shop, sessionId: session?.id });
  
  if (session) {
    await db.session.deleteMany({ where: { shop } });
    log.info("Sessions deleted", { shop });
  } else {
    log.warn("No session found for shop", { shop });
  }
  
  return new Response(null, { status: 200 });
}