import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import useAuth from "../hooks/useAuth.js";
import { changePassword, getProfile, updateProfile } from "../services/profileService.js";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getProfile().then((result) => {
      if (active) { setProfile(result); setName(result.name || ""); setPhone(result.phone || ""); }
    }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [user?._id]);

  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await updateProfile({ name: name.trim(), phone: phone.trim() });
      setProfile(result); await refreshUser(); setNotice("Profile updated.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function savePassword(event) {
    event.preventDefault(); setError(""); setNotice("");
    if (newPassword !== confirmation) { setError("New passwords do not match."); return; }
    setBusy(true);
    try { await changePassword(currentPassword, newPassword); navigate("/login", { replace: true }); }
    catch (err) { setError(err.message); }
    finally { setCurrentPassword(""); setNewPassword(""); setConfirmation(""); setBusy(false); }
  }

  return <div className="dashboard-content-grid">
    <PageHeader title="Profile" description={user?.mustChangePassword ? "Change your temporary password before using the gate console." : "Manage your account details."} />
    {error && <p role="alert" className="form-error-text">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!profile && !error && <p role="status">Loading profile…</p>}
    {profile && <Card title="Account details"><form onSubmit={save} className="auth-form">
      <label>Full name<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <p>Email: {profile.email} · Role: {profile.role} · Status: {profile.status}</p>
      <Button type="submit" disabled={busy}>Save profile</Button>
    </form></Card>}
    <Card title="Change password"><form onSubmit={savePassword} className="auth-form">
      <label>Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
      <label>New password<input required type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
      <label>Confirm new password<input required type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      <Button type="submit" disabled={busy}>Change password and sign in again</Button>
    </form></Card>
  </div>;
}
