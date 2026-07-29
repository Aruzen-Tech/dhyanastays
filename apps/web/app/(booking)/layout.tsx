import Navbar from "@/app/components/Navbar";

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">{children}</main>
    </>
  );
}
