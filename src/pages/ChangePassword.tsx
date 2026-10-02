import { FormEvent, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Popup from "../components/ui/Popup";
import { useAuth } from "../context/AuthContext";
import api, { getApiErrorMessage } from "../services/api";

type PopupType = "success" | "error" | "warning" | "info";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ open: boolean; type: PopupType; title: string; message: string }>({
    open: false, type: "error", title: "", message: "",
  });

  const show = (type: PopupType, title: string, message: string) =>
    setPopup({ open: true, type, title, message });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.length < 8) return show("warning", "Password Too Short", "Your new password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return show("warning", "Passwords Do Not Match", "Please enter the same new password twice.");
    setLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      show("success", "Password Updated", "Your password has been changed. Please sign in again.");
      setTimeout(async () => {
        await logout();
        navigate("/", { replace: true });
      }, 700);
    } catch (error) {
      show("error", "Unable to Change Password", getApiErrorMessage(error, "Please check your current password and try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <Popup open={popup.open} type={popup.type} title={popup.title} message={popup.message} onClose={() => setPopup((p) => ({ ...p, open: false }))} />
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950">Change your password</h1>
            <p className="text-sm text-slate-500">{user?.fullName || "Your account"}</p>
          </div>
        </div>
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          You are using a temporary password. You must create your own password before you can continue.
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Temporary / current password
            <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" autoComplete="current-password" required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            New password
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" autoComplete="new-password" minLength={8} required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirm new password
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" autoComplete="new-password" minLength={8} required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          </label>
          <Button type="submit" disabled={loading} className="w-full !rounded-2xl !bg-[#1557a8] !py-3.5">
            {loading ? "Updating..." : "Set New Password"}
          </Button>
        </form>
        <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          Your temporary password will stop working once this change is completed.
        </div>
      </div>
    </div>
  );
}
