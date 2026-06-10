import Link from "next/link";

export default function NavbarLinks() {
  return (
    <div className="flex gap-6">
      <Link href="/">Home</Link>

      <Link href="/courses">
        Courses
      </Link>

      <Link href="/pricing">
        Pricing
      </Link>

      <Link href="/about">
        About
      </Link>

      <Link href="/contact">
        Contact
      </Link>
    </div>
  );
}