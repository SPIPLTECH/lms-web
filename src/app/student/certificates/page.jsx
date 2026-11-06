"use client";

import { useState, useMemo } from "react";
import { Award, Lock, Search, GraduationCap } from "lucide-react";
import Link from "next/link";

import Loader from "@/components/common/Loader";
import PageHeader from "@/components/layouts/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import useCertificates from "@/hooks/queries/student/useCertificates";
import CertificateCard from "@/components/student/certificates/CertificateCard";
import CertificateViewerModal from "@/components/student/certificates/CertificateViewerModal";
import { CERTIFICATES_LOCKED } from "@/constants/features";

export default function StudentCertificatesPage() {
  if (CERTIFICATES_LOCKED) {
    return (
      <div className="space-y-8">
        <PageHeader title="My Certificates" />
        <EmptyState
          icon={Lock}
          title="Certificates are locked"
          description="Course certificates are not available yet. They will appear here once they are enabled."
        />
      </div>
    );
  }

  return <CertificatesList />;
}

function CertificatesList() {
  const { user } = useAuth();
  const { data: certificates = [], isLoading, isError } = useCertificates();

  const [search, setSearch] = useState("");
  const [selectedCert, setSelectedCert] = useState(null);

  const filteredCertificates = useMemo(() => {
    const query = search.toLowerCase();
    return certificates.filter(
      (cert) =>
        cert.course?.title?.toLowerCase().includes(query) ||
        cert.certificateNo?.toLowerCase().includes(query)
    );
  }, [certificates, search]);

  if (isLoading) {
    return <Loader />;
  }

  if (isError) {
    return (
      <Card className="p-8 text-center border-red-500/25 bg-red-500/5">
        <h2 className="text-xl font-semibold text-red-400">
          Unable to load certificates
        </h2>
        <p className="mt-2 text-muted-foreground">
          Please check your connection and try again later.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Certificates"
        subtitle="View, verify, and download your officially earned course completion credentials."
      />

      {/* Toolbar / Search (only show if student has certificates) */}
      {certificates.length > 0 && (
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course title or certificate credential ID..."
            className="
              w-full
              !pl-10
              !pr-4
              py-2.5
              rounded-xl
              border
              border-border
              bg-card
              text-sm
              text-foreground
              placeholder-slate-500
              focus:border-primary
              focus:outline-none
              transition-all
            "
          />
        </div>
      )}

      {/* Certificates Grid */}
      {filteredCertificates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredCertificates.map((cert) => (
            <CertificateCard
              key={cert.id}
              cert={cert}
              onView={setSelectedCert}
            />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/80 bg-card/50 rounded-2xl">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
            <GraduationCap size={28} />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            No Certificates Earned Yet
          </h3>
          <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            You will automatically receive an official completion certificate as soon as you complete 100% of the lessons, quizzes, and assignments in any certificate-enabled course.
          </p>
          <div className="mt-6">
            <Link
              href="/student/my-courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-orange-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-sm"
            >
              Continue Learning in My Courses
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-10 text-center border-border bg-card/50 rounded-2xl">
          <Award size={24} className="mx-auto text-muted-foreground mb-2" />
          <h3 className="text-sm font-bold text-foreground">
            No certificates matched "{search}"
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search query.
          </p>
        </Card>
      )}

      {/* Certificate Viewer & Download Modal */}
      <CertificateViewerModal
        cert={selectedCert}
        onClose={() => setSelectedCert(null)}
      />
    </div>
  );
}
