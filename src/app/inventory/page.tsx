import { Inventory } from "@/components/Inventory";
import { PageHeader } from "@/components/ui";

export default function InventoryPage() {
  return (
    <>
      <PageHeader title="Inventory" subtitle="Track every find from purchase to sale — revenue, profit, ROI, sell-through and unsold value." />
      <Inventory />
    </>
  );
}
