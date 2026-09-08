import React, { useEffect, useRef, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { dropHintFromFile, dropHintFromItems, pickDroppedFile } from '../../editor/fileDrop.js';
import { versionAttr } from '../../editor/versions.js';

export default function FileDropOverlay() {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const [visible, setVisible] = useState(false);
  const [hint, setHint] = useState('');
  const counter = useRef(0);

  useEffect(() => {
    function hasFiles(dt) {
      return dt && dt.types && [...dt.types].includes('Files');
    }

    function onEnter(e) {
      if (!hasFiles(e.dataTransfer)) return;
      counter.current += 1;
      if (counter.current === 1) {
        const fromItems = dropHintFromItems(e.dataTransfer.items, lang);
        setHint(
          fromItems ||
            (ru
              ? 'PPTX · HTML · JSON · Изображения · Видео · Аудио · OBJ · Markdown · Код'
              : 'PPTX · HTML · JSON · Images · Video · Audio · OBJ · Markdown · Code')
        );
        setVisible(true);
      }
    }

    function onLeave(e) {
      if (!hasFiles(e.dataTransfer)) return;
      counter.current -= 1;
      if (counter.current <= 0) {
        counter.current = 0;
        setVisible(false);
      }
    }

    function onOver(e) {
      if (!hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }

    function onDrop(e) {
      if (!hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      counter.current = 0;
      setVisible(false);
      const file = pickDroppedFile(e.dataTransfer.files);
      if (!file) return;
      const h = dropHintFromFile(file, lang);
      if (h) setHint(h);
      void editorApi.importDroppedFile(file);
    }

    document.addEventListener('dragenter', onEnter);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('dragover', onOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onEnter);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('dragover', onOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [lang, ru]);

  if (!visible) return null;

  return (
    <div className="filedrop-overlay" {...versionAttr('FileDropOverlay')} aria-hidden="true">
      <div className="filedrop-overlay-icon">📂</div>
      <div className="filedrop-overlay-title">
        {ru ? 'Перетащите файл для импорта' : 'Drop a file to import'}
      </div>
      <div className="filedrop-overlay-hint">{hint}</div>
    </div>
  );
}
