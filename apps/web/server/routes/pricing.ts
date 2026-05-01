export default defineEventHandler((event) => {
  sendRedirect(event, "/#pricing", 301);
});
