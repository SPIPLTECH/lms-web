import Link from "next/link";

export default function FooterLinks() {
  return (
    <div className="flex gap-6 mt-4 md:mt-0">
      <Link href="/about">
        About
      </Link>

      <Link href="/contact">
        Contact
      </Link>

      <Link href="/pricing">
        Pricing
      </Link>
    </div>
  );
}