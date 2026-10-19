"use client";

import { useState, useEffect } from "react";
import { Megaphone, ArrowLeft, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Loader from "@/components/common/Loader";

import { useInstructorCourses } from "@/hooks/queries/instructor/useInstructorCourses";
import { useCreateCourseAnnouncement } from "@/hooks/queries/instructor/useCreateCourseAnnouncement";

export default function InstructorAnnouncementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: courses = [], isLoading } = useInstructorCourses();

  // Filter courses: Must be owned by active instructor and PUBLISHED
  const eligibleCourses = courses.filter(
    (c) => c.creatorId === user?.id && c.status === "PUBLISHED"
  );

  useEffect(() => {
    const action = searchParams.get("action");
    const paramCourseId = searchParams.get("courseId");
    
    if (action === "create" && paramCourseId && eligibleCourses.some((c) => c.id === paramCourseId)) {
      setSelectedCourseId(paramCourseId);
    }
  }, [searchParams, eligibleCourses]);

  const broadcastMutation = useCreateCourseAnnouncement();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCourseId) {
      setErrorMsg("Please select a course first.");
      return;
    }
    broadcastMutation.mutate(
      { courseId: selectedCourseId, title, message },
      {
        onSuccess: () => {
          setSuccessMsg("Announcement broadcasted successfully to all enrolled students!");
          setTitle("");
          setMessage("");
          setErrorMsg("");
          setTimeout(() => setSuccessMsg(""), 5000);
        },
        onError: (err) => {
          setErrorMsg(err.response?.data?.message || "Failed to send announcement.");
        },
      }
    );
  };

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6 pb-12 animate-fade-in duration-300">
      {/* Header */}
      <div className="rounded-2xl border border-transparent bg-background/60 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/instructor/courses")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border border-transparent text-foreground hover:text-foreground hover:border-primary transition"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="sr-only">Send Announcement</h1>
            <p className="sr-only">Broadcast real-time push announcements to enrolled students</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        <Card className="p-6 border border-transparent bg-background/60 shadow-lg">
          <div className="flex items-center gap-2.5 mb-6 border-b border-transparent/80 pb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Megaphone size={15} />
            </div>
            <div>
              <h3 className="text-md font-bold text-foreground leading-none">Compose Message</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Select a course and enter your message details</p>
            </div>
          </div>

          {successMsg && (
            <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold p-4 rounded-xl mb-6">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold p-4 rounded-xl mb-6">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {eligibleCourses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <AlertTriangle className="mx-auto text-primary mb-3" size={24} />
              You do not have any published or assigned courses eligible for sending announcements.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Course Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Select Target Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-transparent bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary cursor-pointer"
                >
                  <option value="">-- Choose Course --</option>
                  {eligibleCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <Input
                label="Announcement Title"
                placeholder="e.g. Schedule update or Quiz deadline notice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-[#C1D3C6]! border-[#D9D9D9]! text-black!"
              />

              {/* Message */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Announcement Body Message
                </label>
                <textarea
                  placeholder="Type your announcement message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  required
                  className="w-full resize-none rounded-lg border border-transparent bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={broadcastMutation.isPending}
                  className="flex items-center gap-2 cursor-pointer bg-orange-600 hover:bg-orange-700 text-foreground font-black uppercase tracking-wider text-xs px-6 py-3 rounded-xl transition duration-200"
                >
                  <Send size={13} />
                  <span>{broadcastMutation.isPending ? "Broadcasting..." : "Broadcast Announcement"}</span>
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
