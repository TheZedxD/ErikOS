/**
 * Icon size management utility for ErikOS
 * Ensures all taskbar and tray icons maintain consistent sizing
 */

export class IconManager {
  static SIZES = {
    tray: 20,
    taskbar: 18,
    desktop: 64
  };

  static constrainIcon(img, type = "tray") {
    const size = this.SIZES[type] || 20;

    // Apply size constraints
    const styles = {
      width: `${size}px`,
      height: `${size}px`,
      minWidth: `${size}px`,
      minHeight: `${size}px`,
      maxWidth: `${size}px`,
      maxHeight: `${size}px`,
      flex: "none",
      flexShrink: "0",
      objectFit: "contain",
      display: "inline-block",
      imageRendering: "pixelated"
    };

    Object.assign(img.style, styles);

    // Force re-render if image is already loaded
    if (img.complete) {
      img.style.display = "none";
      img.offsetHeight; // Force reflow
      img.style.display = "inline-block";
    }

    return img;
  }

  static fixAllIcons() {
    // Fix tray icons
    document.querySelectorAll("#tray img").forEach((img) => {
      this.constrainIcon(img, "tray");
    });

    // Fix taskbar icons if any
    document.querySelectorAll("#taskbar-windows img").forEach((img) => {
      this.constrainIcon(img, "taskbar");
    });
  }

  static observeIconContainer(container) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === "IMG") {
            const type = node.closest("#tray") ? "tray" : "taskbar";
            this.constrainIcon(node, type);
          }
        });
      });
    });

    observer.observe(container, {
      childList: true,
      subtree: true
    });

    return observer;
  }
}

// Auto-fix on load
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    IconManager.fixAllIcons();

    // Watch for new icons
    const tray = document.getElementById("tray");
    const taskbar = document.getElementById("taskbar-windows");

    if (tray) IconManager.observeIconContainer(tray);
    if (taskbar) IconManager.observeIconContainer(taskbar);
  });
}
