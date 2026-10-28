"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  GraduationCap,
  Building,
  ShieldCheck,
  Lock,
  Key,
  Check,
  X,
  Camera,
  Upload,
  Trash2,
  Save,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import useUpdateProfile from "@/hooks/queries/student/useUpdateProfile";
import { changePassword } from "@/services/auth.service";
import { getNewPasswordError } from "@/lib/passwordPolicy";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
import { uploadAvatar, removeAvatar } from "@/services/profile.service";
import { getDisplayUrl } from "@/lib/blob";

const EDUCATION_OPTIONS = [
  "B.Tech in Artificial Intelligence & ML",
  "B.Tech in Computer Science & Engineering",
  "B.Tech in Information Technology",
  "Bachelor of Science (B.Sc)",
  "Master of Technology (M.Tech)",
  "Master of Computer Applications (MCA)",
  "Bachelor of Business Administration (BBA)",
  "High School / Secondary Education",
  "Other / Self-Taught",
];

const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
];

// Form state straight from the stored profile. Empty fields stay empty: a
// sample value here would show as the student's own data, count towards
// Profile Completion and be saved on the next "Save".
const toFormData = (profile) => {
  const student = profile.studentProfile || {};
  let dobStr = "";
  if (student.dateOfBirth) {
    try {
      dobStr = new Date(student.dateOfBirth).toISOString().split("T")[0];
    } catch {
      dobStr = "";
    }
  }

  return {
    name: profile.name || "",
    phoneNumber: profile.phoneNumber || "",
    address: profile.address || "",
    education: student.education || "",
    institution: student.institution || "",
    graduationYear: student.graduationYear || "",
    guardianName: student.guardianName || "",
    gender: student.gender || "",
    dateOfBirth: dobStr,
  };
};

export default function DesktopEditProfileView({ profile, onRefresh }) {
  const updateProfileMutation = useUpdateProfile();
  const fileInputRef = useRef(null);
  const dobRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    address: "",
    education: "",
    institution: "",
    graduationYear: "",
    guardianName: "",
    gender: "",
    dateOfBirth: "",
  });

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");

  // Modals state
  // Only the Change Password dialog remains. The Security & Privacy card,
  // the Quick Actions list and the Privacy Settings header button were the
  // only ways to open the 2FA / Active Sessions / Privacy / Notification
  // dialogs, so those dialogs went with them rather than staying as markup
  // nothing could reach.
  const [activeModal, setActiveModal] = useState(null); // 'password' | null
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, error: "", success: "" });


  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  useEffect(() => {
    if (profile) {
      setFormData(toFormData(profile));

      if (profile.avatar) {
        setAvatarPreview(getDisplayUrl(profile.avatar));
      }
    }
  }, [profile]);

  // Calculate dynamic profile completion percentage
  const checkList = [
    { label: "Full Name", key: "name", isFilled: !!formData.name.trim() },
    { label: "Phone Number", key: "phoneNumber", isFilled: !!formData.phoneNumber.trim() },
    { label: "Email Address", key: "email", isFilled: !!profile?.email },
    { label: "Date of Birth", key: "dateOfBirth", isFilled: !!formData.dateOfBirth },
    { label: "Address", key: "address", isFilled: !!formData.address.trim() },
    { label: "Education", key: "education", isFilled: !!formData.education },
    { label: "Institution", key: "institution", isFilled: !!formData.institution.trim() },
    { label: "Profile Photo", key: "avatar", isFilled: !!(avatarPreview || profile?.avatar) },
  ];

  const completedCount = checkList.filter((item) => item.isFilled).length;
  const completionPercentage = Math.round((completedCount / checkList.length) * 100);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Avatar Upload Handlers
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
      
      // Local preview immediately
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);

      // Upload to backend API
      await uploadAvatar(file);
      setAvatarMessage("Profile photo uploaded successfully!");
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
    } catch {
      setAvatarMessage("Failed to remove photo.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Profile Form Save Handler
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaveSuccessMsg("");
    setSaveErrorMsg("");

    try {
      await updateProfileMutation.mutateAsync(formData);
      setSaveSuccessMsg("Profile changes saved successfully!");
      if (onRefresh) onRefresh();
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      setSaveErrorMsg(err?.response?.data?.message || "Failed to save profile changes.");
    }
  };

  // Password Change Handler
  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus({ loading: false, error: "", success: "" });

    const passwordError = getNewPasswordError(passwordData);
    if (passwordError) {
      setPasswordStatus({ loading: false, error: passwordError, success: "" });
      return;
    }

    try {
      setPasswordStatus({ loading: true, error: "", success: "" });
      const res = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordStatus({
        loading: false,
        error: "",
        success: res?.message || "Password changed successfully!",
      });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        setActiveModal(null);
        setPasswordStatus({ loading: false, error: "", success: "" });
      }, 1500);
    } catch (err) {
      setPasswordStatus({
        loading: false,
        error: err?.response?.data?.message || "Failed to change password. Please check current password.",
        success: "",
      });
    }
  };

  const memberSinceStr = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const initials = (profile?.name || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200 text-foreground">
      {/* Hidden File Input for Avatar */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* 1. HERO PROFILE HEADER CARD */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[var(--card)] via-[var(--surface-muted)] to-[var(--card)] p-6 md:p-8 shadow-2xl">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* Avatar & Identifiers */}
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            {/* Avatar block */}
            <div className="relative group">
              <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-pink-500 p-1 shadow-xl shadow-orange-500/10">
                <div className="h-full w-full rounded-full bg-background flex items-center justify-center text-3xl font-black text-foreground overflow-hidden relative">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={profile?.name || "Avatar"}
                      className="h-full w-full object-cover"
                    />
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

              {/* Camera Icon Trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-primary hover:bg-orange-600 text-slate-950 flex items-center justify-center shadow-lg transition active:scale-90 cursor-pointer"
                title="Upload Profile Photo"
              >
                <Camera size={15} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Name & Metadata Badges */}
            <div className="space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                  {formData.name || profile?.name}
                </h1>
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40" title="Verified Account">
                  <Check size={12} className="stroke-[3]" />
                </div>
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                {profile?.email}
              </p>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/15 border border-primary/30 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
                  <User size={12} />
                  <span>{profile?.role || "STUDENT"}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Active</span>
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/80 border border-transparent px-2.5 py-1 text-[11px] font-bold text-foreground">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>Verified Account</span>
                </span>

                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
                  <Calendar size={13} />
                  <span>Member since {memberSinceStr}</span>
                </span>
              </div>

              {avatarMessage && (
                <p className="text-xs font-semibold text-primary animate-in fade-in pt-1">
                  {avatarMessage}
                </p>
              )}
            </div>
          </div>

          {/* Quick Hero Actions */}
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
              onClick={() => setActiveModal("password")}
              className="flex items-center justify-center gap-2 rounded-xl bg-background hover:bg-muted border border-transparent text-foreground font-bold text-xs px-5 py-2.5 transition active:scale-95 cursor-pointer"
            >
              <Lock size={14} />
              <span>Change Password</span>
            </button>

          </div>
        </div>
      </div>

      {/* 2-COLUMN MAIN CONTENT GRID */}
      <div className="grid gap-6 lg:grid-cols-10">
        {/* LEFT COLUMN (70% = 7 cols on lg grid) */}
        <div className="lg:col-span-7 space-y-6">
          {/* A. PERSONAL INFORMATION CARD */}
          <div className="rounded-2xl border border-border bg-background/70 p-6 md:p-7 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                  <User size={18} />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
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
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
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

              {/* Email Address (Read-only) */}
              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
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

              {/* Phone Number */}
              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
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

              {/* Date of Birth Picker */}
              <div ref={dobRef}>
                <DatePicker
                  label="Date of Birth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  placeholder="Select Date of Birth"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Gender
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-8 py-2.5 text-sm text-foreground outline-none focus:border-primary transition appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-background text-foreground">
                      Select gender
                    </option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g} className="bg-background text-foreground">
                        {g}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3.5 top-3.5 text-muted-foreground text-xs pointer-events-none">
                    ▼
                  </span>
                </div>
              </div>

              {/* Address (Spans Full Width) */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Address
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                  <textarea
                    name="address"
                    rows={2}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your address"
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* B. EDUCATION DETAILS CARD */}
          <div className="rounded-2xl border border-border bg-background/70 p-6 md:p-7 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                  <GraduationCap size={18} />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Education Details</h2>
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
              {/* Education (Select Dropdown) */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Education Degree
                </label>
                <div className="relative">
                  <GraduationCap size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                  <select
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-8 py-2.5 text-sm text-foreground outline-none focus:border-primary transition appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-background text-foreground">
                      Select education degree
                    </option>
                    {EDUCATION_OPTIONS.map((edu) => (
                      <option key={edu} value={edu} className="bg-background text-foreground">
                        {edu}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3.5 top-3.5 text-muted-foreground text-xs pointer-events-none">
                    ▼
                  </span>
                </div>
              </div>

              {/* Institution / University */}
              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Institution / University
                </label>
                <div className="relative">
                  <Building size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Year of Graduation */}
              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Year of Graduation
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    name="graduationYear"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Guardian Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Guardian Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    name="guardianName"
                    value={formData.guardianName}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Member Since (Read-only) */}
              <div>
                <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Member Since
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3.5 top-3 text-slate-600" />
                  <input
                    type="text"
                    value={memberSinceStr}
                    disabled
                    className="w-full bg-background/60 border border-border/80 rounded-xl !pl-10 !pr-3.5 py-2.5 text-sm text-muted-foreground outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>


          {/* D. SAVE / CANCEL ACTIONS BAR */}
          <div className="flex items-center justify-between pt-2">
            {saveSuccessMsg ? (
              <p className="text-xs font-bold text-emerald-400 animate-in fade-in">
                ✓ {saveSuccessMsg}
              </p>
            ) : saveErrorMsg ? (
              <p className="text-xs font-bold text-red-400 animate-in fade-in">
                ✕ {saveErrorMsg}
              </p>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (profile) {
                    setFormData(toFormData(profile));
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl bg-background hover:bg-muted border border-transparent text-foreground font-bold text-xs px-5 py-3 transition active:scale-95 cursor-pointer"
              >
                <X size={14} />
                <span>Cancel</span>
              </button>

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
        </div>

        {/* RIGHT COLUMN (30% = 3 cols on lg grid) */}
        <div className="lg:col-span-3 space-y-6">
          {/* 1. DYNAMIC PROFILE COMPLETION CARD */}
          <div className="rounded-2xl border border-border bg-background/70 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Profile Completion</h3>
              <span className="text-xs font-black text-primary">
                {completionPercentage}% Complete
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Complete missing fields to get full access and personalized recommendation features.
            </p>

            {/* Dynamic Checklist */}
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
                  <span className={item.isFilled ? "text-foreground font-medium" : "text-muted-foreground font-normal"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => {
                if (dobRef.current) {
                  dobRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              className="w-full py-2.5 rounded-xl border border-primary/40 text-primary hover:bg-primary/10 font-bold text-xs transition cursor-pointer"
            >
              Complete Missing Fields
            </button>
          </div>


        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECURITY & PRIVACY MODALS */}
      {/* ========================================================================= */}

      {/* 1. CHANGE PASSWORD MODAL */}
      {activeModal === "password" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handlePasswordChangeSubmit}
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
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {passwordStatus.error && (
              <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                {passwordStatus.error}
              </div>
            )}

            {passwordStatus.success && (
              <div className="p-3 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                {passwordStatus.success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  New Password
                </label>
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
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
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
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordStatus.loading}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 font-black text-xs transition shadow-lg shadow-orange-500/10 cursor-pointer disabled:opacity-50"
              >
                {passwordStatus.loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
