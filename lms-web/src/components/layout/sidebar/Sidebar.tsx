import SidebarItem from "./SidebarItem";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white shadow h-screen p-6">
      <div className="space-y-4">
        <SidebarItem label="Dashboard" />

        <SidebarItem label="Courses" />

        <SidebarItem label="Assignments" />

        <SidebarItem label="Analytics" />
      </div>
    </aside>
  );
}