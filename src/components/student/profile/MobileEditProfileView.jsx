"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";

import UserAvatar from "@/components/admin/users/UserAvatar";
import useUpdateProfile from "@/hooks/queries/student/useUpdateProfile";
import DatePicker from "@/components/ui/DatePicker";

export default function MobileEditProfileView({ isOpen, onClose, profile }) {
  const updateProfileMutation = useUpdateProfile();
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    address: "",
    education: "",
    institution: "",
    graduationYear: "",
    guardianName: "",
    dateOfBirth: "",
  });
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (profile) {
      const student = profile.studentProfile || {};
      let dobStr = "";
      if (student.dateOfBirth) {
        try {
          dobStr = new Date(student.dateOfBirth).toISOString().split("T")[0];
        } catch {
          dobStr = "";
        }
      }

      setFormData({
        name: profile.name || "",
        phoneNumber: profile.phoneNumber || "",
        address: profile.address || "",
        education: student.education || "",
        institution: student.institution ?? student.collegeName ?? "",
        graduationYear: student.graduationYear != null ? String(student.graduationYear) : "",
        guardianName: student.guardianName || "",
        dateOfBirth: dobStr,
      });
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      await updateProfileMutation.mutateAsync(formData);
      onClose();
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message || "Failed to update profile. Please try again."
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sm:hidden fixed inset-0 z-[80] bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-card-border shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit profile"
            className="h-8 w-8 -ml-1.5 flex items-center justify-center rounded-lg text-foreground active:bg-white/5 transition cursor-pointer"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-base font-black text-foreground">Edit Profile</h1>
        </div>
      </div>

      {/* Form Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-6">
        <div className="flex flex-col items-center gap-2 py-2">
          <UserAvatar name={profile?.name} avatar={profile?.avatar} size="lg" />
          <button
            type="button"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const { uploadAvatar } = await import("@/services/profile.service");
                  await uploadAvatar(file);
                  window.location.reload();
                }
              };
              input.click();
            }}
            className="text-[11px] font-bold text-primary hover:text-orange-300"
          >
            Change Photo
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full bg-card border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={profile?.email || ""}
            disabled
            className="w-full bg-background/50 border border-border/80 rounded-xl px-3.5 py-2.5 text-sm text-muted-foreground outline-none cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
            Phone Number
          </label>
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="Enter phone number"
            className="w-full bg-card border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
          />
        </div>

        <DatePicker
          label="Date of Birth"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleChange}
          placeholder="Select Date of Birth"
        />

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
            Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Enter address"
            className="w-full bg-card border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
            Education
          </label>
          <input
            type="text"
            name="education"
            value={formData.education}
            onChange={handleChange}
            placeholder="Enter education background"
            className="w-full bg-card border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
            Institution / University
          </label>
          <input
            type="text"
            name="institution"
            value={formData.institution}
            onChange={handleChange}
            placeholder="Enter institution or university"
            className="w-full bg-card border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
            Year of Graduation
          </label>
          <input
            type="text"
            name="graduationYear"
            value={formData.graduationYear}
            onChange={handleChange}
            placeholder="Enter graduation year"
            className="w-full bg-card border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
            Guardian Name
          </label>
          <input
            type="text"
            name="guardianName"
            value={formData.guardianName}
            onChange={handleChange}
            placeholder="Enter guardian name"
            className="w-full bg-card border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
          />
        </div>
      </div>

      {/* Fixed Save button */}
      <div className="shrink-0 border-t border-card-border p-4">
        <button
          type="submit"
          disabled={updateProfileMutation.isPending}
          className="w-full py-3 min-h-[44px] rounded-xl bg-primary hover:bg-orange-600 active:scale-98 text-slate-950 font-black text-sm transition shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {updateProfileMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </div>
    </form>
  );
}
