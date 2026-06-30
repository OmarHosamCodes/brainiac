import { db } from "@brainiac/db";
import * as schema from "@brainiac/db/schema/auth";
import { corsOrigins, env, primaryCorsOrigin } from "@brainiac/env/server";
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

const loginErrorUrl = new URL("/login", primaryCorsOrigin).toString();
const isSplitDeployment =
  new URL(primaryCorsOrigin).origin !== new URL(env.BETTER_AUTH_URL).origin;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: corsOrigins,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
    // Web and API run on different origins in production; the signed OAuth state
    // cookie set during cross-origin sign-in is not sent on the Google callback.
    skipStateCookieCheck: isSplitDeployment,
  },
  onAPIError: {
    errorURL: loginErrorUrl,
  },
  session: {
    // Cache the resolved session in a signed cookie so `getSession` can verify
    // it without a Postgres lookup. 5 minutes balances freshness against the
    // latency cost of a DB round-trip on every navigation. Mutations that
    // change session state (sign-out, sign-in) refresh the cookie immediately.
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    defaultCookieAttributes: {
      sameSite: env.BETTER_AUTH_URL.startsWith("https://") ? "none" : "lax",
      secure: env.BETTER_AUTH_URL.startsWith("https://"),
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
          returnUrl: new URL("/pricing", primaryCorsOrigin).toString(),
        }),
        portal({
          returnUrl: new URL("/dashboard", primaryCorsOrigin).toString(),
        }),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
        }),
      ],
    }),
  ],
});
