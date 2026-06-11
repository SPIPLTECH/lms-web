export default function AdminSidebar() {
  const menus = [
    "Dashboard",
    "Users",
    "Courses",
    "Reports",
    "Payments",
    "Settings",
  ];

  return (
    <aside className="w-64 min-h-screen bg-black text-white p-6">
      <ul className="space-y-4">
        {menus.map((menu) => (
          <li key={menu}>
            {menu}
          </li>
        ))}
      </ul>
    </aside>
  );
}
