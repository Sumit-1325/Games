import { notFound } from "next/navigation";
import { getDb } from "@cogniarena/db";
import { TutorialFlow } from "@/components/TutorialFlow";
import { getCurrentUser } from "@/lib/server/current-user";
import { getProgress } from "@/lib/server/sessions";

export default async function TutorialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "grid-recall") notFound();
  const user = await getCurrentUser();
  const done = user ? (await getProgress(getDb(), user.id, slug)).tutorialCompleted : false;
  return (
    <div className="flex flex-1 justify-center pt-2">
      <TutorialFlow alreadyCompleted={done} />
    </div>
  );
}
