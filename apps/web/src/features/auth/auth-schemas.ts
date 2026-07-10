import { z } from "zod";

export const signInFormSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpFormSchema = signInFormSchema.extend({
  name: z.string().trim().max(120).optional(),
});

export type SignInFormValues = z.infer<typeof signInFormSchema>;
export type SignUpFormValues = z.infer<typeof signUpFormSchema>;
