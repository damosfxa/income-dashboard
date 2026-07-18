import { prisma } from "@/lib/prisma";

interface GithubRepo {
  id: number;
  name: string;
  html_url: string;
  homepage: string | null;
}

export async function syncGithubRepos() {
  const username = process.env.GITHUB_USERNAME;
  const token = process.env.GITHUB_TOKEN;

  if (!username) {
    throw new Error("GITHUB_USERNAME belum diset di .env");
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };

  // Kalau ada token, pakai endpoint /user/repos (akun sendiri) biar repo privat ikut kebaca.
  // Tanpa token, fallback ke endpoint publik /users/:username/repos.
  const url = token
    ? "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner"
    : `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`;

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const repos: GithubRepo[] = await res.json();

  let newProjects = 0;
  let updatedProjects = 0;

  for (const repo of repos) {
    const existing = await prisma.project.findUnique({
      where: { githubRepoId: repo.id },
    });

    if (existing) {
      await prisma.project.update({
        where: { id: existing.id },
        data: {
          name: repo.name,
          githubUrl: repo.html_url,
          liveUrl: repo.homepage || existing.liveUrl,
          lastSyncedAt: new Date(),
        },
      });
      updatedProjects++;
    } else {
      await prisma.project.create({
        data: {
          githubRepoId: repo.id,
          name: repo.name,
          githubUrl: repo.html_url,
          liveUrl: repo.homepage || null,
          lastSyncedAt: new Date(),
        },
      });
      newProjects++;
    }
  }

  return { newProjects, updatedProjects, totalRepos: repos.length };
}