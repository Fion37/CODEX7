import { notFound } from "next/navigation";
import { Today } from "@/components/today";
import { Writing } from "@/components/writing";
import { Speaking } from "@/components/speaking";
import { Reading, Listening } from "@/components/drills";
import { DataCenter } from "@/components/data-center";
import { Review } from "@/components/review";
import { Calendar, Report } from "@/components/progress";
import { Settings } from "@/components/settings";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const pages: Record<string, React.ReactNode> = {
    today: <Today />,
    writing: <Writing />,
    speaking: <Speaking />,
    reading: <Reading />,
    listening: <Listening />,
    data: <DataCenter />,
    review: <Review />,
    calendar: <Calendar />,
    report: <Report />,
    settings: <Settings />,
  };
  return pages[section] ?? notFound();
}
