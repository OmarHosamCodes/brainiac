> **Role:** Senior Frontend Engineer & UI/UX Specialist
>
> **Task:** Build a Vue 3 (Composition API) component for an "Infinite Workspace" canvas.
>
> **Core Requirements:**
>
> 1. **The Canvas Engine:** > \* Implement a viewport container with a "world" layer.
>    - Use CSS transforms (`translate` and `scale`) for movement.
>    - Implement **Zoom-to-Cursor** logic (scrolling should zoom toward the mouse position, not the top-left).
> 2. **Features to Include:**
>    - **Draggable Pan:** Middle-click or Space+Drag to move the canvas.
>    - **Zoom Suite:** Zoom In/Out buttons, a "Reset to 100%" function, and a reactive **Zoom Percentage** display.
>    - **Mini-map:** A small, fixed-position overlay that shows a bird's-eye view of all elements on the canvas with a "viewfinder" rectangle representing the current viewport.
>    - **Full Screen:** A toggle function using the Browser Fullscreen API.
> 3. **Visuals & Performance:**
>    - Add an infinite dot-grid background using CSS `background-repeat` that moves with the canvas.
>    - Use `requestAnimationFrame` for smooth panning.
>    - Apply `will-change: transform` for GPU acceleration.
> 4. **Technical Stack:** > \* Vue 3 SFC (Script Setup).
>    - Tailwind CSS for styling the UI overlays.
>    - Use standard HTML/CSS for the canvas (no heavy external libraries like Vue Flow for now—I want to see the math/logic).
>
> **Output:** Provide a single-file component (or a clean multi-file structure) with clear comments explaining the coordinate math for the Zoom-to-Cursor and Mini-map scaling.
