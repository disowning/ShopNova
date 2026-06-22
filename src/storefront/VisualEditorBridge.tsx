import { useEffect } from 'react';

interface EditorTargetPayload {
  type: 'shopnova:select-content';
  entryId: string;
  source: string;
  label: string;
  itemId?: string;
  fieldKey?: string;
  settingSection?: string;
  settingKey?: string;
}

function readTarget(element: HTMLElement): EditorTargetPayload {
  return {
    type: 'shopnova:select-content',
    entryId: element.dataset.shopnovaEntryId ?? '',
    source: element.dataset.shopnovaSource ?? '',
    label: element.dataset.shopnovaLabel ?? '',
    itemId: element.dataset.shopnovaItemId,
    fieldKey: element.dataset.shopnovaFieldKey,
    settingSection: element.dataset.shopnovaSettingSection,
    settingKey: element.dataset.shopnovaSettingKey,
  };
}

function focusInitialTarget() {
  const entryId = new URLSearchParams(window.location.search).get('visual-entry');
  if (!entryId) return;
  const target = Array.from(document.querySelectorAll<HTMLElement>('[data-shopnova-entry-id]'))
    .find((element) => element.dataset.shopnovaEntryId === entryId);
  if (!target) return;
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  target.classList.add('shopnova-editor-selected');
  window.setTimeout(() => target.classList.remove('shopnova-editor-selected'), 1200);
}

export default function VisualEditorBridge({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return undefined;

    let active: HTMLElement | null = null;
    document.body.classList.add('shopnova-visual-editor');
    window.parent?.postMessage({ type: 'shopnova:editor-ready' }, window.location.origin);
    const focusTimer = window.setTimeout(focusInitialTarget, 350);

    const clearActive = () => {
      active?.classList.remove('shopnova-editor-hover');
      active = null;
    };

    const findTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      return target.closest<HTMLElement>('[data-shopnova-editor-target="true"]');
    };

    const onMouseOver = (event: MouseEvent) => {
      const target = findTarget(event.target);
      if (!target || target === active) return;
      clearActive();
      active = target;
      active.classList.add('shopnova-editor-hover');
    };

    const onMouseOut = (event: MouseEvent) => {
      const target = findTarget(event.target);
      if (!target || target !== active) return;
      const next = event.relatedTarget;
      if (next instanceof Node && target.contains(next)) return;
      clearActive();
    };

    const onClick = (event: MouseEvent) => {
      const target = findTarget(event.target);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      window.parent?.postMessage(readTarget(target), window.location.origin);
      clearActive();
      target.classList.add('shopnova-editor-selected');
      window.setTimeout(() => target.classList.remove('shopnova-editor-selected'), 900);
    };

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);

    const style = document.createElement('style');
    style.dataset.shopnovaEditorStyle = 'true';
    style.textContent = `
      .shopnova-visual-editor [data-shopnova-editor-target="true"] {
        cursor: crosshair !important;
      }
      .shopnova-visual-editor .shopnova-editor-hover {
        outline: 2px solid #2563eb !important;
        outline-offset: 4px !important;
        box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.12) !important;
      }
      .shopnova-visual-editor .shopnova-editor-selected {
        outline: 2px solid #10b981 !important;
        outline-offset: 4px !important;
        box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.16) !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      clearActive();
      window.clearTimeout(focusTimer);
      document.body.classList.remove('shopnova-visual-editor');
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('mouseout', onMouseOut, true);
      document.removeEventListener('click', onClick, true);
      style.remove();
    };
  }, [enabled]);

  return null;
}
