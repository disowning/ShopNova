# ShopNova 数据库结构说明

项目数据库基于 Supabase，迁移文件位于 `supabase/migrations`。当前 RLS 策略主要服务开发测试，多个表允许 anon 读写，生产环境必须重新设计权限。

## users

用途：开发测试用户表，用于普通用户和管理员登录。

关键字段：

- `id`：UUID 主键。
- `email`：唯一邮箱。
- `password_hash`：当前保存明文密码。
- `name`、`phone`、`avatar_url`：用户资料。
- `role`：`customer` 或 `admin`。
- `country`、`member_level`、`status`、`total_spend`、`order_count`、`last_order_at`：客户管理扩展字段。
- `created_at`、`updated_at`：时间字段。

关联关系：

- `orders.user_id` 可关联 `users.id`。
- `shipping_addresses.user_id` 可关联 `users.id`。

注意事项：

- 当前不是生产级认证表。
- `password_hash` 实际明文存储和比对。
- 初始化测试账号为 `customer@test.com / 123456` 和 `admin@test.com / 123456`。

## product_categories

用途：商品分类表，用于前台分类展示和后台分类管理。

关键字段：

- `id`：文本主键，种子数据如 `c1`。
- `name`、`slug`、`icon`、`gradient`、`description`：展示字段。
- `parent_id`：父分类 ID。
- `count`：展示用数量字段，后台会按商品表重新计算当前页分类商品数。
- `sort_order`：排序。
- `status`：启用状态。
- `deleted_at`：软删除字段。

关联关系：

- `products.category_id` 关联 `product_categories.id`。
- `product_categories.parent_id` 自关联 `product_categories.id`。

注意事项：

- 后台删除分类为写入 `deleted_at`，不是物理删除。

## products

用途：商品主表，用于前台商城展示和后台商品管理。

关键字段：

- `id`：文本主键。
- `category_id`：分类 ID。
- `name`、`slug`、`subtitle`、`short_description`、`description`、`detail_description`：商品文案。
- `image_url`、`main_image_url`、`images`：主图和图片数组。
- `price`、`original_price`、`stock`、`rating`、`sold_count`：价格、库存和展示统计。
- `status`：`active` 或 `inactive`。
- `is_featured`、`is_hot`、`is_new`、`is_flash_sale`：展示标记。
- `tag`：旧版 badge 字段。
- `sku_groups`、`specs`、`highlights`：兼容旧版 mock 数据结构的 JSON 字段。
- `seo_title`、`seo_description`：SEO 字段。
- `deleted_at`：软删除字段。

关联关系：

- 多对一关联 `product_categories`。
- 一对多关联 `product_images`、`product_skus`、`product_attributes`。
- 通过 `product_tag_relations` 多对多关联 `product_tags`。

注意事项：

- 前台只读取 `status = active` 且未软删除的商品。
- 新 SKU、图片、参数表为空时，前台会回退到 `products` 中的 JSON 字段。

## product_images

用途：商品多图表。

关键字段：

- `id`：UUID 主键。
- `product_id`：商品 ID。
- `image_url`：图片 URL。
- `alt_text`：图片替代文本。
- `sort_order`：排序。
- `is_main`：是否主图。

关联关系：

- `product_id` 关联 `products.id`，商品删除时级联删除。

注意事项：

- 当前后台通过手动输入图片 URL 管理图片。
- 第一张图片会同步为商品主图。

## product_skus

用途：商品 SKU 表，用于商品变体、独立价格和库存。

关键字段：

- `id`：UUID 主键。
- `product_id`：商品 ID。
- `sku_code`、`sku_name`：SKU 编码和名称。
- `price`、`original_price`、`stock`：SKU 价格和库存。
- `image_url`：SKU 图片 URL。
- `attributes_json`：SKU 属性，如颜色、尺寸。
- `status`：SKU 状态。
- `sort_order`：排序。
- `deleted_at`：软删除字段。

关联关系：

- `product_id` 关联 `products.id`。
- `order_items.sku_id` 可保存下单时的 SKU ID。

注意事项：

- 订单项会保存 SKU 快照，即使后续 SKU 被修改或软删除，历史订单仍可展示当时信息。

## product_attributes

用途：商品规格参数表。

关键字段：

- `id`：UUID 主键。
- `product_id`：商品 ID。
- `name`：参数名。
- `value`：参数值。
- `sort_order`：排序。

关联关系：

- `product_id` 关联 `products.id`。

注意事项：

- 前台商品详情页优先读取该表。
- 如果该表无数据，回退展示 `products.specs`。

## product_tags

用途：商品标签表。

关键字段：

- `id`：UUID 主键。
- `name`：标签名，唯一。
- `slug`：标签 slug，唯一。
- `color`：标签颜色。
- `description`：说明。
- `status`：启用状态。
- `deleted_at`：软删除字段。

关联关系：

- 通过 `product_tag_relations.tag_id` 关联商品。

注意事项：

- 后台商品管理只加载 `status = active` 且未软删除的标签供绑定。

## product_tag_relations

用途：商品和标签的多对多关联表。

关键字段：

- `id`：UUID 主键。
- `product_id`：商品 ID。
- `tag_id`：标签 ID。
- `created_at`：创建时间。

关联关系：

- `product_id` 关联 `products.id`。
- `tag_id` 关联 `product_tags.id`。
- `product_id + tag_id` 唯一。

注意事项：

- 后台保存商品标签时，会先删除旧关联再插入新关联。

## carts

用途：当前迁移中未发现对应数据表。

关键字段：无。

关联关系：无。

注意事项：

- 当前购物车由 `src/storefront/StoreContext.tsx` 在前端内存中维护。
- 页面刷新后购物车状态不会通过数据库恢复。

## cart_items

用途：当前迁移中未发现对应数据表。

关键字段：无。

关联关系：无。

注意事项：

- 当前购物车商品项同样由前端 `StoreContext` 维护。
- 结算提交后，购物车项会转换为 `order_items` 订单明细。

## shipping_addresses

用途：结算时保存收货地址。

关键字段：

- `id`：UUID 主键。
- `user_id`：用户 ID，可为空。
- `recipient_name`、`email`、`phone`：收货人和联系方式。
- `country`、`province`、`city`、`zip`、`street1`、`street2`：地址字段。
- `created_at`、`updated_at`：时间字段。

关联关系：

- `user_id` 可关联 `users.id`。
- `orders.shipping_address_id` 关联 `shipping_addresses.id`。

注意事项：

- 当前结算每次提交都会新增一条收货地址。

## orders

用途：订单主表。

关键字段：

- `id`：UUID 主键。
- `user_id`：下单用户，可为空。
- `order_number`：唯一订单号，如 `ORD-2026-1234`。
- `status`：订单状态。
- `payment_status`：支付状态。
- `subtotal_amount`、`discount_amount`、`shipping_fee`、`tax_amount`、`total_amount`：金额字段。
- `coupon_code`：优惠码。
- `shipping_address_id`：收货地址 ID。
- `delivery_method`：配送方式。
- `notes`：买家备注。
- `created_at`、`updated_at`：时间字段。

关联关系：

- `user_id` 可关联 `users.id`。
- `shipping_address_id` 关联 `shipping_addresses.id`。
- 一对多关联 `order_items`。
- 一对一或一对多关联 `payments`，当前代码按单订单单支付记录读取。

注意事项：

- 模拟支付成功后，订单默认写入 `status = paid`、`payment_status = paid`。
- 后台订单详情支持更新 `status`。

## order_items

用途：订单明细表，每个商品/SKU 一条记录。

关键字段：

- `id`：UUID 主键。
- `order_id`：订单 ID。
- `product_id`、`product_name`、`product_image`：商品快照。
- `sku_description`：SKU 描述。
- `sku_id`、`sku_name`、`sku_attributes_json`：SKU 快照字段。
- `unit_price`、`qty`、`subtotal`：价格和数量。
- `created_at`：创建时间。

关联关系：

- `order_id` 关联 `orders.id`，订单删除时级联删除。
- `sku_id` 保存下单时 SKU ID，但迁移中只新增字段，未强制外键。

注意事项：

- SKU 快照用于保护历史订单展示，不依赖后续商品或 SKU 变更。

## payments

用途：支付记录表，当前用于模拟支付流水。

关键字段：

- `id`：UUID 主键。
- `order_id`：订单 ID。
- `payment_method`：支付方式。
- `status`：支付状态。
- `amount`：支付金额。
- `card_holder_name`、`card_number`、`card_last4`、`card_expiry`、`card_cvv`：卡信息字段。
- `transaction_id`：模拟交易号。
- `gateway_response`：模拟网关响应 JSON。
- `created_at`、`updated_at`：时间字段。

关联关系：

- `order_id` 关联 `orders.id`，订单删除时级联删除。

注意事项：

- 当前会保存完整卡号和 CVV，仅适合开发测试。
- 生产环境必须接入真实支付网关，并避免保存敏感支付信息。

## coupons

用途：当前迁移中未发现对应数据表。

关键字段：无。

关联关系：无。

注意事项：

- 当前优惠码逻辑写在 `src/storefront/checkout/CouponBox.tsx`。
- 内置固定优惠码：`WELCOME15`、`SAVE10`、`NOVA20`。
- 订单只保存最终使用的 `coupon_code` 和 `discount_amount`。
