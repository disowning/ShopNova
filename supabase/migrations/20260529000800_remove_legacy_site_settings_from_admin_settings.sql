/*
  # Remove legacy site settings JSON keys

  Site configuration now lives only in site_settings. This migration removes any
  leftover site configuration keys from admin_settings without touching other
  admin settings such as payment, media, auth, or notification config.
*/

UPDATE admin_settings
SET
  settings_data = settings_data - 'storeForm' - 'storeSwitches' - 'headerNavLinks' - 'footerLinkSections',
  updated_at = now()
WHERE settings_data ?| ARRAY['storeForm', 'storeSwitches', 'headerNavLinks', 'footerLinkSections'];
