import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[72px]">{children}</main>
      <Footer />
    </>
  );
}
