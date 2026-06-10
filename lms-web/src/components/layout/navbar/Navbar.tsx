import NavbarLogo from "./NavbarLogo";
import NavbarLinks from "./NavbarLinks";

export default function Navbar() {
  return (
    <nav className="bg-white shadow px-8 py-4 flex items-center justify-between">
      <NavbarLogo />

      <NavbarLinks />
    </nav>
  );
}