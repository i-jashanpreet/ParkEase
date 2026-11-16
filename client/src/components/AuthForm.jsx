import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import { signIn } from "../services/authSession.js";
import PageContainer from "./PageContainer.jsx";

export default function AuthForm({ register = false }) {
  const { error: sessionError } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    setBusy(true);
    try {
      await signIn(register ? "register" : "login", fields);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer title={register ? "Create your account" : "Sign in"}>
      <form className="form-card" onSubmit={submit}>
        {register && <label>Full name<input name="name" autoComplete="name" minLength={2} maxLength={100} required /></label>}
        <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <label>Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : undefined} required /></label>
        {register && <label>Account type
          <select name="role">
            <option value="USER">Driver</option>
            <option value="MALL_OWNER">Mall owner</option>
          </select>
        </label>}
        {(error || sessionError) && <p className="form-error" role="alert">{error || sessionError}</p>}
        <button className="button" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
        <p>{register ? "Already have an account? " : "New to ParkEase? "}
          <Link to={register ? "/login" : "/register"}>{register ? "Sign in" : "Create an account"}</Link>
        </p>
      </form>
    </PageContainer>
  );
}
