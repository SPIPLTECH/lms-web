"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Check,
  X,
  Camera,
  Upload,
  UserCheck,
  Lock,
  Key,
  Trash2,
  Save,
  GraduationCap,
  Award,
  Clock,
  FileText,
  Settings as SettingsIcon,
} from "lucide-react";

import useUpdateProfile from "@/hooks/queries/student/useUpdateProfile";
import { changePassword } from "@/services/auth.service";
import { getNewPasswordError } from "@/lib/passwordPolicy";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
import { uploadAvatar, removeAvatar } from "@/services/profile.service";
import { getDisplayUrl } from "@/lib/blob";

export default function InstructorProfileView({ profile, onRefresh }) {
  const updateProfileMutation = useUpdateProfile();
  const fileInputRef = useRef(null);
  const teacher = profile?.teacherProfile || {};

  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    address: "",
    specialization: "",
    qualification: "",
    experience: "",
    bio: "",
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phoneNumber: profile.phoneNumber || "",
        address: profile.address || "",
        specialization: teacher.specialization || "",
        qualification: teacher.qualification || "",
        experience: teacher.experience ?? "",
        bio: teacher.bio || "",
      });
      if (profile.avatar) setAvatarPreview(getDisplayUrl(profile.avatar));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const checkList = [
    { label: "Full Name", isFilled: !!formData.name.trim() },
    { label: "Phone Number", isFilled: !!formData.phoneNumber.trim() },
    { label: "Address", isFilled: !!formData.address.trim() },
    { label: "Specialization", isFilled: !!formData.specialization.trim() },
    { label: "Qualification", isFilled: !!formData.qualification.trim() },
    { label: "Bio", isFilled: !!formData.bio.trim() },
    { label: "Profile Photo", isFilled: !!(avatarPreview || profile?.avatar) },
  ];
  const completedCount = checkList.filter((item) => item.isFilled).length;
  const completionPercentage = Math.round((completedCount / checkList.length) * 100);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarMessage("Error: Only image files (JPG, PNG, WebP) are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMessage("Error: Image size must be less than 5MB.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setAvatarMessage("");
      setAvatarPreview(URL.createObjectURL(file));
      await uploadAvatar(file);
      setAvatarMessage("Profile photo uploaded successfully!");
      onRefresh?.();
    } catch (err) {
      setAvatarMessage(err?.response?.data?.message || "Failed to upload photo.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsUploadingAvatar(true);
      setAvatarMessage("");
      setAvatarPreview(null);
      await removeAvatar();
      setAvatarMessage("Profile photo removed.");
      onRefresh?.();
    } catch {
      setAvatarMessage("Failed to remove photo.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaveSuccessMsg("");
    setSaveErrorMsg("");

    try {
      await updateProfileMutation.mutateAsync({
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        specialization: formData.specialization,
        qualification: formData.qualification,
        experience: formData.experience === "" ? undefined : parseInt(formData.experience, 10),
        bio: formData.bio,
      });
      setSaveSuccessMsg("Profile changes saved successfully!");
      onRefresh?.();
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      setSaveErrorMsg(err?.response?.data?.message || "Failed to save profile changes.");
    }
  };

  const memberSinceStr = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "-";

  const initials = (profile?.name || "I")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200 text-foreground">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[var(--card)] via-[var(--surface-muted)] to-[var(--card)] p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="relative group">
              <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-pink-500 p-1 shadow-xl shadow-orange-500/10">
                <div className="h-full w-full rounded-full bg-background flex items-center justify-center text-3xl font-black text-foreground overflow-hidden relative">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={profile?.name || "Avatar"} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-primary hover:bg-orange-600 text-slate-950 flex items-center justify-center shadow-lg transition active:scale-90 cursor-pointer"
                title="Upload Profile Photo"
              >
                <Camera size={15} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">{profile?.name}</h1>
                {profile?.isVerified && (
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40" title="Verified Account">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                )}
              </div>

              <p className="text-sm font-medium text-muted-foreground">{profile?.email}</p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/15 border border-primary/30 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
                  <User size={12} />
                  <span>{profile?.role || "INSTRUCTOR"}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                    profile?.isVerified
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                  }`}
                >
                  <UserCheck size={13} />
                  <span>{profile?.isVerified ? "Verified" : "Not Verified"}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
                  <Clock size={13} />
                  <span>Member since {memberSinceStr}</span>
                </span>
              </div>

              {avatarMessage && <p className="text-xs font-semibold text-primary animate-in fade-in pt-1">{avatarMessage}</p>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-orange-600 active:scale-95 text-slate-950 font-black text-xs px-5 py-2.5 transition shadow-lg shadow-orange-500/15 cursor-pointer"
            >
              <Upload size={14} className="stroke-[2.5]" />
              <span>Upload Photo</span>
            </button>

            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs px-5 py-2 transition active:scale-95 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Remove Photo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-background hover:bg-muted border border-transparent text-foreground font-bold text-xs px-5 py-2.5 transition active:scale-95 cursor-pointer"
            >
              <Lock size={14} />
              <span>Change Password</span>
            </button>

            {/* Plain link: the ?from=profile marker this used to carry only
                steered the settings page's back link, which no longer
                exists. */}
            <Link
              href="/instructor/settings"
              className="flex items-center justify-center gap-2 rounded-xl bg-background hover:bg-muted border border-transparent text-foreground font-bold text-xs px-5 py-2.5 transition active:scale-95"
            >
              <SettingsIcon size={14} />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-10">
        <div className="lg:col-span-7 space-y-6">
          {/* PERSONAL INFO */}
          <div className="rounded-2xl border border-border bg-background/70 p-6 md:p-7 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                  <User size={18} />
                </div>
                <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-transparent hover:border-primary text-xs font-bold text-foreground hover:text-foreground transition cursor-pointer disabled:opacity-50"
              >
                <Save size={13} />
                <span>Save</span>
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-600" />
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="w-full bg-background/60 border border-border/80 rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-muted-foreground outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">Address</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PROFESSIONAL INFO */}
          <div className="rounded-2xl border border-border bg-background/70 p-6 md:p-7 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                  <GraduationCap size={18} />
                </div>
                <h2 className="text-lg font-bold text-foreground">Professional Information</h2>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-transparent hover:border-primary text-xs font-bold text-foreground hover:text-foreground transition cursor-pointer disabled:opacity-50"
              >
                <Save size={13} />
                <span>Save</span>
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">Specialization</label>
                <div className="relative">
                  <Award size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="e.g. Full-Stack Web Development"
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">Qualification</label>
                <div className="relative">
                  <GraduationCap size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    placeholder="e.g. M.Tech, Computer Science"
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">Years of Experience</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type="number"
                    min="0"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">Bio</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                  <textarea
                    name="bio"
                    rows={3}
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="A short bio students and admins will see on your instructor profile..."
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveSuccessMsg ? (
              <p className="text-xs font-bold text-emerald-400 animate-in fade-in">✓ {saveSuccessMsg}</p>
            ) : saveErrorMsg ? (
              <p className="text-xs font-bold text-red-400 animate-in fade-in">✕ {saveErrorMsg}</p>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-primary hover:bg-orange-600 active:scale-95 text-slate-950 font-black text-xs px-6 py-3 transition shadow-lg shadow-orange-500/15 cursor-pointer disabled:opacity-50"
            >
              <Check size={15} className="stroke-[3]" />
              <span>{updateProfileMutation.isPending ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-border bg-background/70 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Profile Completion</h3>
              <span className="text-xs font-black text-primary">{completionPercentage}% Complete</span>
            </div>

            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="space-y-2.5 pt-1 text-xs">
              {checkList.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  {item.isFilled ? (
                    <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <Check size={10} className="stroke-[3]" />
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-primary/80 shrink-0" />
                  )}
                  <span className={item.isFilled ? "text-foreground font-medium" : "text-muted-foreground font-normal"}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: false, error: "", success: "" });

    const passwordError = getNewPasswordError(passwordData);
    if (passwordError) {
      setStatus({ loading: false, error: passwordError, success: "" });
      return;
    }

    try {
      setStatus({ loading: true, error: "", success: "" });
      const res = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setStatus({ loading: false, error: "", success: res?.message || "Password changed successfully!" });
      setTimeout(onClose, 1200);
    } catch (err) {
      setStatus({
        loading: false,
        error: err?.response?.data?.message || "Failed to change password. Please check current password.",
        success: "",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Key size={15} />
            </div>
            <h3 className="text-base font-bold text-foreground">Change Password</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {status.error && (
          <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">{status.error}</div>
        )}
        {status.success && (
          <div className="p-3 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">{status.success}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Current Password</label>
            <input
              type="password"
              required
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">New Password</label>
            <input
              type="password"
              required
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
            />
            <div className="mt-2">
              <PasswordRequirements password={passwordData.newPassword} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Confirm Password</label>
            <input
              type="password"
              required
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={status.loading}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 font-black text-xs transition shadow-lg shadow-orange-500/10 cursor-pointer disabled:opacity-50"
          >
            {status.loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
