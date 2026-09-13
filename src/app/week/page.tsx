import { redirect } from "next/navigation";

export default async function WeekRedirect({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  redirect(start ? `/?start=${encodeURIComponent(start)}` : "/");
}
