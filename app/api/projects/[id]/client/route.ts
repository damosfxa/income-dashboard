import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { clientId } = await request.json();

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return fail("Project tidak ditemukan", 404);

  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return fail("Client tidak ditemukan", 404);
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { clientId: clientId || null },
  });

  return ok({ id: updated.id, clientId: updated.clientId });
}
