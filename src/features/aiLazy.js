/** AI panel — React modal. */
import { useUiStore } from '../stores/uiStore.js';

export function openAiPanel() {
  useUiStore.getState().openAiModal();
}

export default { openAiPanel };
