import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { SubmissionVerdict } from "@/lib/generated/prisma/client";
import { onBoardUser } from "@/modules/auth/actions";
import { ProfilePage } from "@/modules/profile/components/profile-page";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const dbUser = await onBoardUser();

  if (!dbUser) {
    redirect("/sign-in");
  }

  const [totalSubmissions, acceptedSubmissions, solvedProblemCount, solvedProblems, recentSubmissions, languageActivity] = await Promise.all([
    prisma.submission.count({
      where: { userId: dbUser.id },
    }),
    prisma.submission.count({
      where: {
        userId: dbUser.id,
        verdict: SubmissionVerdict.ACCEPTED,
      },
    }),
    prisma.submission.groupBy({
      by: ["problemId"],
      where: {
        userId: dbUser.id,
        verdict: SubmissionVerdict.ACCEPTED,
      },
      _count: { problemId: true },
    }).then((rows) => rows.length),
    prisma.submission.findMany({
      where: {
        userId: dbUser.id,
        verdict: SubmissionVerdict.ACCEPTED,
      },
      select: {
        problemId: true,
        language: true,
        createdAt: true,
        problem: {
          select: {
            title: true,
            difficulty: true,
          },
        },
      },
      distinct: ["problemId"],
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.submission.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        language: true,
        verdict: true,
        score: true,
        createdAt: true,
        status: true,
        problem: {
          select: {
            title: true,
          },
        },
      },
    }),
    prisma.submission.groupBy({
      by: ["language"],
      where: { userId: dbUser.id },
      _count: { language: true },
      orderBy: {
        _count: {
          language: "desc",
        },
      },
    }),
  ]);

  const displayName =
    [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") ||
    dbUser.username ||
    clerkUser.username ||
    "Coder";

  const username = dbUser.username || clerkUser.username || "coder";

  const profile = {
    id: dbUser.id,
    name: displayName,
    username,
    email: dbUser.email,
    imageUrl: dbUser.imageUrl || clerkUser.imageUrl || null,
    createdAt: dbUser.createdAt,
    totalSubmissions,
    acceptedSubmissions,
    solvedProblems: solvedProblemCount,
    acceptanceRate: totalSubmissions === 0 ? 0 : (acceptedSubmissions / totalSubmissions) * 100,
    solvedProblemList: solvedProblems.map((submission) => ({
      problemId: submission.problemId,
      title: submission.problem?.title ?? "Untitled Problem",
      difficulty: submission.problem?.difficulty ?? "MEDIUM",
      language: submission.language,
      solvedAt: submission.createdAt,
    })),
    recentSubmissions: recentSubmissions.map((submission) => ({
      id: submission.id,
      problemTitle: submission.problem?.title ?? "Problem",
      language: submission.language,
      verdict: submission.verdict,
      score: submission.score,
      status: submission.status,
      createdAt: submission.createdAt,
    })),
    languageActivity: languageActivity.map((entry) => ({
      language: entry.language,
      count: entry._count.language,
    })),
  };

  return <ProfilePage profile={profile} />;
}
