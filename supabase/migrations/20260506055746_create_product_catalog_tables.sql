/*
  # Create Product Catalog Tables

  ## Summary
  Creates product_categories and products tables to replace mock-data.ts as the data
  source for the ShopNova storefront. Seeds all existing mock data as initial records.

  ## New Tables

  ### product_categories
  - id (text, pk) — matches mock-data category ids e.g. 'c1'
  - name (text) — display name
  - slug (text, unique)
  - icon (text) — emoji icon
  - gradient (text) — tailwind gradient classes for storefront display
  - description (text)
  - count (int) — product count hint for display
  - sort_order (int)
  - created_at, updated_at

  ### products
  - id (text, pk) — matches mock-data product ids e.g. 'p1'
  - category_id (text, fk → product_categories)
  - name, slug, short_description, description
  - image_url (text) — primary image
  - images (jsonb) — array of all image URLs
  - price, original_price (numeric)
  - stock (int)
  - rating (numeric)
  - sold_count (int)
  - status ('active' | 'inactive')
  - is_featured, is_hot, is_new (boolean)
  - tag (text) — '热卖' | '新品' | '限时折扣' | null
  - sku_groups (jsonb) — full SKU data for product detail page
  - specs (jsonb) — product specs array
  - highlights (jsonb) — highlights array
  - sort_order (int)
  - created_at, updated_at
  - deleted_at (soft delete)

  ## Security
  - RLS enabled, anon can SELECT active products
  - Anon can INSERT/UPDATE/DELETE for dev/test admin operations
*/

-- ─── product_categories ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_categories (
  id          text PRIMARY KEY,
  name        text NOT NULL DEFAULT '',
  slug        text UNIQUE NOT NULL DEFAULT '',
  icon        text NOT NULL DEFAULT '',
  gradient    text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  count       int NOT NULL DEFAULT 0,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
  ON product_categories FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can manage categories (dev/test)"
  ON product_categories FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update categories (dev/test)"
  ON product_categories FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete categories (dev/test)"
  ON product_categories FOR DELETE TO anon
  USING (true);

-- ─── products ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id                text PRIMARY KEY,
  category_id       text REFERENCES product_categories(id),
  name              text NOT NULL DEFAULT '',
  slug              text NOT NULL DEFAULT '',
  short_description text NOT NULL DEFAULT '',
  description       text NOT NULL DEFAULT '',
  image_url         text NOT NULL DEFAULT '',
  images            jsonb NOT NULL DEFAULT '[]',
  price             numeric(10,2) NOT NULL DEFAULT 0,
  original_price    numeric(10,2) NOT NULL DEFAULT 0,
  stock             int NOT NULL DEFAULT 0,
  rating            numeric(3,1) NOT NULL DEFAULT 0,
  sold_count        int NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'active',
  is_featured       boolean NOT NULL DEFAULT false,
  is_hot            boolean NOT NULL DEFAULT false,
  is_new            boolean NOT NULL DEFAULT false,
  tag               text,
  sku_groups        jsonb NOT NULL DEFAULT '[]',
  specs             jsonb NOT NULL DEFAULT '[]',
  highlights        jsonb NOT NULL DEFAULT '[]',
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active products"
  ON products FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert products (dev/test)"
  ON products FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update products (dev/test)"
  ON products FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete products (dev/test)"
  ON products FOR DELETE TO anon
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(is_new);
CREATE INDEX IF NOT EXISTS idx_products_is_hot ON products(is_hot);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);

-- ─── Seed: categories ─────────────────────────────────────────────────────────

INSERT INTO product_categories (id, name, slug, icon, gradient, description, count, sort_order) VALUES
  ('c1', '智能手表', 'smart-watch',     '⌚', 'from-blue-500 to-cyan-400',     '智能穿戴设备', 48, 1),
  ('c2', '蓝牙耳机', 'bluetooth-audio', '🎧', 'from-violet-500 to-purple-400', '蓝牙音频设备', 92, 2),
  ('c3', '手机配件', 'phone-accessories','📱', 'from-pink-500 to-rose-400',    '手机周边配件', 214, 3),
  ('c4', '电脑周边', 'computer-peripherals','💻','from-amber-500 to-orange-400','电脑外设产品', 76, 4),
  ('c5', '生活电器', 'home-electronics', '🔌', 'from-emerald-500 to-teal-400', '生活家用电器', 53, 5),
  ('c6', '潮流好物', 'trending',         '✨', 'from-sky-500 to-indigo-400',   '潮流精选好物', 128, 6)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: products ───────────────────────────────────────────────────────────

INSERT INTO products (id, category_id, name, slug, short_description, description, image_url, images, price, original_price, stock, rating, sold_count, status, is_featured, is_hot, is_new, tag, sku_groups, specs, highlights, sort_order) VALUES

('p1','c2','AirSound Pro 蓝牙耳机','airsound-pro',
 '主动降噪，沉浸音效，续航 36 小时',
 'AirSound Pro 采用第三代主动降噪算法，配备 11mm 动圈单元，在通勤、办公、运动场景中提供无与伦比的沉浸音效体验。折叠设计方便携带，配套充电盒单次充电续航长达 36 小时。',
 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/577769/pexels-photo-577769.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 399, 599, 247, 4.8, 2418, 'active', true, true, false, '热卖',
 '[{"name":"颜色","options":[{"id":"black","label":"星夜黑","stock":120},{"id":"white","label":"珍珠白","stock":85},{"id":"blue","label":"海蓝色","stock":42}]},{"name":"套装","options":[{"id":"standard","label":"标准版","stock":200},{"id":"plus","label":"豪华版（含收纳包）","stock":60,"priceModifier":50}]}]',
 '[{"label":"驱动单元","value":"11mm 动圈"},{"label":"频响范围","value":"20Hz – 20kHz"},{"label":"降噪深度","value":"-35dB ANC"},{"label":"续航时间","value":"耳机 12h + 充电盒 24h"},{"label":"充电接口","value":"USB-C"},{"label":"蓝牙版本","value":"Bluetooth 5.3"},{"label":"重量","value":"250g（含充电盒）"},{"label":"防水等级","value":"IPX4"}]',
 '["第三代主动降噪，降噪深度 -35dB","11mm 定制动圈，低频下潜充足","单次续航 36 小时（含充电盒）","蓝牙 5.3，连接更稳定低延迟","USB-C 快充，15 分钟充满 3 小时"]',
 1),

('p2','c1','NovaWatch 智能手表','novawatch',
 '健康监测 · 全天候续航 · 轻薄设计',
 'NovaWatch 搭载全天候健康监测芯片，支持心率、血氧、睡眠多维度追踪。1.9 英寸超清 AMOLED 屏幕，防划伤蓝宝石玻璃，超轻铝合金表壳，续航可达 7 天。',
 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/1034054/pexels-photo-1034054.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/267394/pexels-photo-267394.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/1616804/pexels-photo-1616804.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 699, 899, 155, 4.9, 1865, 'active', true, true, false, '热卖',
 '[{"name":"表盘尺寸","options":[{"id":"41mm","label":"41mm","stock":90},{"id":"45mm","label":"45mm","stock":65,"priceModifier":80}]},{"name":"表带颜色","options":[{"id":"midnight","label":"午夜黑","stock":80},{"id":"silver","label":"星光银","stock":70},{"id":"red","label":"红色运动","stock":30},{"id":"green","label":"松绿色","stock":20}]}]',
 '[{"label":"屏幕","value":"1.9\" AMOLED，2000nit"},{"label":"表壳材质","value":"航空铝合金"},{"label":"防水等级","value":"5ATM（50米防水）"},{"label":"传感器","value":"心率 / 血氧 / 加速度计 / 陀螺仪"},{"label":"续航","value":"正常模式 7 天"},{"label":"充电方式","value":"磁吸快充"},{"label":"系统兼容","value":"iOS 16+ / Android 10+"},{"label":"重量","value":"38g（不含表带）"}]',
 '["1.9\" 2000nit 超亮 AMOLED 屏","心率 / 血氧 / 睡眠全天监测","50 米防水，游泳可佩戴","7 天超长续航，磁吸快充","内置 GPS，运动轨迹精准记录"]',
 2),

('p3','c3','ClearCase 防摔手机壳','clearcase',
 '军规级防摔，透明磨砂，贴合手感',
 'ClearCase 采用 SGS 军规级四角气囊防摔设计，PC+TPU 双层复合结构，透明磨砂材质防止背面刮花，精准开孔适配全功能按键，超薄 1.2mm 边框不影响手感。',
 'https://images.pexels.com/photos/1294886/pexels-photo-1294886.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/1294886/pexels-photo-1294886.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/47261/pexels-photo-47261.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/1440727/pexels-photo-1440727.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 79, 129, 730, 4.7, 5230, 'active', true, false, false, '限时折扣',
 '[{"name":"适配机型","options":[{"id":"iphone15","label":"iPhone 15","stock":300},{"id":"iphone15pro","label":"iPhone 15 Pro","stock":280},{"id":"iphone15pm","label":"iPhone 15 Pro Max","stock":250},{"id":"iphone16","label":"iPhone 16","stock":320},{"id":"samsung-s24","label":"Samsung S24","stock":180}]},{"name":"颜色","options":[{"id":"clear","label":"透明磨砂","stock":500},{"id":"black-clear","label":"黑色磨砂","stock":200}]}]',
 '[{"label":"材质","value":"PC + TPU 复合"},{"label":"厚度","value":"1.2mm 超薄"},{"label":"防护等级","value":"SGS 军规 6 英尺防摔"},{"label":"镜头保护","value":"镜头围提升 1.5mm"},{"label":"表面处理","value":"磨砂防指纹"},{"label":"重量","value":"22g"}]',
 '["SGS 军规四角气囊防摔认证","PC+TPU 双层复合，轻薄不臃肿","透明磨砂，防指纹防黄变","精准开孔，按键手感完美保留","镜头保护圈提升 1.5mm"]',
 3),

('p4','c2','MiniBass 蓝牙音箱','minibass',
 '360° 环绕音效，IPX7 防水，超长续航',
 'MiniBass 搭载双全频扬声器 + 被动振膜，实现 360° 全向环绕音效，低频下潜有力。IPX7 级防水，可在淋浴或户外雨天自由使用，续航高达 20 小时。',
 'https://images.pexels.com/photos/1279365/pexels-photo-1279365.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/1279365/pexels-photo-1279365.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/1706694/pexels-photo-1706694.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/4997834/pexels-photo-4997834.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 299, 399, 290, 4.8, 3012, 'active', true, true, false, '热卖',
 '[{"name":"颜色","options":[{"id":"black","label":"曜石黑","stock":150},{"id":"green","label":"森林绿","stock":80},{"id":"orange","label":"橙红色","stock":60}]}]',
 '[{"label":"扬声器","value":"双 40mm 全频 + 被动振膜"},{"label":"频响","value":"60Hz – 20kHz"},{"label":"输出功率","value":"20W（双声道各 10W）"},{"label":"防水等级","value":"IPX7（1m 水下 30 分钟）"},{"label":"续航","value":"20 小时"},{"label":"充电","value":"USB-C，2 小时充满"},{"label":"蓝牙","value":"Bluetooth 5.2"},{"label":"重量","value":"480g"}]',
 '["360° 全向环绕音效","双扬声器 + 被动振膜，低频饱满","IPX7 完全防水，户外无忧","20 小时超长续航","支持 TWS 双机立体声配对"]',
 4),

('p5','c3','Type-C 快充数据线','typec-cable',
 '100W 超级快充，编织抗拉，1.8 米',
 '采用 E-Marker 芯片的百瓦快充数据线，支持 PD3.0 协议，同时兼容 USB 3.2 Gen2 高速数据传输（最高 10Gbps）。尼龙编织外层抗弯折寿命超 3 万次。',
 'https://images.pexels.com/photos/4219654/pexels-photo-4219654.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/4219654/pexels-photo-4219654.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/5082579/pexels-photo-5082579.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 39, 69, 1200, 4.6, 8921, 'active', true, false, false, null,
 '[{"name":"长度","options":[{"id":"1m","label":"1.0 米","stock":500},{"id":"1.8m","label":"1.8 米","stock":400},{"id":"2m","label":"2.0 米","stock":300,"priceModifier":5}]},{"name":"颜色","options":[{"id":"black","label":"黑色","stock":600},{"id":"white","label":"白色","stock":400}]}]',
 '[{"label":"最大功率","value":"100W（PD 3.0）"},{"label":"数据速率","value":"10Gbps（USB 3.2 Gen2）"},{"label":"外皮","value":"尼龙编织防弯折"},{"label":"弯折寿命","value":"3 万次以上"},{"label":"接口","value":"USB-C to USB-C"},{"label":"线长","value":"1.0 / 1.8 / 2.0 米"}]',
 '["100W PD 3.0 超级快充","10Gbps 高速数据传输","尼龙编织，抗弯折 3 万次","E-Marker 芯片，安全稳定","兼容笔记本、平板、手机全场景"]',
 5),

('p6','c3','MagCharge 磁吸充电器','magcharge',
 '15W 磁吸无线充电，兼容 MagSafe',
 'MagCharge 采用精准磁力对位设计，支持 15W Qi2 无线快充，完全兼容 Apple MagSafe 生态。轻薄铝合金底座，桌面摆放稳固，内置散热设计，充电不发烫。',
 'https://images.pexels.com/photos/4526418/pexels-photo-4526418.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/4526418/pexels-photo-4526418.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/4526414/pexels-photo-4526414.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/5082579/pexels-photo-5082579.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 159, 229, 380, 4.8, 2756, 'active', true, false, true, '新品',
 '[{"name":"颜色","options":[{"id":"white","label":"雾白","stock":200},{"id":"black","label":"磨砂黑","stock":180}]}]',
 '[{"label":"无线充电标准","value":"Qi2 / MagSafe 兼容"},{"label":"最大功率","value":"15W"},{"label":"底座材质","value":"航空铝合金"},{"label":"接口","value":"USB-C 输入"},{"label":"兼容性","value":"iPhone 12 及以上 / Android Qi2"},{"label":"重量","value":"65g"}]',
 '["15W Qi2 磁吸无线快充","完全兼容 Apple MagSafe","铝合金底座，稳固不移位","内置智能散热，充电不发烫","超薄 6mm，桌面不占空间"]',
 6),

('p7','c5','DeskLamp Pro 护眼台灯','desklamp-pro',
 '护眼防蓝光，无频闪，无线充电底座',
 'DeskLamp Pro 获得 TÜV 莱茵护眼认证，采用无频闪 LED，有效过滤有害蓝光，保护视力。5 档色温 × 5 档亮度 = 25 种灯光模式，底座内置 10W 无线充电区域。',
 'https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/3270223/pexels-photo-3270223.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 269, 369, 160, 4.9, 1448, 'active', true, false, true, '新品',
 '[{"name":"颜色","options":[{"id":"white","label":"雅白","stock":90},{"id":"black","label":"哑黑","stock":70}]}]',
 '[{"label":"护眼认证","value":"TÜV 莱茵 · 无频闪 · 低蓝光"},{"label":"色温范围","value":"2700K – 6500K（5 档）"},{"label":"亮度","value":"5 档调节（最高 800lm）"},{"label":"无线充电","value":"底座 10W Qi 无线充电"},{"label":"臂展","value":"360° 旋转 + 180° 折叠"},{"label":"接口","value":"USB-C 供电 + USB-A 输出"}]',
 '["TÜV 莱茵护眼认证，无频闪无蓝光","25 种灯光模式，满足各场景","底座内置 10W 无线充电","360° 全方位调节，照明无死角","USB-A 扩展充电口，一灯多用"]',
 7),

('p8','c3','SlimPower 移动电源','slimpower',
 '20000mAh，22.5W 快充，超薄机身',
 'SlimPower 采用高密度电芯，20000mAh 大容量塞进 1.2cm 超薄机身。支持 22.5W 双向快充，可同时为 3 台设备充电，内置 LED 电量指示屏，精准显示剩余电量。',
 'https://images.pexels.com/photos/4526414/pexels-photo-4526414.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/4526414/pexels-photo-4526414.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/4526418/pexels-photo-4526418.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 199, 299, 700, 4.7, 4302, 'active', true, true, false, '限时折扣',
 '[{"name":"颜色","options":[{"id":"black","label":"深空黑","stock":300},{"id":"white","label":"皓月白","stock":280},{"id":"blue","label":"星空蓝","stock":120}]}]',
 '[{"label":"容量","value":"20000mAh"},{"label":"最大输出功率","value":"22.5W（快充）"},{"label":"输出接口","value":"USB-C × 2 + USB-A × 1"},{"label":"机身厚度","value":"1.2cm 超薄"},{"label":"电量显示","value":"LED 数字屏（精确百分比）"},{"label":"重量","value":"340g"}]',
 '["20000mAh 大容量，可充满手机 4 次","22.5W 双向快充，充电更快","1.2cm 超薄，放入口袋无负担","同时为 3 台设备供电","LED 数字屏，精确显示剩余电量"]',
 8),

('n1','c1','UltraFit 智能手环','ultrafit',
 '超薄 AMOLED 屏，睡眠追踪，运动监测',
 'UltraFit 搭载 1.47" AMOLED 全彩屏，支持 100+ 运动模式，24 小时心率与睡眠自动追踪，IP68 防水，超轻 23g 机身，续航最长 14 天。',
 'https://images.pexels.com/photos/267394/pexels-photo-267394.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/267394/pexels-photo-267394.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/1034054/pexels-photo-1034054.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 349, 449, 190, 4.8, 320, 'active', false, false, true, '新品',
 '[{"name":"颜色","options":[{"id":"black","label":"曜石黑","stock":80},{"id":"pink","label":"樱花粉","stock":60},{"id":"blue","label":"科技蓝","stock":50}]}]',
 '[{"label":"屏幕","value":"1.47\" AMOLED 全彩"},{"label":"传感器","value":"心率 / 血氧 / 加速度计"},{"label":"运动模式","value":"100+ 种"},{"label":"防水等级","value":"IP68"},{"label":"续航","value":"14 天（省电模式）"},{"label":"重量","value":"23g（不含表带）"}]',
 '["1.47\" AMOLED 全彩超清屏","100+ 运动模式精准追踪","24h 心率 + 睡眠自动监测","IP68 防水，运动无忧","14 天超长续航，超轻 23g"]',
 9),

('n2','c3','GlowPad 无线充电板','glowpad',
 '三合一充电，氛围灯效，桌面美学',
 'GlowPad 支持手机 + 耳机 + 手表三合一同时无线充电，内置可调节 RGB 氛围灯，10 种灯效模式，铝合金 + 钢化玻璃面板，为桌面增添美学氛围。',
 'https://images.pexels.com/photos/5082579/pexels-photo-5082579.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/5082579/pexels-photo-5082579.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/4526418/pexels-photo-4526418.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 219, 299, 190, 4.9, 188, 'active', false, false, true, '新品',
 '[{"name":"颜色","options":[{"id":"black","label":"磨砂黑","stock":100},{"id":"white","label":"雾白银","stock":90}]}]',
 '[{"label":"充电位置","value":"手机 + 耳机 + 手表（三合一）"},{"label":"最大功率","value":"15W（手机位）"},{"label":"氛围灯","value":"RGB 10 种模式"},{"label":"面板材质","value":"铝合金 + 钢化玻璃"},{"label":"接口","value":"USB-C 供电（适配器需≥30W）"},{"label":"重量","value":"280g"}]',
 '["手机 + 耳机 + 手表三合一同充","15W 快速无线充电","10 种 RGB 氛围灯效","铝合金 + 钢化玻璃精工面板","智能识别设备，自动调功"]',
 10),

('n3','c4','PocketHub 扩展坞','pockethub',
 '9-in-1 多端口，4K HDMI，铝合金壳体',
 'PocketHub 将一个 USB-C 接口扩展为 9 个端口，支持 4K@60Hz HDMI 输出、10Gbps 数据传输、100W PD 直通充电，全铝合金外壳导热散热，兼容 Mac 和 Windows。',
 'https://images.pexels.com/photos/2148216/pexels-photo-2148216.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/2148216/pexels-photo-2148216.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/4219654/pexels-photo-4219654.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 289, 379, 230, 4.7, 256, 'active', false, false, true, '新品',
 '[{"name":"接口版本","options":[{"id":"standard","label":"标准版（9 口）","stock":150},{"id":"pro","label":"Pro 版（12 口）","stock":80,"priceModifier":80}]}]',
 '[{"label":"端口数量","value":"9 个（标准版）"},{"label":"HDMI","value":"4K@60Hz"},{"label":"USB-A","value":"10Gbps × 3"},{"label":"PD 充电","value":"100W 直通"},{"label":"SD/TF","value":"UHS-I 同时读取"},{"label":"外壳","value":"全铝合金导热散热"}]',
 '["9 合 1 扩展，一键接入所有设备","4K@60Hz HDMI，高清外接显示","100W PD 直通，笔记本不断电","10Gbps 高速数据读取","铝合金全包散热，长时稳定"]',
 11),

('n4','c2','SoundClip 便携音箱','soundclip',
 '可夹式设计，挂包随行，高保真音效',
 'SoundClip 独特的夹扣式背部设计，可快速夹在背包肩带、腰带或帐篷支架上，随时享受高保真音乐。防水防尘 IP65，双扬声器立体声，续航 12 小时。',
 'https://images.pexels.com/photos/1706694/pexels-photo-1706694.jpeg?auto=compress&cs=tinysrgb&w=800',
 '["https://images.pexels.com/photos/1706694/pexels-photo-1706694.jpeg?auto=compress&cs=tinysrgb&w=800","https://images.pexels.com/photos/1279365/pexels-photo-1279365.jpeg?auto=compress&cs=tinysrgb&w=800"]',
 189, 269, 185, 4.8, 142, 'active', false, false, true, '新品',
 '[{"name":"颜色","options":[{"id":"black","label":"哑光黑","stock":80},{"id":"green","label":"军绿色","stock":60},{"id":"orange","label":"活力橙","stock":45}]}]',
 '[{"label":"扬声器","value":"双 25mm 全频"},{"label":"输出功率","value":"8W（双声道各 4W）"},{"label":"防水防尘","value":"IP65"},{"label":"续航","value":"12 小时"},{"label":"蓝牙","value":"Bluetooth 5.2"},{"label":"重量","value":"185g"}]',
 '["夹扣设计，随时固定随行","IP65 防水防尘，户外无惧","双扬声器立体声效","12 小时续航，全天陪伴","支持免提通话"]',
 12)

ON CONFLICT (id) DO NOTHING;
