'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  AlertTriangle, ArrowLeft, Loader2,
  Download, Award, Edit3, PlusCircle, CheckCircle
} from 'lucide-react';

import { useStudents } from '@/hooks/queries/instructor/useStudents';
import { useInstructorCourses } from '@/hooks/queries/instructor/useInstructorCourses';
import LearningHealthPanel from '@/components/instructor/analytics/LearningHealthPanel';
import { createCertificate, downloadCertificatePdf } from '@/services/certificate.service';

function StudentsDirectoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { data: students = [], isLoading, isError } = useStudents();
  const { data: courses = [] } = useInstructorCourses();

  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('Progress'); // Progress | Assignments | Certificates

  const queryClient = useQueryClient();
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certFormData, setCertFormData] = useState({
    courseId: '',
    grade: '',
    score: '',
    performanceDescription: '',
    instructorRemarks: '',
  });
  const [savingCert, setSavingCert] = useState(false);
  const [certError, setCertError] = useState('');
  const [downloadingCertId, setDownloadingCertId] = useState(null);

  const selectedCourse = courseFilter === 'All' ? null : courses.find((c) => c.id === courseFilter);
  // The filter should only offer courses students can actually be viewed
  // against day-to-day — a DRAFT/ARCHIVED course isn't a live teaching
  // context, even though `courses` itself (from useInstructorCourses) still
  // includes them for other uses like resolving selectedCourse's title.
  const publishedCourses = courses.filter((c) => c.status === 'PUBLISHED');

  const handleCourseFilterChange = (value) => {
    setCourseFilter(value);
  };

  // Parse studentId parameter from URL (drilldown from dashboard)
  useEffect(() => {
    const studentIdParam = searchParams.get('studentId');
    if (studentIdParam) {
      setSelectedStudentId(studentIdParam);
    }
  }, [searchParams]);

  // Progress and status for a row: the student's standing in the selected
  // course when the list is filtered to one, otherwise across all of this
  // instructor's courses (the backend picks the most urgent status there).
  const standingOf = (student) =>
    courseFilter === 'All'
      ? { progress: student.progress ?? 0, status: student.status || 'Not Started' }
      : student.courseProgress?.[courseFilter] ?? { progress: 0, status: 'Not Started' };

  // Filter students list
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return students.filter(student => {
      const isStudentRole = !student.role || student.role === 'STUDENT';
      // Search every course the student is enrolled in, not only the first one
      // that happens to be shown in the Course column.
      const courseTitles = (student.courses || []).map((c) => c.title || '');
      const matchesSearch = (student.name || '').toLowerCase().includes(q) ||
                            (student.email || '').toLowerCase().includes(q) ||
                            (student.course || '').toLowerCase().includes(q) ||
                            courseTitles.some((t) => t.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'All' || standingOf(student).status === statusFilter;
      // Match on the full enrollment list by id. Comparing student.course (the
      // first enrollment's title) against the selected course hid anyone whose
      // first enrollment wasn't the one being filtered for.
      const matchesCourse = courseFilter === 'All' ||
                            (student.courseIds || []).includes(courseFilter);

      return isStudentRole && matchesSearch && matchesStatus && matchesCourse;
    });
    // standingOf only reads courseFilter, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, searchQuery, statusFilter, courseFilter]);

  // Selected student details object
  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const handleSelectStudent = (id) => {
    setSelectedStudentId(id);
    // Update query params without reloading
    const params = new URLSearchParams(window.location.search);
    params.set('studentId', id);
    router.replace(`/instructor/students?${params.toString()}`);
  };

  const handleBackToList = () => {
    setSelectedStudentId(null);
    router.replace('/instructor/students');
  };

  const handleOpenCertModal = (cert = null) => {
    setCertError('');
    if (cert) {
      setCertFormData({
        courseId: cert.courseId || (selectedStudent?.courses?.[0]?.id || ''),
        grade: cert.grade || '',
        score: cert.score !== undefined && cert.score !== null ? String(cert.score) : '',
        performanceDescription: cert.performanceDescription || '',
        instructorRemarks: cert.instructorRemarks || '',
      });
    } else {
      const completedCourse = selectedStudent?.courses?.find((c) => c.completed) || selectedStudent?.courses?.[0];
      setCertFormData({
        courseId: completedCourse?.id || '',
        grade: 'A',
        score: '95',
        performanceDescription: 'Completed with Distinction',
        instructorRemarks: 'Demonstrated outstanding dedication and mastery of course objectives.',
      });
    }
    setCertModalOpen(true);
  };

  const handleSaveCertificate = async (e) => {
    e.preventDefault();
    if (!certFormData.courseId) {
      setCertError('Please select a course.');
      return;
    }
    setSavingCert(true);
    setCertError('');
    try {
      await createCertificate({
        courseId: certFormData.courseId,
        studentId: selectedStudent.id,
        grade: certFormData.grade || null,
        score: certFormData.score ? parseInt(certFormData.score, 10) : null,
        performanceDescription: certFormData.performanceDescription || null,
        instructorRemarks: certFormData.instructorRemarks || null,
        brandingName: 'Course Ranger',
        brandingPoweredBy: 'Course Powered By SPIPL',
      });
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      setCertModalOpen(false);
    } catch (err) {
      setCertError(err.response?.data?.message || err.message || 'Failed to save certificate');
    } finally {
      setSavingCert(false);
    }
  };

  const handleDownloadCert = async (cert) => {
    setDownloadingCertId(cert.id);
    try {
      await downloadCertificatePdf(cert.id, `certificate-${cert.code || cert.id}.pdf`);
    } catch (err) {
      console.error('Failed to download certificate PDF:', err);
    } finally {
      setDownloadingCertId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen text-foreground flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-primary" size={24} />
          <span className="text-xs font-black text-slate-450 uppercase tracking-widest font-mono">Loading Students...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen text-foreground flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertTriangle className="text-red-500" size={24} />
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest font-mono">Failed to load students</span>
          <p className="text-[10px] text-muted-foreground">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    // -mt/pt: pulls up into DashboardLayout's top padding (p-2 / sm:p-6 /
    // md:p-16) and re-pads it compactly so the header sits close under the
    // navbar, same as /instructor/qa; the side padding is left alone.
    <div className="-mt-2 sm:-mt-6 md:-mt-16 pt-3 sm:pt-6 min-h-screen text-foreground flex flex-col gap-6 bg-background pb-10">

      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          {selectedStudentId && (
            <button
              onClick={handleBackToList}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-slate-150 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <div>
            <h1 className="text-sm font-black text-muted-foreground uppercase tracking-widest font-mono">
              {selectedStudentId ? 'Student Profile' : 'Student Directory'}
            </h1>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              {selectedStudentId ? `Viewing ${selectedStudent?.name}` : `${filteredStudents.length} ${filteredStudents.length === 1 ? "Student" : "Students"} Active`}
            </p>
          </div>
        </div>
      </div>

      {selectedStudent ? (
        /* DETAIL VIEW: Filtered Student List -> Student Details -> Progress -> Assignments -> Certificates */
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
          
          {/* Profile Sidebar Info */}
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-5">
            <div className="flex flex-col items-center text-center pb-4 border-b border-border">
              <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 text-orange-450 flex items-center justify-center text-xl font-black mb-3">
                {selectedStudent.name[0]}
              </div>
              <h2 className="text-sm font-black text-foreground">{selectedStudent.name}</h2>
              <p className="text-[9px] font-extrabold text-primary uppercase tracking-wider mt-1">{selectedStudent.status}</p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Email Address</p>
                <p className="text-foreground font-semibold mt-0.5 truncate">{selectedStudent.email}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Member Since</p>
                <p className="text-muted-foreground font-semibold mt-0.5">{selectedStudent.joinedDate}</p>
              </div>

              {/* Enrolled Courses & Access Validity */}
              <div className="pt-2 border-t border-border/60">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider mb-2">Enrolled Courses & Validity</p>
                <div className="space-y-2">
                  {(selectedStudent.courses || []).map((c) => {
                    const cp = selectedStudent.courseProgress?.[c.id];
                    const enrolledAt = cp?.enrolledAt || c.enrolledAt;
                    const expiresAt = cp?.expiresAt || c.expiresAt;
                    const isExpired = cp?.isExpired ?? c.isExpired ?? false;
                    const remainingDays = cp?.remainingDays ?? c.remainingDays;

                    return (
                      <div key={c.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-border/60 space-y-1">
                        <p className="font-bold text-foreground text-[11px] leading-tight">{c.title}</p>
                        {enrolledAt && (
                          <p className="text-[9.5px] text-muted-foreground">
                            Enrolled: <span className="text-slate-300 font-medium">{new Date(enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </p>
                        )}
                        <div className="pt-0.5">
                          {expiresAt ? (
                            isExpired ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                <span>Expired on {new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                <span>Expires {new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                {remainingDays != null && <span>({remainingDays}d remaining)</span>}
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">
                              <span>Lifetime / Unlimited</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button 
              onClick={handleBackToList}
              className="w-full text-center py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10.5px] font-black transition cursor-pointer"
            >
              Back to Directory
            </button>
          </div>

          {/* Details & Tab contents */}
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-5">
            
            {/* Tabs Selector */}
            <div className="flex gap-4 border-b border-border pb-1">
              {['Progress', 'Assignments', 'Certificates'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2.5 px-1 text-xs font-black transition relative cursor-pointer ${
                    activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-slate-350'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div>
              {activeTab === 'Progress' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-white/[0.01] border border-border rounded-xl text-center">
                      <p className="text-[9px] text-muted-foreground font-black uppercase">Overall Progress</p>
                      <p className="text-lg font-black text-foreground mt-1">{selectedStudent.progress}%</p>
                    </div>
                    <div className="p-3 bg-white/[0.01] border border-border rounded-xl text-center">
                      <p className="text-[9px] text-muted-foreground font-black uppercase">Assignments Done</p>
                      {/* null = the course has no assignments to do. */}
                      <p className="text-lg font-black text-foreground mt-1">
                        {selectedStudent.assignmentRate != null ? `${selectedStudent.assignmentRate}%` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Modules detail */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest font-mono">Module Completion</h3>
                    <div className="space-y-3">
                      {!selectedStudent.modules || selectedStudent.modules.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-6 text-center">Module-level completion data is not available yet</p>
                      ) : (
                        selectedStudent.modules.map((mod, idx) => (
                          <div key={idx} className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-extrabold text-slate-250 truncate max-w-[350px]">{mod.name}</span>
                              <span className={`text-[8.5px] font-black px-2 py-0.5 rounded ${
                                mod.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-amber-500/10 text-amber-450'
                              }`}>{mod.status}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${mod.progress}%` }} />
                              </div>
                              <span className="text-[9.5px] font-bold text-muted-foreground">{mod.progress}%</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Assignments' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest font-mono mb-2">Assignment Grades</h3>
                  <div className="space-y-2.5">
                    {selectedStudent.assignments.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">No assignments assigned yet</p>
                    ) : (
                      selectedStudent.assignments.map((as) => (
                        <div key={as.id} className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <p className="font-extrabold text-slate-250 leading-tight">{as.title}</p>
                            <p className="text-[9px] text-muted-foreground mt-1 font-semibold">Due/Submitted: {as.date}</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <span className={`text-[8.5px] font-black px-2 py-0.5 rounded inline-block ${
                              as.status === 'Graded' 
                                ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
                                : as.status === 'Overdue' 
                                ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20' 
                                : 'bg-amber-500/10 text-amber-450 border border-amber-500/20'
                            }`}>
                              {as.status}
                            </span>
                            {as.score !== null && (
                              // Grades are free text ("A", "9", "8/10") — show them as written.
                              <p className="text-[11.5px] font-black text-slate-250 mt-1.5">
                                {as.maxScore ? `${as.score} / ${as.maxScore}` : `Grade ${as.score}`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'Certificates' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest font-mono">Issued Certificates</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Manage and customize course completion credentials for this student.</p>
                    </div>
                    <button
                      onClick={() => handleOpenCertModal()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-slate-950 font-bold text-xs hover:bg-orange-600 transition shadow-sm cursor-pointer"
                    >
                      <PlusCircle size={13} />
                      Issue / Customize Certificate
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedStudent.certificates.length === 0 ? (
                      <div className="py-12 border border-dashed border-border rounded-xl text-center flex flex-col items-center justify-center">
                        <span className="text-2xl mb-1.5">📜</span>
                        <p className="text-xs font-black text-muted-foreground">No Certificates Issued Yet</p>
                        <p className="text-[10px] text-muted-foreground max-w-[240px] mt-1 leading-normal">
                          Student has not yet received a certificate. Click "Issue / Customize Certificate" once course requirements are completed.
                        </p>
                      </div>
                    ) : (
                      selectedStudent.certificates.map((cert) => (
                        <div key={cert.id} className="p-4 bg-white/[0.01] border border-border/60 hover:border-border rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Award size={15} className="text-primary" />
                              <p className="font-extrabold text-foreground">{cert.title}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="font-mono font-semibold">ID: {cert.code}</span>
                              <span>•</span>
                              <span>Issued: {cert.date}</span>
                              {cert.grade && (
                                <>
                                  <span>•</span>
                                  <span className="font-bold text-primary">Grade: {cert.grade}</span>
                                </>
                              )}
                              {cert.score !== null && cert.score !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="font-bold text-foreground">Score: {cert.score}%</span>
                                </>
                              )}
                            </div>
                            {cert.performanceDescription && (
                              <p className="text-[10px] text-muted-foreground italic mt-0.5">
                                Performance: "{cert.performanceDescription}"
                              </p>
                            )}
                            {cert.instructorRemarks && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Remarks: {cert.instructorRemarks}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => handleOpenCertModal(cert)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground text-[11px] font-semibold transition cursor-pointer"
                            >
                              <Edit3 size={11} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDownloadCert(cert)}
                              disabled={downloadingCertId === cert.id}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary hover:bg-orange-600 text-slate-950 text-[11px] font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              {downloadingCertId === cert.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Download size={11} />
                              )}
                              Download PDF
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Certificate Customization Modal */}
                  {certModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
                      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                            <Award size={16} className="text-primary" />
                            Issue / Customize Certificate
                          </h4>
                          <button
                            type="button"
                            onClick={() => setCertModalOpen(false)}
                            className="text-muted-foreground hover:text-foreground text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>

                        {certError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs">
                            {certError}
                          </div>
                        )}

                        <form onSubmit={handleSaveCertificate} className="space-y-3.5 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                              Course *
                            </label>
                            <select
                              value={certFormData.courseId}
                              onChange={(e) => setCertFormData((prev) => ({ ...prev, courseId: e.target.value }))}
                              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:border-primary"
                              required
                            >
                              <option value="">Select a course</option>
                              {(selectedStudent.courses || []).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.title} {c.completed ? '(Completed)' : `(${c.progressPercent || 0}% progress)`}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                                Grade (e.g. A+, 95%)
                              </label>
                              <input
                                type="text"
                                placeholder="A+"
                                value={certFormData.grade}
                                onChange={(e) => setCertFormData((prev) => ({ ...prev, grade: e.target.value }))}
                                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                                Score % (Numeric)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="95"
                                value={certFormData.score}
                                onChange={(e) => setCertFormData((prev) => ({ ...prev, score: e.target.value }))}
                                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:border-primary"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                              Performance Description
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Completed with Distinction"
                              value={certFormData.performanceDescription}
                              onChange={(e) => setCertFormData((prev) => ({ ...prev, performanceDescription: e.target.value }))}
                              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:border-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                              Instructor Remarks / Memo
                            </label>
                            <textarea
                              rows={3}
                              placeholder="e.g. Demonstrated exceptional problem-solving and full mastery of curriculum."
                              value={certFormData.instructorRemarks}
                              onChange={(e) => setCertFormData((prev) => ({ ...prev, instructorRemarks: e.target.value }))}
                              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:border-primary"
                            />
                          </div>

                          <div className="p-3 bg-muted/40 rounded-xl space-y-1 text-[10px] text-muted-foreground">
                            <p><span className="font-bold">Branding:</span> Course Ranger</p>
                            <p><span className="font-bold">Attribution:</span> Course Powered By SPIPL</p>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            <button
                              type="button"
                              onClick={() => setCertModalOpen(false)}
                              className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={savingCert}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-orange-600 text-slate-950 text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                            >
                              {savingCert && <Loader2 size={12} className="animate-spin" />}
                              Issue / Update Certificate
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        /* DIRECTORY LIST VIEW */
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
          
          {/* Controls: Search & Status Filters */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-550">
                <Search size={13} />
              </span>
              <input
                type="text"
                placeholder="Search students, email, course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.02] border border-border text-xs !pl-8 !pr-3.5 py-2 rounded-xl outline-none text-foreground placeholder-slate-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
              {/* 'Attendance Alert' dropped alongside the Attendance column — it matched
                  no student, since status is never set to it. Re-add it to this list if
                  attendance tracking lands. */}
              {/* Every student lands in exactly one of these — see
                  classifyStudent in the backend students service. */}
              {['All', 'Not Started', 'On Track', 'Behind Average', 'Struggling', 'Top Performer'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition whitespace-nowrap cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-primary/10 border border-primary/20 text-orange-450'
                      : 'bg-white/[0.02] border border-border text-muted-foreground hover:text-slate-350'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Controls: Course & Batch Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-64">
              <label className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Course</label>
              <select
                value={courseFilter}
                onChange={(e) => handleCourseFilterChange(e.target.value)}
                className="w-full bg-white/[0.02] border border-border text-xs px-3.5 py-2 rounded-xl outline-none text-foreground focus:border-transparent transition cursor-pointer"
              >
                <option value="All">All Courses</option>
                {publishedCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto my-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[9.5px] font-black text-muted-foreground uppercase tracking-widest">
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Course</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-center">Course Progress</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1F35]/50">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-muted-foreground">
                      No students found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const standing = standingOf(student);
                    return (
                    <tr key={student.id} className="hover:bg-white/[0.01] transition">
                      <td className="py-4 pl-2">
                        <div className="font-extrabold text-slate-250">{student.name}</div>
                        <div className="text-[9.5px] text-muted-foreground font-semibold mt-0.5">{student.email}</div>
                      </td>
                      {/* When filtering by a course, show that course rather than the
                          student's first enrollment — otherwise a row matched on BGMI
                          would display some unrelated course title. */}
                      <td className="py-4 text-slate-350 font-semibold">
                        <div>
                          {selectedCourse ? selectedCourse.title : student.course}
                          {!selectedCourse && (student.courses?.length || 0) > 1 && (
                            <span className="text-muted-foreground font-medium"> +{student.courses.length - 1}</span>
                          )}
                        </div>
                        {(() => {
                          const activeCourseProgress = selectedCourse ? student.courseProgress?.[selectedCourse.id] : null;
                          const courseWithExpiry = activeCourseProgress || (student.courses || []).find((c) => c.expiresAt) || student.courses?.[0];
                          if (!courseWithExpiry || !courseWithExpiry.expiresAt) return null;
                          return (
                            <div className="flex items-center gap-1.5 mt-1 text-[9.5px]">
                              {courseWithExpiry.isExpired ? (
                                <span className="text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                  Expired
                                </span>
                              ) : (
                                <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  {courseWithExpiry.remainingDays != null ? `${courseWithExpiry.remainingDays}d left` : 'Active'}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`text-[7.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                          standing.status === 'Top Performer'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : standing.status === 'Not Started'
                            ? 'bg-muted text-muted-foreground border border-border'
                            : standing.status === 'Struggling'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : standing.status === 'Behind Average'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                        }`}>
                          {standing.status}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className="h-1.5 w-16 bg-muted rounded-full overflow-hidden hidden sm:block"
                            role="progressbar"
                            aria-valuenow={standing.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, standing.progress))}%` }}
                            />
                          </div>
                          <span className="font-bold text-foreground tabular-nums">{standing.progress}%</span>
                        </div>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <button
                          onClick={() => handleSelectStudent(student.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 border border-orange-550/20 text-orange-450 text-[10px] font-black transition cursor-pointer"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEARNING HEALTH: who in the selected course needs a check-in and why
          (level plus named reasons, never a raw score). One course at a time,
          so it appears once a course is chosen; keyed by course so switching
          course starts it fresh. */}
      {!selectedStudent && selectedCourse && (
        <LearningHealthPanel key={selectedCourse.id} courseId={selectedCourse.id} />
      )}
    </div>
  );
}

export default function StudentsDirectoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-foreground flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-primary" size={24} />
          <span className="text-xs font-black text-slate-450 uppercase tracking-widest font-mono">Loading Directory...</span>
        </div>
      </div>
    }>
      <StudentsDirectoryContent />
    </Suspense>
  );
}
