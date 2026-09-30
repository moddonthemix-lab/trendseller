import { Assistant } from "@/components/Assistant";
import { PageHeader } from "@/components/ui";

export default function AssistantPage() {
  return (
    <>
      <PageHeader title="AI sourcing assistant" subtitle="Specific products, brands, models and profit ranges — grounded in today's scored market data." />
      <Assistant />
    </>
  );
}
