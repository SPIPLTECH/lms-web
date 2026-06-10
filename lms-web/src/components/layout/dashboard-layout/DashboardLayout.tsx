import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <DashboardSidebar />

      <div className="flex-1">
        <DashboardHeader />

        <main className="p-8 bg-gray-100 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}