import { readingData } from "@/data/reading";
import ReadingDetailClient from "./ReadingDetailClient";

export function generateStaticParams() {
  return readingData.map((r) => ({ id: r.id }));
}

export default async function ReadingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReadingDetailClient id={id} />;
}
