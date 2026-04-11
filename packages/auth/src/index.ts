import { db } from "@brainiac/db";
import * as schema from "@brainiac/db/schema/auth";
import { env } from "@brainiac/env/server";
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: env.POLAR_PRODUCT_PRO,
              slug: "pro",
            },
          ],
          successUrl: "/billing/success?checkout_id={CHECKOUT_ID}",
          authenticatedUsersOnly: true,
          returnUrl: new URL("/pricing", env.CORS_ORIGIN).toString(),
        }),
        portal({
          returnUrl: new URL("/dashboard", env.CORS_ORIGIN).toString(),
        }),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
        }),
      ],
    }),
  ],
});
