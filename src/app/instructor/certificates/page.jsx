'use client';

import { useState, useMemo } from 'react';
import { Award, ArrowLeft, Search, Plus, Trash2, ShieldAlert, Award as AwardIcon } from 'lucide-react';
import Link from 'next/link';
import useAuth from '@/hooks/useAuth';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loader from '@/components/common/Loader';
import { useToast } from '@/components/ui/ToastProvider';

import { useInstructorCourses } from '@/hooks/queries/instructor/useInstructorCourses';
import { useInstructorCertificates, useDeleteCertificate } from '@/hooks/queries/instructor/useCertificates';

export default function CertificatesDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { data: courses = [], isLoading: loadingCourses } = useInstructorCourses();

  const myCourses = useMemo(() => 
    courses.filter((c) => c.creatorId === user?.id || c.instructorId === user?.id),
    [courses, user?.id]
  );

  const { data: certificates = [], isLoading: loadingCerts } = useInstructorCertificates(user?.id);

  // Filter certificates
  const filteredCerts = useMemo(() => {
    return certificates.filter((cert) => {
      const matchesSearch = 
        (cert.userName || cert.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (cert.userEmail || cert.user?.email || '').toLowerCase().includes(search.toLowerCase());
      
      const matchesCourse = 
        !courseFilter || 
        (cert.courseId === courseFilter) ||
        (cert.course?.id === courseFilter);

      return matchesSearch && matchesCourse;
    });
  }, [certificates, search, courseFilter]);

  const deleteMutation = useDeleteCertificate();

  const handleRevokeConfirm = (id) => {
    deleteMutation.mutate(id, {
      onSuccess: () => setConfirmDeleteId(null),
      onError: (err) => {
        showToast(err.response?.data?.message || 'Failed to revoke certificate.', 'error');
        setConfirmDeleteId(null);
      },
    });
  };

  if (loadingCerts || loadingCourses) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Back Link */}
      <div className="flex flex-col gap-2">
        <Link href="/instructor/courses" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={13} /> Back to My Courses
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4 mt-2">
          <div>
            <h1 className="sr-only">
              Issued Credentials
            </h1>
            <p className="sr-only">Manage and audit certificates granted to students.</p>
          </div>
          <Link href="/instructor/certificates/create">
            <Button className="flex items-center gap-1.5 bg-primary hover:bg-orange-400 text-foreground font-bold text-xs">
              <Plus size={14} strokeWidth={3} /> Certificate Template Builder
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Granted', value: certificates.length, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Active Programs', value: myCourses.length, color: 'text-teal-400', bg: 'bg-teal-500/10' },
          {
            label: 'Issued This Month',
            value: certificates.filter((cert) => {
              if (!cert.issuedAt) return false;
              const issued = new Date(cert.issuedAt);
              const now = new Date();
              return issued.getMonth() === now.getMonth() && issued.getFullYear() === now.getFullYear();
            }).length,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          }
        ].map((kpi, idx) => (
          <Card key={idx} className="p-4 bg-card border-border flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
              <h3 className={`text-xl font-black mt-1 ${kpi.color}`}>{kpi.value}</h3>
            </div>
            <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
              <AwardIcon size={18} className={kpi.color} />
            </div>
          </Card>
        ))}
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={15} />
          <Input
            placeholder="Search by student name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!pl-9 bg-card border-border text-xs text-foreground placeholder-slate-600 focus:border-primary"
          />
        </div>
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="w-full sm:w-64 h-[38px] rounded-xl border border-border !bg-card !px-3 !py-0 text-xs text-foreground outline-none focus:border-primary"
        >
          <option value="">All Courses</option>
          {myCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* Certificates List Grid */}
      <Card className="border-border bg-card overflow-hidden">
        {filteredCerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-[#0A0D1E] text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  <th className="py-3 px-5">Student</th>
                  <th className="py-3 px-5">Course</th>
                  <th className="py-3 px-5">Issue Date</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1F35]/50 text-xs text-foreground">
                {filteredCerts.map((cert) => {
                  const studentName = cert.userName || cert.user?.name || 'Unknown Student';
                  const studentEmail = cert.userEmail || cert.user?.email || '';
                  const courseTitle = cert.courseName || cert.course?.title || 'Unknown Course';
                  const issueDate = cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                  
                  return (
                    <tr key={cert.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3.5 px-5">
                        <div>
                          <p className="font-extrabold text-foreground">{studentName}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{studentEmail}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-muted-foreground">
                        {courseTitle}
                      </td>
                      <td className="py-3.5 px-5 font-medium text-muted-foreground">
                        {issueDate}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {confirmDeleteId === cert.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[9px] text-rose-400 font-extrabold flex items-center gap-1"><ShieldAlert size={11} /> Confirm?</span>
                            <button
                              onClick={() => handleRevokeConfirm(cert.id)}
                              disabled={deleteMutation.isPending}
                              className="text-[10px] font-black text-rose-400 hover:text-rose-300 underline"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[10px] font-black text-muted-foreground hover:text-foreground"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(cert.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/5 transition-all inline-flex items-center"
                            title="Revoke Credential"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Award className="text-slate-600 mb-3" size={32} />
            <h3 className="text-sm font-bold text-muted-foreground">No Credentials Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">No matching certificates found. Expand your search filters or issue a new credential.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
