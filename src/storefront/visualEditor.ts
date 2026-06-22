export type VisualEditorSource = 'cms' | 'siteSettings';

export interface VisualEditorTarget {
  entryId: string;
  label: string;
  source: VisualEditorSource;
  itemId?: string;
  fieldKey?: string;
  settingSection?: string;
  settingKey?: string;
}

export function editableAttrs(target: VisualEditorTarget): Record<string, string> {
  return {
    'data-shopnova-editor-target': 'true',
    'data-shopnova-entry-id': target.entryId,
    'data-shopnova-source': target.source,
    'data-shopnova-label': target.label,
    ...(target.itemId ? { 'data-shopnova-item-id': target.itemId } : {}),
    ...(target.fieldKey ? { 'data-shopnova-field-key': target.fieldKey } : {}),
    ...(target.settingSection ? { 'data-shopnova-setting-section': target.settingSection } : {}),
    ...(target.settingKey ? { 'data-shopnova-setting-key': target.settingKey } : {}),
  };
}
