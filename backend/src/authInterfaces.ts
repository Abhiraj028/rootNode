import z from "zod";

export const SignUpRequestSchema = z.object({
    name: z.string().min(1,"Name is required").max(255,"Name must be less than 255 characters"),
    email: z.email("Invalid email address"),
    password: z.string().min(4).regex(/^(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter and one number")
})
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;