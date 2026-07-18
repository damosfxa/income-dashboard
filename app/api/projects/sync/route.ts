import { syncGithubRepos } from "@/lib/github";
import { ok, fail } from "@/lib/response";

export async function POST() {
  try {
    const result = await syncGithubRepos();
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Sync gagal", 500);
  }
}
