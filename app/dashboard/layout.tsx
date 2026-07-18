import { DashboardNav } from "@/components/ui/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      <main className="flex-1 flex flex-col pb-16 sm:pb-24">
        {children}
      </main>
      <DashboardNav />
    </div>
  );
}
