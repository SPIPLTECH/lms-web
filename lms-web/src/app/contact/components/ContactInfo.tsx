export default function ContactInfo() {
  return (
    <div className="bg-white p-8 rounded-2xl shadow">
      <h2 className="text-3xl font-bold mb-6">
        Contact Information
      </h2>

      <div className="space-y-6 text-gray-700">
        <div>
          <h3 className="font-semibold text-lg">
            Email
          </h3>

          <p>support@orangetreelms.com</p>
        </div>

        <div>
          <h3 className="font-semibold text-lg">
            Phone
          </h3>

          <p>+91 9876543210</p>
        </div>

        <div>
          <h3 className="font-semibold text-lg">
            Address
          </h3>

          <p>
            Pune, Maharashtra, India
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-lg">
            Support Hours
          </h3>

          <p>
            Monday - Friday | 9:00 AM - 6:00 PM
          </p>
        </div>
      </div>
    </div>
  );
}