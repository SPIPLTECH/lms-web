import FooterLinks from "./FooterLinks";

export default function Footer() {
  return (
    <footer className="bg-black text-white py-10 px-8 mt-20">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h2 className="text-2xl font-bold">
          Orange Tree LMS
        </h2>

        <FooterLinks />
      </div>
    </footer>
  );
}