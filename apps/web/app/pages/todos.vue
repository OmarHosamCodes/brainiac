<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { ref } from "vue";

const { $orpc } = useNuxtApp();

const newTodoText = ref("");
const queryClient = useQueryClient();

const todos = useQuery($orpc.todo.getAll.queryOptions());

onServerPrefetch(async () => {
  try {
    await todos.suspense();
  } catch {}
});

const createMutation = useMutation(
  $orpc.todo.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries();
      newTodoText.value = "";
    },
  }),
);

const toggleMutation = useMutation(
  $orpc.todo.toggle.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries(),
  }),
);

const deleteMutation = useMutation(
  $orpc.todo.delete.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries(),
  }),
);

function handleAddTodo() {
  if (newTodoText.value.trim()) {
    createMutation.mutate({ text: newTodoText.value });
  }
}

function handleToggleTodo(id: number, completed: boolean) {
  toggleMutation.mutate({ id, completed: !completed });
}

function handleDeleteTodo(id: number) {
  deleteMutation.mutate({ id });
}
</script>

<template>
  <UContainer class="py-8 max-w-md">
    <UCard>
      <template #header>
        <div>
          <div class="text-xl font-bold">Todo List</div>
          <div class="text-muted text-sm">Manage your tasks efficiently</div>
        </div>
      </template>

      <form @submit.prevent="handleAddTodo" class="mb-6 flex items-center gap-2">
        <UInput
          v-model="newTodoText"
          placeholder="Add a new task..."
          autocomplete="off"
          class="flex-1"
        />
        <UButton type="submit" :loading="createMutation.isPending.value"> Add </UButton>
      </form>

      <!-- Loading State -->
      <div v-if="todos.status.value === 'pending'" class="space-y-2">
        <USkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
      </div>

      <!-- Error State -->
      <UAlert
        v-else-if="todos.status.value === 'error'"
        color="error"
        icon="i-lucide-alert-circle"
        title="Failed to load todos"
        :description="todos.error.value?.message"
      />

      <!-- Empty State -->
      <UEmpty
        v-else-if="todos.data.value?.length === 0"
        icon="i-lucide-clipboard-list"
        title="No todos yet"
        description="Add your first task above!"
      />

      <!-- Todo List -->
      <ul v-else class="space-y-2">
        <li
          v-for="todo in todos.data.value"
          :key="todo.id"
          class="flex items-center justify-between rounded-md border p-3"
        >
          <div class="flex items-center gap-3">
            <UCheckbox
              :model-value="todo.completed"
              @update:model-value="() => handleToggleTodo(todo.id, todo.completed)"
              :id="`todo-${todo.id}`"
            />
            <label
              :for="`todo-${todo.id}`"
              :class="{ 'line-through text-muted': todo.completed }"
              class="cursor-pointer"
            >
              {{ todo.text }}
            </label>
          </div>
          <UButton
            color="error"
            variant="ghost"
            size="sm"
            square
            @click="handleDeleteTodo(todo.id)"
            aria-label="Delete todo"
            icon="i-lucide-trash-2"
          />
        </li>
      </ul>
    </UCard>
  </UContainer>
</template>
