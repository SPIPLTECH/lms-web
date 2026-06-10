import ContactForm from "./components/ContactForm";
import ContactInfo from "./components/ContactInfo";
import ContactHero from "./components/ContactHero";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-100">
      <ContactHero />

      <div className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-2 gap-12">
        <ContactForm />

        <ContactInfo />
      </div>
    </main>
  );
}