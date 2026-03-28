<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

import { getErrorMessage } from "~/utils/get-error-message";

defineEmits<{
    switchToSignUp: [];
}>();

const authClient = useAuthClient();
const toast = useToast();
const loading = ref(false);

const schema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

type Schema = z.output<typeof schema>;

const state = reactive({
    email: "",
    password: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
    loading.value = true;

    try {
        await authClient.signIn.email(
            {
                email: event.data.email,
                password: event.data.password,
            },
            {
                onSuccess: () => {
                    toast.add({
                        title: "Success",
                        description: "Welcome back to your workspace.",
                        color: "success",
                    });
                    navigateTo("/dashboard", { replace: true });
                },
                onError: (error) => {
                    toast.add({
                        title: "Sign in failed",
                        description: error.error.message,
                        color: "error",
                    });
                },
            },
        );
    } catch (error) {
        toast.add({
            title: "An unexpected error occurred",
            description: getErrorMessage(error, "Please try again."),
            color: "error",
        });
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="flex flex-col gap-8">
        <!-- Header -->
        <header>
            <h1
                class="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white"
            >
                Welcome Back
            </h1>
            <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                Enter your credentials to access your infinite workspace.
            </p>
        </header>

        <!-- Form -->
        <UForm
            :schema="schema"
            :state="state"
            class="space-y-6"
            @submit="onSubmit"
        >
            <UFormField name="email" label="Email Address">
                <UInput
                    v-model="state.email"
                    type="email"
                    placeholder="name@company.com"
                    icon="i-lucide-mail"
                    size="lg"
                    class="rounded-xl w-full"
                    :ui="{ base: 'rounded-xl' }"
                />
            </UFormField>

            <UFormField name="password" label="Password" class="w-full">
                <UInput
                    v-model="state.password"
                    type="password"
                    placeholder="••••••••"
                    icon="i-lucide-lock"
                    size="lg"
                    class="rounded-xl w-full"
                    :ui="{ base: 'rounded-xl' }"
                />
            </UFormField>

            <UButton
                type="submit"
                color="success"
                size="xl"
                block
                class="rounded-xl font-bold tracking-wide"
                :loading="loading"
            >
                Sign In
            </UButton>
        </UForm>

        <!-- Footer -->
        <p class="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Don't have an account?
            <ULink
                class="font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
                @click="$emit('switchToSignUp')"
            >
                Sign Up for Free
            </ULink>
        </p>
    </div>
</template>
