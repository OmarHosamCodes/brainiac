import { AppShellContextBar } from "@/features/app-shell/app-shell-context-bar";
import { AppShellRail, AppShellRailOverlays } from "@/features/app-shell/app-shell-rail";
import { shellChromeFrameClass } from "@/features/app-shell/app-shell-ui";

export function AppShellChrome() {
  return (
    <>
      <div className={shellChromeFrameClass}>
        <AppShellRail />
        <AppShellContextBar />
      </div>
      <AppShellRailOverlays />
    </>
  );
}
