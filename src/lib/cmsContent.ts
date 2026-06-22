import { supabase } from './supabase';

export type CmsContentGroup = 'home' | 'service' | 'about' | 'policy' | 'marketing';
export type CmsContentStatus = 'draft' | 'ready' | 'published';
export type CmsFieldType = 'text' | 'textarea' | 'url' | 'number';
export type CmsSurface = '前台页面' | '首页模块' | '预留内容';

export interface CmsField {
  key: string;
  label: string;
  value: string;
  type?: CmsFieldType;
  required?: boolean;
  placeholder?: string;
}

export interface CmsItem {
  id: string;
  group: CmsContentGroup;
  title: string;
  path: string;
  status: CmsContentStatus;
  updatedAt: string;
  summary: string;
  surface: CmsSurface;
  fields: CmsField[];
  modules: string[];
  system?: boolean;
}

export interface CmsContentState {
  version: 1;
  updatedAt: string;
  items: CmsItem[];
}

interface SettingsDataRow {
  cmsContent?: Partial<CmsContentState>;
}

interface DBCmsItem {
  id: string;
  item_group: CmsContentGroup;
  title: string;
  path: string;
  status: CmsContentStatus;
  summary: string;
  surface: CmsSurface;
  fields: unknown;
  modules: unknown;
  system: boolean;
  sort_order: number;
  updated_at: string;
}

const today = '2026-05-24';

const isLegacySeoField = (field: CmsField) => /Seo(Title|Description)$/i.test(field.key);

function cleanCmsItem(item: CmsItem): CmsItem {
  return {
    ...item,
    fields: item.fields.filter((field) => !isLegacySeoField(field)),
  };
}

export const DEFAULT_CMS_ITEMS: CmsItem[] = [
  {
    id: 'home-hero',
    group: 'home',
    title: '首页首屏',
    path: '/#hero',
    status: 'draft',
    updatedAt: today,
    summary: '管理首页首屏标签、标题、按钮、信任卖点和主视觉说明。',
    surface: '首页模块',
    system: true,
    fields: [
      { key: 'eyebrow', label: '顶部标签', value: '新品精选 · 智能生活', required: true },
      { key: 'titleLine1', label: '标题第一行', value: '发现更聪明的', required: true },
      { key: 'titleLine2', label: '标题高亮行', value: '生活方式', required: true },
      { key: 'subtitleLine1', label: '副标题第一行', value: '精选智能配件与生活方式好物', type: 'textarea', required: true },
      { key: 'subtitleLine2', label: '副标题第二行', value: '让科技融入你的日常。', type: 'textarea' },
      { key: 'primaryButton', label: '主按钮文案', value: '立即选购', required: true },
      { key: 'secondaryButton', label: '辅助按钮文案', value: '查看热门优惠' },
      { key: 'ratingLabel', label: '信任卖点 1', value: '4.9 用户评分' },
      { key: 'freeShipping', label: '信任卖点 2', value: '满额免邮' },
      { key: 'fastShip', label: '信任卖点 3', value: '快速发货' },
    ],
    modules: ['首屏标签', '主标题', '按钮组', '信任卖点', '主视觉商品'],
  },
  {
    id: 'home-categories',
    group: 'home',
    title: '首页分类区',
    path: '/#categories',
    status: 'ready',
    updatedAt: today,
    summary: '管理分类区标题、说明、展示数量和前台入口文案。',
    surface: '首页模块',
    system: true,
    fields: [
      { key: 'title', label: '模块标题', value: '热门分类', required: true },
      { key: 'subtitle', label: '模块说明', value: '按使用场景快速找到合适的商品。', type: 'textarea' },
      { key: 'displayCount', label: '展示分类数量', value: '6', type: 'number' },
    ],
    modules: ['分类标题', '分类卡片', '排序规则', '更多入口'],
  },
  {
    id: 'home-featured',
    group: 'home',
    title: '推荐商品区',
    path: '/#featured',
    status: 'ready',
    updatedAt: today,
    summary: '管理首页推荐商品区标题、说明和推荐规则。',
    surface: '首页模块',
    system: true,
    fields: [
      { key: 'title', label: '模块标题', value: '精选推荐', required: true },
      { key: 'subtitle', label: '模块说明', value: '从热门商品中挑选更值得看的选择。', type: 'textarea' },
      { key: 'ruleNote', label: '推荐规则说明', value: '优先展示后台标记为推荐的商品。', type: 'textarea' },
    ],
    modules: ['推荐标题', '推荐规则', '商品卡片', '更多商品入口'],
  },
  {
    id: 'home-flash-sale',
    group: 'home',
    title: '限时抢购区',
    path: '/#flash-sale',
    status: 'draft',
    updatedAt: today,
    summary: '管理秒杀区标题、倒计时说明、活动按钮和活动提醒文案。',
    surface: '首页模块',
    system: true,
    fields: [
      { key: 'title', label: '模块标题', value: '限时抢购', required: true },
      { key: 'subtitle', label: '活动说明', value: '精选好物限时优惠，售完即止。', type: 'textarea' },
      { key: 'timerLabel', label: '倒计时标签', value: '距离结束' },
      { key: 'ctaText', label: '按钮文案', value: '查看全部优惠' },
    ],
    modules: ['活动标题', '倒计时', '秒杀商品', '库存进度', '活动入口'],
  },
  {
    id: 'home-new-arrivals',
    group: 'home',
    title: '新品上架区',
    path: '/#new-arrivals',
    status: 'ready',
    updatedAt: today,
    summary: '管理新品模块标题、说明、展示规则和入口。',
    surface: '首页模块',
    system: true,
    fields: [
      { key: 'title', label: '模块标题', value: '新品上架', required: true },
      { key: 'subtitle', label: '模块说明', value: '近期上新的智能配件和生活方式好物。', type: 'textarea' },
      { key: 'displayCount', label: '展示商品数量', value: '8', type: 'number' },
    ],
    modules: ['新品标题', '新品规则', '商品列表', '查看更多入口'],
  },
  {
    id: 'home-benefits',
    group: 'home',
    title: '首页权益区',
    path: '/#benefits',
    status: 'ready',
    updatedAt: today,
    summary: '管理免邮、售后、支付安全、会员权益等前台权益说明。',
    surface: '首页模块',
    system: true,
    fields: [
      { key: 'tag', label: '顶部标签', value: '服务保障' },
      { key: 'title', label: '模块标题', value: '为什么选择 ShopNova', required: true },
      { key: 'subtitle', label: '模块说明', value: '从下单到售后，每一步都更安心。', type: 'textarea' },
      { key: 'benefit1Title', label: '权益 1 标题', value: '正品保障' },
      { key: 'benefit1Desc', label: '权益 1 说明', value: '精选可靠商品，提供清晰的商品信息。', type: 'textarea' },
      { key: 'benefit2Title', label: '权益 2 标题', value: '快速发货' },
      { key: 'benefit2Desc', label: '权益 2 说明', value: '订单支付完成后尽快处理发货。', type: 'textarea' },
      { key: 'benefit3Title', label: '权益 3 标题', value: '无忧售后' },
      { key: 'benefit3Desc', label: '权益 3 说明', value: '按规则支持退换货和售后咨询。', type: 'textarea' },
      { key: 'benefit4Title', label: '权益 4 标题', value: '安全支付' },
      { key: 'benefit4Desc', label: '权益 4 说明', value: '支付信息按安全流程处理。', type: 'textarea' },
    ],
    modules: ['权益标题', '权益卡片', '图标配置', '说明文案'],
  },
  {
    id: 'home-reviews',
    group: 'home',
    title: '用户评价区',
    path: '/#reviews',
    status: 'draft',
    updatedAt: today,
    summary: '管理评价区标题、说明、精选评价和评价展示规则。',
    surface: '首页模块',
    system: true,
    fields: [
      { key: 'title', label: '模块标题', value: '真实用户反馈', required: true },
      { key: 'subtitle', label: '模块说明', value: '来自用户的真实使用体验。', type: 'textarea' },
      { key: 'reviewSource', label: '评价来源说明', value: '优先展示已完成订单评价。' },
    ],
    modules: ['评价标题', '评价卡片', '评分展示', '展示开关'],
  },
  {
    id: 'home-newsletter',
    group: 'home',
    title: '订阅区',
    path: '/#newsletter',
    status: 'draft',
    updatedAt: today,
    summary: '管理邮件订阅模块标题、说明、输入提示和提交按钮。',
    surface: '首页模块',
    system: true,
    fields: [
      { key: 'title', label: '模块标题', value: '订阅新品与优惠', required: true },
      { key: 'subtitleLine1', label: '说明第一行', value: '第一时间获取新品上架、限时优惠和购物灵感。', type: 'textarea' },
      { key: 'subtitleLine2', label: '说明第二行', value: '我们只发送真正有价值的内容。', type: 'textarea' },
      { key: 'placeholder', label: '输入框提示', value: '输入你的邮箱' },
      { key: 'buttonText', label: '按钮文案', value: '立即订阅' },
      { key: 'subscribedText', label: '成功文案', value: '已订阅' },
      { key: 'privacy', label: '隐私提示', value: '订阅即表示你同意接收 ShopNova 的邮件。', type: 'textarea' },
    ],
    modules: ['订阅标题', '邮箱输入', '提交按钮', '隐私提示'],
  },
  {
    id: 'order-lookup',
    group: 'service',
    title: '订单查询',
    path: '/order-lookup',
    status: 'published',
    updatedAt: today,
    summary: '说明用户如何查看订单状态、物流进度和售后记录。',
    surface: '前台页面',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: '订单查询', required: true },
      { key: 'subtitle', label: '页面说明', value: '登录后即可查看订单状态、物流进度和售后记录。', type: 'textarea', required: true },
      { key: 'buttonText', label: '按钮文案', value: '查看我的订单' },
      { key: 'note', label: '注意事项', value: '如无法登录或找不到订单，请联系客服协助处理。', type: 'textarea' },
    ],
    modules: ['页面头图', '说明卡片', '行动按钮', '注意事项'],
  },
  {
    id: 'return-policy',
    group: 'service',
    title: '退换货政策',
    path: '/return-policy',
    status: 'ready',
    updatedAt: today,
    summary: '管理退换货条件、处理流程、费用说明和售后联系提示。',
    surface: '前台页面',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: '退换货政策', required: true },
      { key: 'subtitle', label: '页面说明', value: '了解退换货规则、处理流程和注意事项。', type: 'textarea', required: true },
      { key: 'window', label: '售后窗口', value: '7 天' },
      { key: 'process', label: '处理流程', value: '提交申请 - 客服审核 - 寄回商品 - 退款或换货', type: 'textarea' },
    ],
    modules: ['适用条件', '处理流程', '费用说明', '售后提示'],
  },
  {
    id: 'logistics',
    group: 'service',
    title: '物流说明',
    path: '/logistics',
    status: 'draft',
    updatedAt: today,
    summary: '管理发货时效、配送范围、物流追踪和异常件处理说明。',
    surface: '前台页面',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: '物流说明', required: true },
      { key: 'subtitle', label: '页面说明', value: '查看发货时效、配送范围和物流追踪方式。', type: 'textarea', required: true },
      { key: 'shippingTime', label: '发货时效', value: '订单支付完成后 24-48 小时内处理发货。', type: 'textarea' },
      { key: 'exceptionNote', label: '异常提示', value: '如物流长时间未更新，请联系客服协助处理。', type: 'textarea' },
    ],
    modules: ['发货时效', '配送范围', '物流追踪', '异常处理'],
  },
  {
    id: 'faq-main',
    group: 'service',
    title: 'FAQ 常见问题',
    path: '/faq',
    status: 'ready',
    updatedAt: today,
    summary: '管理购物、配送、支付、售后等常见问题与答案。',
    surface: '前台页面',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: '常见问题', required: true },
      { key: 'subtitle', label: '页面说明', value: '快速找到购物、配送、支付和售后的常见答案。', type: 'textarea' },
      { key: 'question1', label: '问题 1', value: '如何查询订单？' },
      { key: 'answer1', label: '答案 1', value: '登录账号后可在用户中心查看订单。', type: 'textarea' },
      { key: 'question2', label: '问题 2', value: '可以使用哪些优惠码？' },
      { key: 'answer2', label: '答案 2', value: '可在结算页输入有效优惠码，系统会自动计算优惠金额。', type: 'textarea' },
      { key: 'question3', label: '问题 3', value: '支付是真实扣款吗？' },
      { key: 'answer3', label: '答案 3', value: '演示环境不会真实扣款，生产环境需要接入真实支付网关。', type: 'textarea' },
      { key: 'question4', label: '问题 4', value: '购物车会保存吗？' },
      { key: 'answer4', label: '答案 4', value: '登录后可扩展持久化购物车；当前演示环境以页面状态为主。', type: 'textarea' },
      { key: 'question5', label: '问题 5', value: '如何查看历史订单？' },
      { key: 'answer5', label: '答案 5', value: '登录后进入用户中心的订单列表即可查看历史订单。', type: 'textarea' },
      { key: 'question6', label: '问题 6', value: '后台可以处理订单吗？' },
      { key: 'answer6', label: '答案 6', value: '管理员可在后台查看订单并更新订单状态。', type: 'textarea' },
    ],
    modules: ['购物问题', '配送问题', '支付问题', '售后问题', '联系客服入口'],
  },
  {
    id: 'brand-story',
    group: 'about',
    title: '品牌故事',
    path: '/brand-story',
    status: 'ready',
    updatedAt: today,
    summary: '管理品牌起源、价值观、团队介绍和品牌承诺。',
    surface: '前台页面',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: '关于 ShopNova', required: true },
      { key: 'subtitle', label: '页面说明', value: '我们希望用清晰顺畅的购物体验连接好产品与真实需求。', type: 'textarea', required: true },
      { key: 'story', label: '品牌正文', value: 'ShopNova 专注智能配件与生活方式好物。', type: 'textarea' },
      { key: 'promise', label: '品牌承诺', value: '精选、可靠、好用' },
    ],
    modules: ['品牌故事', '价值观', '团队介绍', '品牌承诺'],
  },
  {
    id: 'contact-us',
    group: 'about',
    title: '联系我们',
    path: '/contact-us',
    status: 'published',
    updatedAt: today,
    summary: '管理联系我们页面标题、说明和客服提示文案。客服邮箱、电话、公司地址和商务邮箱统一在站点配置维护。',
    surface: '前台页面',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: '联系我们', required: true },
      { key: 'subtitle', label: '联系说明', value: '如有订单、售后、合作或媒体需求，可通过对应渠道联系我们。', type: 'textarea' },
      { key: 'serviceNote', label: '客服提示', value: '工作日 09:00-18:00 回复' },
    ],
    modules: ['页面标题', '联系说明', '客服提示'],
  },
  {
    id: 'careers',
    group: 'about',
    title: '招聘信息',
    path: '/careers',
    status: 'draft',
    updatedAt: today,
    summary: '管理招聘页面标题、岗位列表、投递方式和团队介绍。',
    surface: '前台页面',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: '招聘信息', required: true },
      { key: 'subtitle', label: '页面说明', value: '欢迎关注电商、产品体验和技术创新的伙伴加入。', type: 'textarea' },
      { key: 'roles', label: '岗位列表', value: '前端工程师 / 电商运营 / 客户支持 / 产品设计', type: 'textarea' },
      { key: 'applyEmail', label: '投递邮箱', value: 'careers@shopnova.com' },
    ],
    modules: ['招聘介绍', '岗位卡片', '团队说明', '投递方式'],
  },
  {
    id: 'media-cooperation',
    group: 'about',
    title: '媒体合作',
    path: '/media-cooperation',
    status: 'draft',
    updatedAt: today,
    summary: '管理媒体合作页面标题、合作方向和说明文案。媒体合作邮箱统一在站点配置维护。',
    surface: '前台页面',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: '媒体合作', required: true },
      { key: 'subtitle', label: '页面说明', value: '面向科技媒体、内容创作者、品牌伙伴开放合作。', type: 'textarea' },
      { key: 'directions', label: '合作方向', value: '媒体报道 / 联合推广 / 内容合作', type: 'textarea' },
    ],
    modules: ['页面标题', '合作方向', '合作说明', '案例说明'],
  },
  {
    id: 'privacy-policy',
    group: 'policy',
    title: '隐私政策',
    path: '/privacy',
    status: 'draft',
    updatedAt: today,
    summary: '管理隐私政策章节、数据使用说明、用户权利和更新时间。',
    surface: '前台页面',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: '隐私政策', required: true },
      { key: 'intro', label: '政策简介', value: '说明我们如何收集、使用、保存和保护用户信息。', type: 'textarea', required: true },
      { key: 'updatedAt', label: '更新日期', value: today },
      { key: 'contact', label: '隐私联系邮箱', value: 'privacy@shopnova.com' },
      { key: 'collectTitle', label: '信息收集标题', value: '信息的收集' },
      { key: 'collectBody', label: '信息收集正文', value: '当用户注册、下单、支付或联系客服时，我们会收集完成服务所需的信息。', type: 'textarea' },
      { key: 'useTitle', label: '信息使用标题', value: '信息的使用' },
      { key: 'useBody', label: '信息使用正文', value: '我们使用这些信息处理订单、完成配送、提供售后、验证账户安全和优化购物体验。', type: 'textarea' },
      { key: 'shareTitle', label: '信息共享标题', value: '信息的共享' },
      { key: 'shareBody', label: '信息共享正文', value: '我们不会出售用户个人信息。履行订单时，必要信息可能会共享给物流、支付和云服务合作方。', type: 'textarea' },
      { key: 'cookiesTitle', label: 'Cookie 标题', value: 'Cookie 与追踪技术' },
      { key: 'cookiesBody', label: 'Cookie 正文', value: '我们使用必要 Cookie 维持登录和购物车状态，也可能使用功能、分析和营销 Cookie 改善体验。', type: 'textarea' },
      { key: 'securityTitle', label: '数据安全标题', value: '数据安全' },
      { key: 'securityBody', label: '数据安全正文', value: '我们通过访问控制、传输加密、权限隔离和安全审计保护数据。', type: 'textarea' },
      { key: 'rightsTitle', label: '用户权利标题', value: '你的权利' },
      { key: 'rightsBody', label: '用户权利正文', value: '用户可以请求访问、更正、删除或导出个人信息，也可以撤回部分授权。', type: 'textarea' },
      { key: 'minorsTitle', label: '未成年人保护标题', value: '未成年人保护' },
      { key: 'minorsBody', label: '未成年人保护正文', value: '本平台面向成年人使用。若发现无意中收集了未成年人信息，请立即联系我们处理。', type: 'textarea' },
      { key: 'updatesTitle', label: '政策更新标题', value: '政策更新' },
      { key: 'updatesBody', label: '政策更新正文', value: '我们可能根据业务和法规变化更新本政策，重大变更会通过站内通知或邮件告知。', type: 'textarea' },
      { key: 'contactTitle', label: '隐私联系我们标题', value: '联系我们' },
      { key: 'contactBody', label: '隐私联系我们正文', value: '如对隐私政策有疑问，请联系 privacy@shopnova.com 或 support@shopnova.com。', type: 'textarea' },
    ],
    modules: ['信息收集', '信息使用', '用户权利', 'Cookie', '联系方式'],
  },
  {
    id: 'terms-of-service',
    group: 'policy',
    title: '服务条款',
    path: '/terms',
    status: 'draft',
    updatedAt: today,
    summary: '管理服务使用规则、订单规则、免责声明和争议处理说明。',
    surface: '前台页面',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: '服务条款', required: true },
      { key: 'intro', label: '条款简介', value: '使用本站即表示用户理解并同意相关服务规则。', type: 'textarea', required: true },
      { key: 'updatedAt', label: '更新日期', value: today },
      { key: 'serviceTitle', label: '服务说明标题', value: '服务说明' },
      { key: 'serviceBody', label: '服务说明正文', value: 'ShopNova 提供商品浏览、账户管理、购物车、结算、订单跟踪和后台管理等电商服务。', type: 'textarea' },
      { key: 'accountTitle', label: '账户规则标题', value: '账户注册与安全' },
      { key: 'accountBody', label: '账户规则正文', value: '用户应提供真实、准确、完整的注册信息，并妥善保管账户凭据。', type: 'textarea' },
      { key: 'productsTitle', label: '商品价格标题', value: '商品与价格' },
      { key: 'productsBody', label: '商品价格正文', value: '我们尽力确保商品图片、描述、规格和价格准确，活动价格以提交订单时为准。', type: 'textarea' },
      { key: 'ordersTitle', label: '订单支付标题', value: '订单与支付' },
      { key: 'ordersBody', label: '订单支付正文', value: '提交订单代表购买要约，订单在确认后成立。生产环境需接入真实合规支付网关。', type: 'textarea' },
      { key: 'shippingTitle', label: '配送物流标题', value: '配送与物流' },
      { key: 'shippingBody', label: '配送物流正文', value: '配送方式和费用以结算页展示为准，物流时效可能受地址、节假日和不可抗力影响。', type: 'textarea' },
      { key: 'returnsTitle', label: '退换退款标题', value: '退换货与退款' },
      { key: 'returnsBody', label: '退换退款正文', value: '实际退换货政策应由商家在生产环境中配置，演示项目暂未实现完整退款流程。', type: 'textarea' },
      { key: 'prohibitedTitle', label: '禁止行为标题', value: '禁止行为' },
      { key: 'prohibitedBody', label: '禁止行为正文', value: '不得利用平台从事欺诈、恶意下单、攻击系统、批量爬取数据或干扰正常服务的行为。', type: 'textarea' },
      { key: 'ipTitle', label: '知识产权标题', value: '知识产权' },
      { key: 'ipBody', label: '知识产权正文', value: '平台页面、文案、图片、标识和代码等内容受知识产权保护，未经授权不得商业使用。', type: 'textarea' },
      { key: 'disclaimerTitle', label: '免责声明标题', value: '免责声明' },
      { key: 'disclaimerBody', label: '免责声明正文', value: '在法律允许范围内，平台按现状提供服务，不对不可抗力或第三方服务异常造成的损失承担责任。', type: 'textarea' },
      { key: 'lawTitle', label: '争议解决标题', value: '法律适用与争议解决' },
      { key: 'lawBody', label: '争议解决正文', value: '本条款适用中华人民共和国法律。争议应先友好协商，协商不成时提交有管辖权的人民法院处理。', type: 'textarea' },
      { key: 'changesTitle', label: '条款变更标题', value: '条款变更' },
      { key: 'changesBody', label: '条款变更正文', value: '我们可能不定期更新条款。重大变更会提前通知，继续使用平台即表示接受更新后的条款。', type: 'textarea' },
      { key: 'contactTitle', label: '条款联系我们标题', value: '联系我们' },
      { key: 'contactBody', label: '条款联系我们正文', value: '如对使用条款有疑问，请联系 legal@shopnova.com 或 support@shopnova.com。', type: 'textarea' },
    ],
    modules: ['账户规则', '订单规则', '配送与退换', '免责声明', '争议处理'],
  },
  {
    id: 'cookie-settings',
    group: 'policy',
    title: 'Cookie 设置',
    path: '/cookies',
    status: 'draft',
    updatedAt: today,
    summary: '管理 Cookie 页面标题、说明、分类解释和用户选择提示。',
    surface: '前台页面',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: 'Cookie 设置', required: true },
      { key: 'subtitle', label: '页面说明', value: '管理用于基础功能、分析和个性化体验的 Cookie。', type: 'textarea' },
      { key: 'necessary', label: '必要 Cookie 说明', value: '用于登录、购物车和结算等基础功能。', type: 'textarea' },
      { key: 'analytics', label: '分析 Cookie 说明', value: '帮助我们理解页面访问和功能使用情况。', type: 'textarea' },
    ],
    modules: ['Cookie 说明', '分类开关', '保存偏好', '重置偏好'],
  },
  {
    id: 'payment-security',
    group: 'policy',
    title: '支付安全说明',
    path: '/payment-security',
    status: 'draft',
    updatedAt: today,
    summary: '预留支付安全、支付方式说明和风控提示内容。',
    surface: '预留内容',
    system: true,
    fields: [
      { key: 'title', label: '页面标题', value: '支付安全说明', required: true },
      { key: 'subtitle', label: '页面说明', value: '了解支付方式、安全保障和异常支付处理方式。', type: 'textarea' },
      { key: 'methods', label: '支持方式', value: '信用卡 / PayPal', type: 'textarea' },
      { key: 'securityNote', label: '安全保障', value: '支付信息会通过支付服务商的安全流程处理，平台不保存完整银行卡敏感信息。', type: 'textarea' },
      { key: 'exceptionNote', label: '异常支付处理', value: '如遇支付失败、重复扣款或状态异常，请保留订单号并联系客服核查。', type: 'textarea' },
      { key: 'refundNote', label: '退款说明', value: '退款会按订单规则和支付渠道流程原路退回，到账时间以支付渠道处理为准。', type: 'textarea' },
    ],
    modules: ['支付方式', '安全保障', '异常处理', '退款说明'],
  },
  {
    id: 'promo-banner',
    group: 'marketing',
    title: '营销活动横幅',
    path: 'marketing/banner',
    status: 'draft',
    updatedAt: today,
    summary: '预留首页或列表页活动横幅，用于节日活动、新品推广和优惠券入口。',
    surface: '预留内容',
    system: true,
    fields: [
      { key: 'tag', label: '横幅标签', value: 'Featured offer' },
      { key: 'title', label: '横幅标题', value: '限时优惠', required: true },
      { key: 'subtitle', label: '横幅说明', value: '满额免邮，新用户首单立减。', type: 'textarea' },
      { key: 'buttonText', label: '按钮文案', value: '立即查看' },
      { key: 'buttonLink', label: '按钮链接', value: '/products', type: 'url' },
      { key: 'imageUrl', label: '横幅图片 URL', value: '', type: 'url' },
    ],
    modules: ['活动标题', '活动图片', '按钮链接', '投放位置'],
  },
  {
    id: 'trust-badges',
    group: 'marketing',
    title: '信任背书组件',
    path: 'marketing/trust',
    status: 'draft',
    updatedAt: today,
    summary: '预留安全支付、快速发货、无忧售后等全站信任背书内容。',
    surface: '预留内容',
    system: true,
    fields: [
      { key: 'badge1', label: '背书 1', value: '安全支付' },
      { key: 'badge2', label: '背书 2', value: '快速发货' },
      { key: 'badge3', label: '背书 3', value: '无忧售后' },
      { key: 'badge4', label: '背书 4', value: '正品保障' },
    ],
    modules: ['背书图标', '背书文案', '展示位置', '移动端样式'],
  },
];

export function mergeCmsContent(saved?: Partial<CmsContentState>): CmsContentState {
  if (!saved?.items?.length) {
    return { version: 1, updatedAt: '', items: DEFAULT_CMS_ITEMS.map(cleanCmsItem) };
  }

  const savedMap = new Map(saved.items.map((item) => [item.id, item]));
  const mergedDefaults = DEFAULT_CMS_ITEMS.map((item) => {
    const savedItem = savedMap.get(item.id);
    return cleanCmsItem(savedItem ? { ...item, ...savedItem, system: item.system ?? savedItem.system } : item);
  });
  const customItems = saved.items
    .filter((item) => !DEFAULT_CMS_ITEMS.some((defaultItem) => defaultItem.id === item.id))
    .map(cleanCmsItem);

  return {
    version: 1,
    updatedAt: saved.updatedAt ?? '',
    items: [...mergedDefaults, ...customItems],
  };
}

function toCmsItem(row: DBCmsItem): CmsItem {
  return cleanCmsItem({
    id: row.id,
    group: row.item_group,
    title: row.title,
    path: row.path,
    status: row.status,
    updatedAt: row.updated_at ? row.updated_at.slice(0, 10) : today,
    summary: row.summary,
    surface: row.surface,
    fields: Array.isArray(row.fields) ? row.fields as CmsField[] : [],
    modules: Array.isArray(row.modules) ? row.modules as string[] : [],
    system: row.system,
  });
}

function toCmsItemRow(item: CmsItem, sortOrder: number) {
  return {
    id: item.id,
    item_group: item.group,
    title: item.title,
    path: item.path,
    status: item.status,
    summary: item.summary,
    surface: item.surface,
    fields: item.fields,
    modules: item.modules,
    system: Boolean(item.system),
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
}

async function fetchCmsItemsFromTable(): Promise<CmsItem[]> {
  const { data, error } = await supabase
    .from('cms_items')
    .select('id, item_group, title, path, status, summary, surface, fields, modules, system, sort_order, updated_at')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) {
    if (error.message.includes('cms_items')) return [];
    throw new Error(`读取 CMS 内容失败：${error.message}`);
  }

  return ((data ?? []) as DBCmsItem[]).map(toCmsItem);
}

export async function fetchAdminCmsContent(): Promise<CmsContentState> {
  const items = await fetchCmsItemsFromTable();
  return mergeCmsContent({ version: 1, updatedAt: '', items });
}

export async function saveCmsContentItems(items: CmsItem[]) {
  const rows = items.map((item, index) => toCmsItemRow(item, index));
  const { error } = await supabase
    .from('cms_items')
    .upsert(rows, { onConflict: 'id' });

  if (error) throw new Error(`保存 CMS 内容失败：${error.message}`);

  const { data: existingRows, error: existingError } = await supabase
    .from('cms_items')
    .select('id')
    .is('deleted_at', null);

  if (existingError) throw new Error(`读取 CMS 内容列表失败：${existingError.message}`);

  const currentIds = new Set(items.map((item) => item.id));
  const removedIds = (existingRows ?? [])
    .map((row: { id: string }) => row.id)
    .filter((id) => !currentIds.has(id));

  if (removedIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('cms_items')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('id', removedIds);

    if (deleteError) throw new Error(`清理已删除 CMS 内容失败：${deleteError.message}`);
  }
}

export function getCmsItem(content: CmsContentState, id: string) {
  return content.items.find((item) => item.id === id);
}

export function getCmsField(content: CmsContentState, itemId: string, fieldKey: string, fallback: string) {
  const item = getCmsItem(content, itemId);
  if (!item || item.status !== 'published') return fallback;
  const field = item.fields.find((entry) => entry.key === fieldKey);
  return field?.value?.trim() || fallback;
}

export async function fetchPublicCmsContent(): Promise<CmsContentState> {
  const items = await fetchCmsItemsFromTable();
  if (items.length > 0) return mergeCmsContent({ version: 1, updatedAt: '', items });

  const { data, error } = await supabase
    .from('admin_settings')
    .select('settings_data')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return mergeCmsContent();
  return mergeCmsContent(((data.settings_data ?? {}) as SettingsDataRow).cmsContent);
}
