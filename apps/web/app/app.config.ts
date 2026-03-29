export default defineAppConfig({
  ui: {
    colors: {
      primary: "emerald",
      neutral: "zinc",
    },
    button: {
      slots: {
        base: "rounded-full font-bold",
      },
    },
    badge: {
      slots: {
        base: "rounded-full font-bold",
      },
    },
    card: {
      slots: {
        root: "rounded-[32px] border-muted/20",
      },
    },
    input: {
      slots: {
        base: "rounded-2xl font-bold",
      },
    },
    select: {
      slots: {
        base: "rounded-2xl font-bold",
      },
    },
  },
});
