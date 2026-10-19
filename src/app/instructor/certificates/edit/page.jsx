"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, User, BookOpen, Calendar, Edit3, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

import { useInstructorCourses } from "@/hooks/queries/instructor/useInstructorCourses";
import { useCourseStudents } from "@/hooks/queries/instructor/useCourseStudents";
import { useInstructorCertificates, useUpdateCertificate } from "@/hooks/queries/instructor/useCertificates";

export default function UpdateCertificatePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [selectedCertId, setSelectedCertId] = useState("");
  
  // Form state
  const [courseId, setCourseId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: certificates = [], isLoading: loadingCerts } = useInstructorCertificates(user?.id);

  const { data: courses = [], isLoading: loadingCourses } = useInstructorCourses();
  const myCourses = courses.filter((c) => c.creatorId === user?.id && c.status === "PUBLISHED");

  const { data: students = [], isLoading: loadingStudents } = useCourseStudents(courseId);

  // Pre-fill form when certificate is selected
  useEffect(() => {
    if (selectedCertId) {
      const cert = certificates.find((c) => c.id === selectedCertId);
      if (cert) {
        setCourseId(cert.course?.id || "");
        setStudentId(cert.student?.id || cert.user?.id || "");
        if (cert.issuedAt || cert.createdAt) {
          setIssuedAt(new Date(cert.issuedAt || cert.createdAt).toISOString().split("T")[0]);
        }
      }
    } else {
      setCourseId("");
      setStudentId("");
      setIssuedAt("");
    }
  }, [selectedCertId, certificates]);

  const updateMutation = useUpdateCertificate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCertId || !courseId || !studentId || !issuedAt) {
      setErrorMsg("Please fill all required fields.");
      return;
    }
    updateMutation.mutate(
      {
        certificateId: selectedCertId,
        data: {
          courseId,
          userId: studentId,
          issuedAt: new Date(issuedAt).toISOString(),
        },
      },
      {
        onSuccess: () => {
          setSuccessMsg("Certificate updated successfully!");
          setErrorMsg("");
          setTimeout(() => router.push("/instructor/courses"), 2000);
        },
        onError: (err) => {
          setErrorMsg(err.response?.data?.message || "Failed to update certificate. The API might not be fully configured yet.");
          setSuccessMsg("");
        },
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/instructor/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft size={16} /> Back to My Courses
      </Link>

      <div>
        <h1 className="sr-only">
          Update Certificate
        </h1>
        <p className="sr-only">Modify the details of an existing credential.</p>
      </div>

      <Card className="p-6 md:p-8 border-border bg-card">
        {successMsg ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Success!</h2>
              <p className="text-muted-foreground mt-1">{successMsg}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Redirecting to dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {errorMsg}
              </div>
            )}

            {/* Certificate Selection */}
            <div className="space-y-2 pb-6 border-b border-border">
              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                <Search size={16} className="text-blue-400" /> Select Certificate to Edit
              </label>
              {loadingCerts ? (
                <div className="h-12 flex items-center px-4 rounded-xl bg-background/50 border border-transparent text-muted-foreground text-sm">
                  Loading certificates...
                </div>
              ) : (
                <select
                  value={selectedCertId}
                  onChange={(e) => setSelectedCertId(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-background/50 border border-transparent text-foreground focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                  required
                >
                  <option value="">-- Choose a certificate --</option>
                  {certificates.map((c) => {
                    const sName = c.student?.name || c.user?.name || "Student";
                    const cTitle = c.course?.title || "Course";
                    const certNo = c.certificateNo || c.id?.substring(0,8);
                    return (
                      <option key={c.id} value={c.id}>
                        {sName} - {cTitle} ({certNo})
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {selectedCertId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                
                {/* Course Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-400" /> Update Course
                  </label>
                  {loadingCourses ? (
                    <div className="h-12 flex items-center px-4 rounded-xl bg-background/50 border border-transparent text-muted-foreground text-sm">
                      Loading courses...
                    </div>
                  ) : (
                    <select
                      value={courseId}
                      onChange={(e) => {
                        setCourseId(e.target.value);
                        setStudentId(""); // reset student when course changes
                      }}
                      className="w-full h-12 px-4 rounded-xl bg-background/50 border border-transparent text-foreground focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                      required
                    >
                      <option value="">-- Choose a course --</option>
                      {myCourses.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Student Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <User size={16} className="text-blue-400" /> Update Student
                  </label>
                  {!courseId ? (
                    <div className="h-12 flex items-center px-4 rounded-xl bg-background/50 border border-transparent/50 text-slate-600 text-sm italic">
                      Select a course first to load students.
                    </div>
                  ) : loadingStudents ? (
                    <div className="h-12 flex items-center px-4 rounded-xl bg-background/50 border border-transparent text-muted-foreground text-sm">
                      Loading students...
                    </div>
                  ) : students.length === 0 ? (
                    <div className="h-12 flex items-center px-4 rounded-xl bg-background/50 border border-transparent text-muted-foreground text-sm">
                      No students found in this course.
                      {studentId && <span className="ml-2 text-blue-400">(Selected student ID: {studentId})</span>}
                    </div>
                  ) : (
                    <select
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-background/50 border border-transparent text-foreground focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none"
                      required
                    >
                      <option value="">-- Choose a student --</option>
                      {students.map((s) => (
                        <option key={s.id || s.user?.id} value={s.id || s.user?.id}>
                          {s.name || s.user?.name || s.email || s.user?.email}
                        </option>
                      ))}
                      {/* Fallback option if pre-filled student is not in the loaded array yet */}
                      {studentId && !students.some(s => (s.id || s.user?.id) === studentId) && (
                        <option value={studentId}>Current Student (ID: {studentId})</option>
                      )}
                    </select>
                  )}
                </div>

                {/* Issue Date */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Calendar size={16} className="text-blue-400" /> Update Issue Date
                  </label>
                  <Input
                    type="date"
                    value={issuedAt}
                    onChange={(e) => setIssuedAt(e.target.value)}
                    required
                    className="w-full focus:border-blue-500/50 focus:ring-blue-500/20"
                  />
                </div>

                <div className="pt-4 border-t border-border">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || !courseId || !studentId}
                    className="w-full h-12 text-base font-bold flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {updateMutation.isPending ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Edit3 size={18} />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}
      </Card>
    </div>
  );
}
