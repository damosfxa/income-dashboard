import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return fail("Project tidak ditemukan", 404);

  const updated = await prisma.project.update({
    where: { id },
    data: { isActive: !project.isActive },
  });

  return ok({ id: updated.id, isActive: updated.isActive });
}
