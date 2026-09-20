export const PROJECT_PICKER_STYLES = `
.onprogram-project-picker-modal {
  width: min(560px, calc(100vw - 32px));
}

.onprogram-project-picker-modal .modal-content {
  padding: 28px;
}

.onprogram-project-picker-header {
  margin: 0 0 20px;
  padding-right: 34px;
}

.onprogram-project-picker-header h2 {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.onprogram-project-picker-item-title {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: var(--font-ui-small);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.onprogram-project-picker-search-shell {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.onprogram-project-picker-search-icon {
  position: absolute;
  left: 12px;
  z-index: 1;
  display: inline-flex;
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}

.onprogram-project-picker-search {
  width: 100%;
  height: 40px;
  margin: 0;
  padding-left: 38px !important;
  border-radius: var(--radius-m);
  box-sizing: border-box;
}

.onprogram-project-picker-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: min(430px, 58vh);
  overflow-y: auto;
  padding: 2px;
}

.onprogram-project-picker-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
  align-items: center;
  width: 100%;
  min-height: 58px;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-m);
  background: transparent;
  box-shadow: none;
  color: var(--text-normal);
  text-align: left;
  cursor: pointer;
}

.onprogram-project-picker-row:hover,
.onprogram-project-picker-row:focus-visible {
  border-color: var(--background-modifier-border);
  background: var(--background-modifier-hover);
  box-shadow: none;
}

.onprogram-project-picker-row.is-current {
  border-color: color-mix(in srgb, var(--interactive-accent) 46%, var(--background-modifier-border));
  background: color-mix(in srgb, var(--interactive-accent) 10%, transparent);
}

.onprogram-project-picker-row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-s);
  background: var(--background-secondary);
  color: var(--text-muted);
}

.onprogram-project-picker-row.is-current .onprogram-project-picker-row-icon {
  color: var(--interactive-accent);
}

.onprogram-project-picker-row-text {
  min-width: 0;
  padding: 0 8px;
}

.onprogram-project-picker-title {
  overflow: hidden;
  color: var(--text-normal);
  font-size: var(--font-ui-medium);
  font-weight: var(--font-semibold);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.onprogram-project-picker-meta {
  margin-top: 3px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
  font-weight: var(--font-normal);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.onprogram-project-picker-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--interactive-accent);
}

.onprogram-project-picker-divider {
  height: 1px;
  margin: 8px 6px 4px;
  background: var(--background-modifier-border);
}

.onprogram-project-picker-none .onprogram-project-picker-row-icon {
  background: transparent;
}

.onprogram-project-picker-none:hover .onprogram-project-picker-title {
  color: var(--text-error);
}

.onprogram-project-picker-empty {
  padding: 24px 14px;
  color: var(--text-muted);
  font-size: var(--font-ui-small);
  text-align: center;
}

.onprogram-project-picker-modal.onprogram-is-busy .onprogram-project-picker-list,
.onprogram-project-picker-modal.onprogram-is-busy .onprogram-project-picker-search-shell {
  opacity: 0.62;
  pointer-events: none;
}

@media (max-width: 520px) {
  .onprogram-project-picker-modal .modal-content {
    padding: 22px 18px;
  }
}
`;
