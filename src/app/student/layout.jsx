import StudentSidebar from "../../components/layouts/StudentSidebar";
import Navbar from "../../components/layouts/Navbar";

export default function StudentLayout({
  children,
}) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <StudentSidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="p-6 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}