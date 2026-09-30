import { Scanner } from "@/components/Scanner";
import { PageHeader } from "@/components/ui";

export default function ScannerPage() {
  return (
    <>
      <PageHeader title="Thrift store scanner" subtitle="Scan a barcode, snap a photo, or search — get BUY / MAYBE / PASS with profit after fees and shipping." />
      <Scanner />
    </>
  );
}
