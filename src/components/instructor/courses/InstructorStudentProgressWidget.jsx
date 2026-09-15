"use client";

import { useInstructorCourseProgress } from "@/hooks/queries/student/useProgress";
import Loader from "@/components/common/Loader";
import Card from "@/components/ui/Card";
import { Users, CheckCircle2, Clock, BarChart3 } from "lucide-react";

export default function InstructorStudentProgressWidget({ courseId }) {
  const { data, isLoading, isError } = useInstructorCourseProgress(courseId);

  if (isLoading) return <Loader />;
  if (isError || !data) return <Card className="p-4 text-muted-foreground text-sm">Unable to load student progress analytics.</Card>;

  const { overview = {}, students = [] } = data;

  return (
    <div className="space-y-6">
      {/* 1. COURSE OVERVIEW METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-md flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-wider text-muted-foreground">Enrolled Students</p>
            <p className="text-2xl font-bold text-foreground">{overview.totalStudents ?? 0}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-md flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-wider text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-foreground">{overview.completedStudents ?? 0}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-md flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-wider text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-foreground">{overview.inProgressStudents ?? 0}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-md flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <BarChart3 size={18} />
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-wider text-muted-foreground">Avg. Completion</p>
            <p className="text-2xl font-bold text-foreground">{overview.avgProgressPercent ?? 0}%</p>
          </div>
        </div>
      </div>

      {/* 2. STUDENT PROGRESS TABLE */}
      <div className="rounded-3xl border border-border/80 bg-card/40 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
            Student Progress Roster
          </h3>
          <span className="text-sm font-bold text-muted-foreground">
            {students.length} {students.length === 1 ? "Student" : "Students"}
          </span>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground italic">
            No students are currently enrolled in this course.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background/80 border-b border-border text-[12px] uppercase font-black tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Progress</th>
                  <th className="px-5 py-3.5">Completed Items</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Last Accessed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {students.map((student) => {
                  const statusColor =
                    student.status === "Completed"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : student.status === "In Progress"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-slate-700/30 text-muted-foreground border-slate-700/50";

                  return (
                    <tr key={student.studentId} className="hover:bg-background/40 transition">
                      <td className="px-5 py-4 font-bold text-foreground">
                        <div>{student.name}</div>
                        <div className="text-[12px] text-muted-foreground font-normal">{student.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex-1 bg-background border border-border rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-300"
                              style={{ width: `${student.progressPercent}%` }}
                            />
                          </div>
                          <span className="font-bold text-primary text-[13px] shrink-0">
                            {student.progressPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-foreground">
                        {student.completedItems} / {student.totalItems} items
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[12px] font-bold border ${statusColor}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {student.lastAccessedAt ? new Date(student.lastAccessedAt).toLocaleDateString() : "Never"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
