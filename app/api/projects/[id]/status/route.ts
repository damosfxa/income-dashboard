import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await request.json();

  if (!["ONGOING", "DONE"].includes(status)) {
    return fail("Status tidak valid", 400);
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return fail("Project tidak ditemukan", 404);

  const updated = await prisma.project.update({
    where: { id },
    data: { status },
  });

  return ok({ id: updated.id, status: updated.status });
}
