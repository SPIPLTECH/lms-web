type CertificateTemplateProps = {
  studentName: string;
  courseName: string;
};

export default function CertificateTemplate({
  studentName,
  courseName,
}: CertificateTemplateProps) {
  return (
    <div className="border-8 border-orange-500 p-12 bg-white text-center rounded-2xl">
      <h1 className="text-5xl font-bold mb-8">
        Certificate of Completion
      </h1>

      <p className="text-xl mb-4">
        This certificate is proudly presented to
      </p>

      <h2 className="text-4xl font-bold mb-6">
        {studentName}
      </h2>

      <p className="text-lg">
        for successfully completing
      </p>

      <h3 className="text-3xl font-semibold mt-4">
        {courseName}
      </h3>
    </div>
  );
}