"use client";

export default function ContactForm() {
  return (
    <div className="bg-white p-8 rounded-2xl shadow">
      <h2 className="text-3xl font-bold mb-6">
        Send Message
      </h2>

      <form className="space-y-5">
        <div>
          <label className="block mb-2 font-medium">
            Full Name
          </label>

          <input
            type="text"
            placeholder="Enter your name"
            className="w-full border rounded-lg px-4 py-3"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">
            Email Address
          </label>

          <input
            type="email"
            placeholder="Enter your email"
            className="w-full border rounded-lg px-4 py-3"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">
            Message
          </label>

          <textarea
            placeholder="Write your message..."
            className="w-full border rounded-lg px-4 py-3 h-40"
          />
        </div>

        <button className="bg-orange-500 text-white px-6 py-3 rounded-lg w-full">
          Send Message
        </button>
      </form>
    </div>
  );
}