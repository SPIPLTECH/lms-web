import CertificateCard from "./CertificateCard";

export default function CertificateList() {
  const certificates = [
    {
      title: "React Masterclass Certificate",
      issuedDate: "10 June 2026",
    },

    {
      title: "Node.js Backend Certificate",
      issuedDate: "15 June 2026",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {certificates.map((certificate) => (
        <CertificateCard
          key={certificate.title}
          title={certificate.title}
          issuedDate={certificate.issuedDate}
        />
      ))}
    </div>
  );
}