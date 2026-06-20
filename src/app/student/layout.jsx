import StudentSidebar from "@/components/layouts/StudentSidebar";

export default function StudentLayout({
  children,
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <StudentSidebar />

      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}