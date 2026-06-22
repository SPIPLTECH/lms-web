import AdminSidebar from "@/layouts/AdminSidebar";
import Navbar from "@/layouts/Navbar";

export default function AdminLayout({
  children,
}) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="p-6 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}