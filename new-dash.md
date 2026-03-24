## 1. The Core Architecture

You need a two-layer setup:

- **The Viewport (The Window):** A fixed-size container with `overflow: hidden`.
- **The Canvas (The Infinite Plane):** A div inside the viewport that you move around using CSS transforms.

### Basic Data Structure

You'll need a reactive object to track the "state" of your world:

```javascript
const camera = reactive({
  x: 0,
  y: 0,
  zoom: 1,
});
```

---

## 2. Implementing the "Pan" (Moving Around)

To move the workspace, you capture the mouse movement and update the camera coordinates.

1.  Listen for `mousedown` to start dragging.
2.  On `mousemove`, calculate the delta (change) in mouse position.
3.  Update `camera.x` and `camera.y`.
4.  Apply these to the Canvas style:
    - `transform: translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`

> **Tip:** Use `requestAnimationFrame` for the movement to keep it buttery smooth at 60fps.

---

## 3. Handling Zoom (The Scroll Wheel)

Zooming is the trickiest part because you usually want to zoom **toward the mouse cursor**, not the top-left corner.

When the user scrolls:

1.  Calculate the mouse position relative to the workspace.
2.  Adjust the `zoom` level.
3.  Offset the `x` and `y` coordinates so the point under the mouse stays under the mouse.

---

## 4. The "Infinite" Background

To make it feel infinite, don't use a giant image. Use a **CSS Pattern**. A small repeating dot or grid pattern follows the camera movement but repeats seamlessly.

```css
.canvas {
  background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
  background-size: 20px 20px; /* This creates the grid */
  background-position: v-bind('camera.x + "px"') v-bind('camera.y + "px"');
}
```

---

## 5. Optimization: Virtualization

If you have 1,000 nodes in your workspace, your browser will lag. To keep it fast:

- **Culling:** Only render components that are currently within the bounds of the Viewport.
- **CSS Will-Change:** Use `will-change: transform` on the canvas to tell the browser to use GPU acceleration.

---

## Recommended Libraries

If you don't want to build the math from scratch, these are the gold standards for Vue:

| Library                       | Best For                                                |
| :---------------------------- | :------------------------------------------------------ |
| **Vue Flow**                  | Specifically for node-based UIs (exactly like Railway). |
| **Moveable**                  | If you need to drag, rotate, and scale elements freely. |
| **Konva.js (with vue-konva)** | If you are doing complex canvas-based drawing.          |

---

### Comparison of Approaches

| Approach             | Pros                                         | Cons                                       |
| :------------------- | :------------------------------------------- | :----------------------------------------- |
| **DOM-based (Divs)** | Easy to style with Tailwind/CSS, accessible. | Can slow down with 500+ elements.          |
| **HTML5 Canvas**     | Extremely fast (thousands of elements).      | Harder to handle clicks and accessibility. |
