/*
  # Default Currency USD

  Updates saved admin defaults from the old CNY/RMB demo defaults to USD.
  Custom non-CNY currency choices are left untouched.
*/

UPDATE admin_settings
SET settings_data = jsonb_set(settings_data, '{storeForm,defaultCurrency}', '"USD"', true)
WHERE settings_data ? 'storeForm'
  AND COALESCE(settings_data #>> '{storeForm,defaultCurrency}', 'CNY') = 'CNY';

UPDATE admin_settings
SET settings_data = jsonb_set(settings_data, '{storeForm,currencySymbol}', '"$"', true)
WHERE settings_data ? 'storeForm'
  AND COALESCE(settings_data #>> '{storeForm,currencySymbol}', '¥') = '¥';

UPDATE admin_settings
SET settings_data = jsonb_set(settings_data, '{storeForm,freeShippingThreshold}', '"49"', true)
WHERE settings_data ? 'storeForm'
  AND COALESCE(settings_data #>> '{storeForm,freeShippingThreshold}', '299') = '299';

UPDATE admin_settings
SET settings_data = jsonb_set(settings_data, '{storeForm,announcementText}', '"限时优惠：满 $49 免运费，新用户首单立减 15%"', true)
WHERE settings_data ? 'storeForm'
  AND COALESCE(settings_data #>> '{storeForm,announcementText}', '') IN (
    '限时优惠：满 ¥299 免运费，新用户首单立减 15%',
    '限时优惠：满 $299 免运费，新用户首单立减 15%'
  );

UPDATE admin_settings
SET settings_data = jsonb_set(
  settings_data,
  '{paymentSettings,providers}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN provider->>'id' IN ('dev_card', 'stripe', 'paypal', 'cod')
          AND COALESCE(provider->>'settlementCurrency', 'CNY') = 'CNY'
        THEN jsonb_set(provider, '{settlementCurrency}', '"USD"', true)
        ELSE provider
      END
    )
    FROM jsonb_array_elements(settings_data #> '{paymentSettings,providers}') AS provider
  ),
  true
)
WHERE jsonb_typeof(settings_data #> '{paymentSettings,providers}') = 'array';
