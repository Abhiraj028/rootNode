import z from "zod";


export const createOrgSchema = z.object({
    name: z.string().min(2).max(100, "Name must be between 2 and 100 characters").trim(),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase and can contain hyphens").trim()
});

export type createOrgInterface = z.infer<typeof createOrgSchema>;