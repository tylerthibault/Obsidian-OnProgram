import type { Plugin } from "obsidian";
import type { OnProgramService } from "../ServiceRegistry";

const PUBLISHING_TRAY_SELECTOR = ".onprogram-calendar-publishing-tray";
const PUBLISHING_CONTROL_SELECTOR = [
  ".onprogram-calendar-publishing-pill",
  ".onprogram-calendar-publishing-add"
].join(", ");

/**
 * Keeps publishing controls interactive inside draggable Calendar cards.
 *
 * Timed Calendar cards use native HTML drag/drop. A pointer gesture that starts
 * on a button inside a draggable ancestor can otherwise become a card drag
 * before the button receives a reliable click. Track the pointer origin during
 * capture and cancel only those drag starts that began on publishing controls.
 */
export class PublishingInteractionService implements OnProgramService {
  readonly id = "publishing-interactions";

  private container?: HTMLElement;
  private styleEl?: HTMLStyleElement;
  private pointerStartedOnPublishingControl = false;

  constructor(private readonly plugin: Plugin) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    const doc = this.container.ownerDocument;

    this.container.addEventListener("pointerdown", this.handlePointerDown, true);
    this.container.addEventListener("pointerup", this.handlePointerEnd, true);
    this.container.addEventListener("pointercancel", this.handlePointerEnd, true);
    this.container.addEventListener("dragstart", this.handleDragStart, true);

    this.styleEl = doc.createElement("style");
    this.styleEl.dataset.onprogramPublishingInteractionStyles = "true";
    this.styleEl.textContent = INTERACTION_STYLES;
    doc.head.appendChild(this.styleEl);
  }

  stop(): void {
    if (this.container) {
      this.container.removeEventListener("pointerdown", this.handlePointerDown, true);
      this.container.removeEventListener("pointerup", this.handlePointerEnd, true);
      this.container.removeEventListener("pointercancel", this.handlePointerEnd, true);
      this.container.removeEventListener("dragstart", this.handleDragStart, true);
    }

    this.styleEl?.remove();
    this.styleEl = undefined;
    this.pointerStartedOnPublishingControl = false;
    this.container = undefined;
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const target = event.target as HTMLElement | null;
    this.pointerStartedOnPublishingControl = Boolean(
      target?.closest(PUBLISHING_CONTROL_SELECTOR)
    );
  };

  private readonly handlePointerEnd = (): void => {
    // Keep the flag alive through the pointerup/click turn, then clear it.
    const win = this.container?.ownerDocument.defaultView;
    if (!win) {
      this.pointerStartedOnPublishingControl = false;
      return;
    }

    win.setTimeout(() => {
      this.pointerStartedOnPublishingControl = false;
    }, 0);
  };

  private readonly handleDragStart = (event: DragEvent): void => {
    if (!this.pointerStartedOnPublishingControl) return;

    event.preventDefault();
    event.stopPropagation();
    this.pointerStartedOnPublishingControl = false;
  };
}

const INTERACTION_STYLES = `
/* The platform tray should not consume a third of a one-hour event just so the
   add control can be clickable. Keep the visual row compact and allow the add
   control's hit box to extend slightly beyond it. */
.onprogram-calendar-timed-item > ${PUBLISHING_TRAY_SELECTOR} {
  bottom: 3px !important;
  min-height: 18px !important;
  overflow: visible !important;
  gap: 3px !important;
}

.onprogram-calendar-item:not(.onprogram-calendar-timed-item) > ${PUBLISHING_TRAY_SELECTOR} {
  min-height: 18px !important;
  gap: 3px !important;
}

/* Large hit target, small visual affordance. The button itself is 30x26, while
   ::before draws the compact 18px + circle that the user actually sees. */
.onprogram-calendar-publishing-add {
  position: relative !important;
  width: 30px !important;
  min-width: 30px !important;
  height: 26px !important;
  min-height: 26px !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  font-size: 0 !important;
  line-height: 1 !important;
  opacity: 0.55 !important;
  cursor: pointer !important;
  overflow: visible !important;
}

.onprogram-calendar-publishing-add::before {
  content: "+";
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
  background: var(--background-primary-alt);
  color: var(--text-muted);
  font-size: 16px;
  font-weight: var(--font-semibold);
  line-height: 1;
  transition: border-color 100ms ease, background 100ms ease, color 100ms ease;
}

.onprogram-calendar-item:hover .onprogram-calendar-publishing-add,
.onprogram-calendar-publishing-add:hover,
.onprogram-calendar-publishing-add:focus-visible {
  opacity: 1 !important;
}

.onprogram-calendar-publishing-add:hover::before,
.onprogram-calendar-publishing-add:focus-visible::before {
  color: var(--text-accent);
  border-color: var(--interactive-accent);
  background: var(--background-modifier-hover);
}

/* Merely having the add-platform control must not steal title space. Reserve a
   bottom status row only after at least one platform is actually active. */
.onprogram-calendar-view .onprogram-calendar-timed-item:not(.onprogram-has-publishing) .onprogram-calendar-timed-title {
  bottom: 9px !important;
}

.onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-publishing .onprogram-calendar-timed-title {
  bottom: 25px !important;
}

@container onprogram-calendar-card (max-width: 170px) {
  .onprogram-calendar-publishing-add {
    width: 28px !important;
    min-width: 28px !important;
    height: 24px !important;
    min-height: 24px !important;
  }

  .onprogram-calendar-view .onprogram-calendar-timed-item:not(.onprogram-has-publishing) .onprogram-calendar-timed-title {
    bottom: 9px !important;
  }

  .onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-publishing .onprogram-calendar-timed-title {
    bottom: 23px !important;
  }
}
`;
