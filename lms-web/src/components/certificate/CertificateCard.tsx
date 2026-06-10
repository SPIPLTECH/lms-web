type CertificateCardProps = {
  title: string;
  issuedDate: string;
};

export default function CertificateCard({
  title,
  issuedDate,
}: CertificateCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold mb-2">
        {title}
      </h2>

      <p className="text-gray-600">
        Issued On: {issuedDate}
      </p>
    </div>
  );
}