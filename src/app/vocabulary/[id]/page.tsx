import { vocabularyData } from "@/data/vocabulary";
import VocabDetailClient from "./VocabDetailClient";

export function generateStaticParams() {
  return vocabularyData.map((v) => ({ id: v.id }));
}

export default async function VocabDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VocabDetailClient id={id} />;
}
