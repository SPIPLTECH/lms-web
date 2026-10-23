"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  User,
  ShieldCheck,
  Edit,
  KeyRound,
  Award,
  Phone,
  Mail,
  Calendar,
  MapPin,
  GraduationCap,
  Users,
  Clock,
  X,
} from "lucide-react";

import UserAvatar from "@/components/admin/users/UserAvatar";
import { changePassword } from "@/services/auth.service";
import { getNewPasswordError } from "@/lib/passwordPolicy";
import PasswordRequirements from "@/components/auth/PasswordRequirements";

function InfoRow({ icon: Icon, label, value, onClick }) {
  const content = (
    <>
      <Icon size={15} className="text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground flex-1 min-w-0">{label}</span>
      <span className="text-xs font-semibold text-foreground text-right truncate max-w-[42%]">{value || "Not Provided"}</span>
      <ChevronRight size={14} className="text-slate-600 shrink-0" />
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 py-2.5 text-left active:opacity-70 transition"
      >
        {content}
      </button>
    );
  }

  return <div className="flex items-center gap-3 py-2.5">{content}</div>;
}

function QuickActionButton({ href, onClick, icon: Icon, label, disabled }) {
  const className = `flex flex-col items-center justify-center gap-1.5 rounded-xl bg-card border border-card-border py-3 min-h-[44px] transition ${
    disabled ? "opacity-40" : "active:scale-95"
  }`;

  const content = (
    <>
      <Icon size={16} className="text-primary" />
      <span className="text-[10px] font-bold text-foreground text-center leading-tight">{label}</span>
    </>
  );

  if (disabled) {
    return (
      <div className={className} title="Coming soon" aria-disabled="true">
        {content}
      </div>
    );
  }

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

// Mobile-first "My Profile" screen — reuses the same `profile` data and
// `onEdit` action the desktop cards already use, just reorganized into a
// compact, single-column layout matching the dashboard's mobile design
// language (dark navy cards, orange accents, list rows).
export default function MobileProfileView({ profile, onEdit }) {
  const router = useRouter();
  const student = profile?.studentProfile || {};
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "Not Available";

  const dob = student.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  // Real, derived-from-actual-data completion score (no field is invented) —
  // counts how many of the fields shown below are actually filled in.
  const completionFields = [
    profile?.name,
    profile?.email,
    profile?.phoneNumber || student.phone,
    profile?.address,
    profile?.avatar,
    student.dateOfBirth,
    student.guardianName,
    student.education,
  ];
  const filledCount = completionFields.filter(Boolean).length;
  const completionPercent = Math.round((filledCount / completionFields.length) * 100);

  return (
    <div className="space-y-3">
      {/* Back control only — "My Profile" already shows as the current-page
          title in the nav bar above, so it isn't repeated here. */}
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        className="h-8 w-8 -ml-1.5 flex items-center justify-center rounded-lg text-foreground active:bg-white/5 transition"
      >
        <ChevronLeft size={22} />
      </button>

      {/* Profile Summary Card — horizontal layout */}
      <div className="rounded-2xl bg-card border border-card-border p-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={profile?.name} avatar={profile?.avatar} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-foreground truncate">{profile?.name}</h2>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{profile?.email}</p>
            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                <User size={11} /> {profile?.role}
              </span>
              <span className="text-slate-600">•</span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                  profile?.status === "ACTIVE" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {profile?.status === "ACTIVE" ? "Active" : profile?.status}
              </span>
            </div>
            {profile?.isVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-1">
                <ShieldCheck size={11} /> Verified Account
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 mt-3.5">
          <QuickActionButton onClick={onEdit} icon={Edit} label="Edit Profile" />
          <QuickActionButton onClick={() => setShowPasswordModal(true)} icon={KeyRound} label="Change Password" />
          <QuickActionButton href="/student/certificates" icon={Award} label="Certificates" />
        </div>
      </div>

      {/* Profile Completion */}
      <div className="rounded-xl bg-card border border-card-border p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-foreground">Profile Completion</h3>
          <span className="text-xs font-black text-primary">{completionPercent}% Complete</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Complete your profile to get the best learning experience.</p>
      </div>

      {/* Personal Information */}
      <div className="rounded-xl bg-card border border-card-border p-3">
        <h3 className="text-xs font-black text-foreground mb-1 flex items-center gap-2">
          <span className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <User size={12} className="text-primary" />
          </span>
          Personal Information
        </h3>
        <div className="divide-y divide-card-border">
          <InfoRow icon={Phone} label="Phone Number" value={profile?.phoneNumber || student.phone} onClick={onEdit} />
          <InfoRow icon={Mail} label="Email Address" value={profile?.email} onClick={onEdit} />
          <InfoRow icon={Calendar} label="Date of Birth" value={dob} onClick={onEdit} />
          <InfoRow icon={MapPin} label="Address" value={profile?.address} onClick={onEdit} />
        </div>
      </div>

      {/* Academic Information */}
      <div className="rounded-xl bg-card border border-card-border p-3">
        <h3 className="text-xs font-black text-foreground mb-1 flex items-center gap-2">
          <span className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap size={12} className="text-primary" />
          </span>
          Academic Information
        </h3>
        <div className="divide-y divide-card-border">
          <InfoRow icon={GraduationCap} label="Education" value={student.education} onClick={onEdit} />
          <InfoRow icon={Users} label="Guardian Name" value={student.guardianName} onClick={onEdit} />
          <InfoRow icon={Clock} label="Member Since" value={joinedDate} />
        </div>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordError = getNewPasswordError(form);
    if (passwordError) {
      setStatus({ loading: false, error: passwordError, success: "" });
      return;
    }

    try {
      setStatus({ loading: true, error: "", success: "" });
      const res = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setStatus({ loading: false, error: "", success: res?.message || "Password changed successfully!" });
      setTimeout(onClose, 1200);
    } catch (err) {
      setStatus({
        loading: false,
        error: err?.response?.data?.message || "Failed to change password. Please check your current password.",
        success: "",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-background p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-foreground">Change Password</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X size={18} />
          </button>
        </div>

        {status.error && (
          <div className="p-2.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
            {status.error}
          </div>
        )}
        {status.success && (
          <div className="p-2.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            {status.success}
          </div>
        )}

        <div className="space-y-3">
          <input
            type="password"
            required
            placeholder="Current Password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
          />
          <input
            type="password"
            required
            placeholder="New Password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
          />
          <PasswordRequirements password={form.newPassword} />
          <input
            type="password"
            required
            placeholder="Confirm New Password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
          />
        </div>

        <button
          type="submit"
          disabled={status.loading}
          className="w-full py-3 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 font-black text-xs transition active:scale-95 disabled:opacity-50"
        >
          {status.loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
