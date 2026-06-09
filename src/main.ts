import { on, emit, showUI } from "@create-figma-plugin/utilities";

const STORAGE_KEY = 'customIcons'

export default function () {
  showUI({
    width: 300,
    height: 400,
  });

  // Load icons from storage and send to UI
  on("LOAD_ICONS", async () => {
    const stored = await figma.clientStorage.getAsync(STORAGE_KEY)
    emit("ICONS_LOADED", stored ?? [])
  })

  // Save icons to storage
  on("SAVE_ICONS", async (icons: any[]) => {
    await figma.clientStorage.setAsync(STORAGE_KEY, icons)
  })

  // Insert icon onto canvas
  on("SUBMIT", (data: { name: string; svg: string; outlineStroke: boolean }) => {
    const icon = figma.createNodeFromSvg(data.svg);
    icon.name = data.name;
    icon.x = Math.round(figma.viewport.center.x);
    icon.y = Math.round(figma.viewport.center.y);

    const flattened = figma.flatten(icon.children, icon);

    if (data.outlineStroke) {
      const stroke = flattened.outlineStroke();
      if (stroke) {
        flattened.remove();
        icon.appendChild(stroke);
      }
    }

    figma.currentPage.selection = [icon];
  });

  // Handle drag-to-canvas drops
  figma.on('drop', (event) => {
    const item = event.items.find((i) => i.type === 'text/plain')
    if (!item) return false
    try {
      const payload = JSON.parse(item.data)
      if (!payload.__customIcon) return false
      const icon = figma.createNodeFromSvg(payload.svg)
      icon.name = payload.name
      icon.x = event.absoluteX - icon.width / 2
      icon.y = event.absoluteY - icon.height / 2
      const flattened = figma.flatten(icon.children, icon)
      if (payload.outlineStroke) {
        const stroke = flattened.outlineStroke()
        if (stroke) { flattened.remove(); icon.appendChild(stroke) }
      }
      figma.currentPage.selection = [icon]
      return true
    } catch {
      return false
    }
  })
}
