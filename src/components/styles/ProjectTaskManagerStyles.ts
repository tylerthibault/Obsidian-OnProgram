export const TASK_MANAGER_STYLES = `
.onprogram-project-task-manager-modal {
  width: min(760px, calc(100vw - 32px));
}

.onprogram-project-task-manager-modal .modal-content {
  max-height: min(78vh, 820px);
  overflow: auto;
}

.onprogram-project-task-manager-description,
.onprogram-project-task-manager-hint,
.onprogram-project-task-status,
.onprogram-project-task-manager-count,
.onprogram-project-task-manager-empty {
  color: var(--text-muted);
}

.onprogram-project-task-manager-description {
  margin-top: calc(var(--size-4-1) * -1);
}

.onprogram-project-task-manager-section {
  padding: var(--size-4-3) 0;
  border-top: 1px solid var(--background-modifier-border);
}

.onprogram-project-task-manager-section:first-of-type {
  border-top: 0;
}

.onprogram-project-task-manager-section h3 {
  margin: 0 0 var(--size-4-2);
  font-size: var(--font-ui-medium);
}

.onprogram-project-task-manager-section-header,
.onprogram-project-task-row,
.onprogram-project-task-picker-row,
.onprogram-project-task-row-main {
  display: flex;
  align-items: center;
}

.onprogram-project-task-manager-section-header {
  justify-content: space-between;
  gap: var(--size-4-2);
}

.onprogram-project-task-manager-count,
.onprogram-project-task-status,
.onprogram-project-task-manager-hint {
  font-size: var(--font-ui-smaller);
}

.onprogram-project-task-manager-hint {
  margin: calc(var(--size-4-1) * -1) 0 var(--size-4-2);
}

.onprogram-project-task-checklist,
.onprogram-project-task-picker {
  display: grid;
  gap: var(--size-4-1);
}

.onprogram-project-task-row,
.onprogram-project-task-picker-row {
  justify-content: space-between;
  gap: var(--size-4-3);
  min-height: 46px;
  padding: var(--size-4-2);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}

.onprogram-project-task-row-main {
  gap: var(--size-4-2);
  min-width: 0;
  flex: 1 1 auto;
}

.onprogram-project-task-row-main input[type=\"checkbox\"] {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.onprogram-project-task-row-text {
  min-width: 0;
  flex: 1 1 auto;
}

.onprogram-project-task-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-normal);
  font-weight: var(--font-medium);
}

.onprogram-project-task-title.is-complete {
  color: var(--text-muted);
  text-decoration: line-through;
}

.onprogram-project-task-search {
  width: 100%;
  margin-bottom: var(--size-4-2);
}

.onprogram-project-task-manager-empty {
  padding: var(--size-4-3);
  border: 1px dashed var(--background-modifier-border);
  border-radius: var(--radius-s);
  text-align: center;
}

@media (max-width: 600px) {
  .onprogram-project-task-row,
  .onprogram-project-task-picker-row {
    align-items: stretch;
    flex-direction: column;
  }

  .onprogram-project-task-row > button,
  .onprogram-project-task-picker-row > button {
    align-self: flex-start;
  }
}
`;
