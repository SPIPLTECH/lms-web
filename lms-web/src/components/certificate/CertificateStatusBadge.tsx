type CertificateStatusBadgeProps = {
  status: "Issued" | "Pending";
};

export default function CertificateStatusBadge({
  status,
}: CertificateStatusBadgeProps) {
  const color =
    status === "Issued"
      ? "bg-green-500"
      : "bg-yellow-500";

  return (
    <span
      className={`${color} text-white px-4 py-1 rounded-full text-sm`}
    >
      {status}
    </span>
  );
}