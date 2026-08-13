export function splitReadAloudWords(text: string) {
  return text.split(/\s+/).filter(Boolean);
}
