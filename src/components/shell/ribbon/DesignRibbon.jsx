import React from 'react';
import { editorApi } from '../../../editor/editorApi';
import { useUiStore } from '../../../stores/uiStore';
import { getTranslateDeckLang, langBtnLabel } from '../../../editor/translate.js';
import { chromeIconId } from '../../../editor/app-icons-data.js';
import RibbonGroup from './RibbonGroup.jsx';
import RibbonButton from './RibbonButton.jsx';
import LayoutPickerGroup from './LayoutPickerGroup.jsx';

export default function DesignRibbon() {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const guidesEditMode = useUiStore((s) => s.guidesEditMode);
  const deckLang = getTranslateDeckLang();
  const trLabel = langBtnLabel(deckLang, ru);

  return (
    <React.Fragment>
      <LayoutPickerGroup />
      <RibbonGroup label={ru ? 'Направляющие' : 'Guides'}>
        <RibbonButton
          label={ru ? 'Направляющие' : 'Guides'}
          title={ru ? 'Пользовательские направляющие слайда' : 'Custom slide guides'}
          icon={chromeIconId('align')}
          on={!!guidesEditMode}
          onClick={() => {
            const next = !useUiStore.getState().guidesEditMode;
            useUiStore.getState().setGuidesEditMode(next);
          }}
        />
      </RibbonGroup>
      <RibbonGroup label={ru ? 'Перевод' : 'Translate'}>
        <RibbonButton
          label={trLabel}
          title={ru ? 'Перевести все тексты презентации' : 'Translate all presentation texts'}
          icon={chromeIconId('translate')}
          onClick={() => void editorApi.translateDeck()}
        />
      </RibbonGroup>
    </React.Fragment>
  );
}
