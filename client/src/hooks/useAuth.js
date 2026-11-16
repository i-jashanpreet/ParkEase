import { useSyncExternalStore } from "react";
import { getSession, subscribe } from "../services/authSession.js";

export default function useAuth() {
  return useSyncExternalStore(subscribe, getSession);
}
