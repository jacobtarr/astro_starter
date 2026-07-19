import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
  contact: defineAction({
    accept: 'form',
    input: z.object({
      firstName: z.string().min(1, 'Please enter your first name.'),
      lastName: z.string().optional(),
      email: z.string().email('Please enter a valid email address.'),
      message: z.string().min(10, 'Message must be at least 10 characters.'),
      agreeToPolicies: z.string().optional(),
    }),
    handler: async (input) => {
      // Send email via Resend, SendGrid, etc.
      // await sendEmail(input);

      return {
        success: true,
        message: "Thanks! I'll get back to you soon.",
      };
    },
  }),
};