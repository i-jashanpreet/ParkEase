import { config } from "dotenv";
import { fileURLToPath } from "node:url";

export const serverEnvPath = fileURLToPath(new URL("../../.env", import.meta.url));

// Explicit path makes server commands independent of the caller's cwd.
// Existing process variables win so tests and deployment secrets are never
// overwritten by a developer's server/.env file.
config({ path: serverEnvPath, override: false, quiet: true });

export function databaseNameFromUri(uri) {
  if (typeof uri !== "string" || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw new Error("MONGODB_URI must use mongodb:// or mongodb+srv://");
  }
  const name = decodeURIComponent(new URL(uri).pathname.replace(/^\//, ""));
  if (!name || name.includes("/")) {
    throw new Error("MONGODB_URI must include one explicit database name");
  }
  if (["admin", "config", "local"].includes(name.toLowerCase())) {
    throw new Error("MONGODB_URI must not target a MongoDB system database");
  }
  return name;
}
