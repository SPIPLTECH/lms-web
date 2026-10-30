"use client";

import { useState, useMemo } from "react";
import { Award, Lock, Search } from "lucide-react";

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
  // Locked: a notice only, and no certificates are requested.
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

  // Fallback mock certificates for sandbox testing if none exist in the database
  const displayCertificates = useMemo(() => {
    if (certificates && certificates.length > 0) {
      return certificates;
    }
    
    // Sandbox Mocks
    return [
      {
        id: "mock_cert_1",
        certificateNo: "OT-JV-98421",
        issuedAt: "2026-06-15T00:00:00.000Z",
        course: {
          title: "Java Core Essentials",
          description: "Master object-oriented programming concepts, multithreading, and memory management in Java."
        },
        user: {
          name: user?.name || "Student User",
          email: user?.email || "student@orangelms.com"
        }
      },
      {
        id: "mock_cert_2",
        certificateNo: "OT-WD-38291",
        issuedAt: "2026-07-02T00:00:00.000Z",
        course: {
          title: "Next.js Web Development",
          description: "Build production-ready fullstack applications using server components, route handlers, and Tailwind CSS."
        },
        user: {
          name: user?.name || "Student User",
          email: user?.email || "student@orangelms.com"
        }
      }
    ];
  }, [certificates, user]);

  const filteredCertificates = useMemo(() => {
    const query = search.toLowerCase();
    return displayCertificates.filter((cert) =>
      cert.course?.title?.toLowerCase().includes(query) ||
      cert.certificateNo?.toLowerCase().includes(query)
    );
  }, [displayCertificates, search]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

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
        subtitle="Manage, view, and print your officially earned course completion credentials."
      />

      {/* Info notice about mocks */}
      {(!certificates || certificates.length === 0) && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary flex items-center gap-2 shadow-inner">
          <Award size={16} className="text-primary" />
          <span>
            <strong>Sandbox Mode:</strong> You are viewing sample completion certificates. Earn official credentials by completing course lessons and quizzes.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground pointer-events-none">
          <Search size={16} />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by course title or certificate code..."
          className="
            w-full
            !pl-10
            !pr-4
            py-2.5
            rounded-xl
            border
            border-transparent/80
            bg-background/40
            text-sm
            text-foreground
            placeholder-slate-500
            focus:border-primary/50
            focus:outline-none
            focus:ring-1
            focus:ring-orange-500/20
            transition-all
            duration-300
          "
        />
      </div>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredCertificates.map((cert) => (
          <CertificateCard
            key={cert.id}
            cert={cert}
            onView={setSelectedCert}
            onPrint={(c) => {
              setSelectedCert(c);
              setTimeout(() => handlePrint(), 150);
            }}
          />
        ))}
      </div>

      {filteredCertificates.length === 0 && (
        <Card className="p-12 text-center border-transparent/80">
          <div className="mx-auto w-12 h-12 rounded-full bg-background border border-transparent flex items-center justify-center mb-4 text-muted-foreground">
            <Award size={24} />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No certificates found</h3>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search terms or view your course progress to complete modules.
          </p>
        </Card>
      )}

      {/* Certificate Viewer Modal */}
      <CertificateViewerModal
        cert={selectedCert}
        onClose={() => setSelectedCert(null)}
        onPrint={handlePrint}
      />
    </div>
  );
}
