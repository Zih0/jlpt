import { grammarData } from "@/data/grammar";
import GrammarDetailClient from "./GrammarDetailClient";

export function generateStaticParams() {
  return grammarData.map((g) => ({ id: g.id }));
}

export default async function GrammarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GrammarDetailClient id={id} />;
}
