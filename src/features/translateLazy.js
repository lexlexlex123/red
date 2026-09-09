/** Translate — React store actions (Google gtx). */
export { translateSelectionAction as translateSelection } from '../editor/translateActions.js';
import { translateSelectionAction, translateDeckAction } from '../editor/translateActions.js';

export function translateDeck() {
  return translateDeckAction();
}

export default { translateSelection: translateSelectionAction, translateDeck };
