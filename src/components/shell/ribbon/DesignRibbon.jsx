import React, { useEffect } from 'react';
import { editorApi } from '../../../editor/editorApi';
import { useUiStore } from '../../../stores/uiStore';
import { versionAttr } from '../../../editor/versions.js';
import { getTranslateDeckLang, langBtnLabel } from '../../../editor/translate.js';
import { chromeIconId } from '../../../editor/app-icons-data.js';
import RibbonGroup from './RibbonGroup.jsx';
import RibbonButton from './RibbonButton.jsx';
import LayoutPickerGroup from './LayoutPickerGroup.jsx';

export default function DesignRibbon() {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const deckLang = getTranslateDeckLang();
  const trLabel = langBtnLabel(deckLang, ru);

  return (
    <React.Fragment {...versionAttr('DesignRibbon')}>
      <LayoutPickerGroup />
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
