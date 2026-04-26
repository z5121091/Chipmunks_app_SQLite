import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { Spacing } from '@/constants/theme';

// 类型定义
interface HelpItem {
  id: string;
  title: string;
  description: string;
  tip?: string;
}

interface HelpModule {
  id: string;
  title: string;
  icon: 'home' | 'archive' | 'send' | 'clipboard' | 'link' | 'settings' | 'file-text';
  items: HelpItem[];
}

// 使用说明数据
const HELP_DATA: HelpModule[] = [
  {
    id: '1',
    title: '首页',
    icon: 'home',
    items: [
      {
        id: '1.1',
        title: '功能入口',
        description: '首页采用2×3网格布局，展示六大功能入口：扫码入库、扫码出库、订单管理、盘点管理、物料管理、系统设置。',
      },
      {
        id: '1.2',
        title: '扫码出库入口',
        description: '点击"扫码出库"直接进入PDA扫码页面，支持扫描枪快速录入。',
      },
    ],
  },
  {
    id: '2',
    title: '扫码入库',
    icon: 'archive',
    items: [
      {
        id: '2.1',
        title: '选择仓库',
        description: '进入扫码入库页面后，首先选择目标仓库。切换仓库时会自动保存当前页面积累数据。',
        tip: '系统会自动选中默认仓库，也可点击切换其他仓库。',
      },
      {
        id: '2.2',
        title: '扫描录入',
        description: '使用PDA扫描枪扫描物料二维码，系统自动识别二维码并提取型号信息。手动输入内容后按回车也可提交。',
        tip: '二维码包含分隔符（如 ||、/、| 等）时会震动提示；一维码无分隔符会静默忽略。',
      },
      {
        id: '2.3',
        title: '供应商自动带出',
        description: '型号已在物料管理中维护 → 自动带出绑定的供应商。型号未维护 → 供应商留空，需后续手动补充。',
      },
      {
        id: '2.4',
        title: '重复扫码处理',
        description: '检测到重复扫码时提示"该物料已扫码"，可选择作废重复数据。',
      },
      {
        id: '2.5',
        title: '同型号自动聚合',
        description: '同一型号多次扫描时数量自动合并相加。',
        tip: '可删除单条记录，也可删除整个聚合项。',
      },
      {
        id: '2.6',
        title: '入库数据管理',
        description: '仅缓存数据，支持导出入库单，不改动实际库存。点击顶部"历史"可查看历史入库记录。',
      },
      {
        id: '2.7',
        title: '确认入库',
        description: '扫描完成后点击"确认入库"按钮保存入库记录，入库成功后自动生成入库单号。',
      },
    ],
  },
  {
    id: '3',
    title: '扫码出库',
    icon: 'send',
    items: [
      {
        id: '3.1',
        title: '选择仓库',
        description: '进入扫码出库页面后，首先选择目标仓库。切换仓库时会自动保存当前页面积累数据。',
      },
      {
        id: '3.2',
        title: '扫描二维码 / 订单码',
        description: '可扫描物料二维码或订单码。系统自动识别内容类型。',
      },
      {
        id: '3.3',
        title: '订单自动处理',
        description: '扫描到订单码时：无订单自动新建，有订单自动切换载入。扫描到物料二维码时，自动关联到当前订单。',
        tip: '订单号格式：IO-年-月-日-序号。',
      },
      {
        id: '3.4',
        title: '数据聚合累加',
        description: '同一物料多次扫描时数量自动累加。',
      },
      {
        id: '3.5',
        title: '仅可删除',
        description: '出库数据仅支持删除操作，不可编辑、不可拆包。',
      },
      {
        id: '3.6',
        title: '重复扫码处理',
        description: '检测到重复扫码时震动提示"该物料已扫码"。',
      },
      {
        id: '3.7',
        title: '导出出库单',
        description: '点击"导出"可将出库单数据导出。',
      },
    ],
  },
  {
    id: '4',
    title: '订单管理',
    icon: 'file-text',
    items: [
      {
        id: '4.1',
        title: '订单列表',
        description: '展示所有出库订单，支持按状态筛选（全部/待发货/已发货）。',
      },
      {
        id: '4.2',
        title: '创建订单',
        description: '点击右下角"+"按钮创建新订单，输入订单号和客户名称后保存。',
      },
      {
        id: '4.3',
        title: '唯一拆包入口',
        description: '订单管理是唯一的拆包入口。适用于整包货品客户只拿部分数量的情况。',
        tip: '扫码出库页面不支持拆包，如需拆包请到订单管理操作。',
      },
      {
        id: '4.4',
        title: '执行拆包',
        description: '点击订单进入详情，点击物料执行拆包。输入发货数量后，系统自动生成两张标签：发货标签 + 剩余标签。',
      },
      {
        id: '4.5',
        title: '标签生成规则',
        description: '发货标签数量 = 输入的发货数量。剩余标签数量 = 原数量 - 发货数量。页面物料数量更新为发货数量。',
      },
      {
        id: '4.6',
        title: '标签导出与暂存',
        description: '单条标签可单独导出，也可暂存后续处理。',
      },
      {
        id: '4.7',
        title: '查看详情与操作',
        description: '点击订单卡片可查看物料信息。点击"导出"可导出订单数据为Excel文件。长按订单卡片可删除。',
      },
    ],
  },
  {
    id: '5',
    title: '盘点管理',
    icon: 'clipboard',
    items: [
      {
        id: '5.1',
        title: '选择仓库',
        description: '进入盘点页面后，首先选择目标仓库。切换仓库时会自动保存当前页面积累数据。',
      },
      {
        id: '5.2',
        title: '盘点模式',
        description: '支持两种模式，点击顶部Tab切换：整包盘点、拆包盘点。',
      },
      {
        id: '5.3',
        title: '整包盘点',
        description: '扫描物料二维码，系统自动识别并聚合。仅支持删除操作，不可修改数量。',
        tip: '适用于盘点完整包装的物料。',
      },
      {
        id: '5.4',
        title: '拆包盘点',
        description: '扫描物料二维码后，录入实际库存数量。系统生成替换新标签（原标签作废）。',
        tip: '适用于需要修正库存数量的盘点场景。',
      },
      {
        id: '5.5',
        title: '重复扫码处理',
        description: '检测到重复扫码时震动提示。',
      },
      {
        id: '5.6',
        title: '导出盘点结果',
        description: '点击"导出"可导出盘点结果，包含盘点修正后的拆包替换标签。',
      },
      {
        id: '5.7',
        title: '保存盘点',
        description: '扫描完成后点击"保存盘点"按钮，盘点记录保存到数据库。',
      },
    ],
  },
  {
    id: '6',
    title: '物料管理',
    icon: 'link',
    items: [
      {
        id: '6.1',
        title: '功能说明',
        description: '物料管理用于维护型号与供应商的绑定关系。后续扫码时，系统通过"型号"匹配自动带出供应商。',
      },
      {
        id: '6.2',
        title: '录入方式',
        description: '支持两种录入方式：手动逐条新增、模板导入/导出。',
      },
      {
        id: '6.3',
        title: '维护字段',
        description: '可维护以下字段：型号、供应商、存货编码、备注。',
      },
      {
        id: '6.4',
        title: '新增绑定',
        description: '点击右上角"+"按钮新增绑定，填写信息后保存。',
      },
      {
        id: '6.5',
        title: '编辑删除',
        description: '点击绑定记录进入编辑模式。左滑绑定记录可删除。',
      },
      {
        id: '6.6',
        title: '导入导出',
        description: '点击"导出模板"获取Excel模板，填写后点击"导入"批量导入绑定数据。',
        tip: '导入前请确保Excel格式与模板一致。',
      },
    ],
  },
  {
    id: '7',
    title: '系统设置',
    icon: 'settings',
    items: [
      {
        id: '7.1',
        title: '基础设置',
        description: '包含仓库管理、扫码提示音开关、版本检测与更新下载。',
      },
      {
        id: '7.2',
        title: '仓库管理',
        description: '可新增、编辑、删除仓库，并设置默认仓库。',
      },
      {
        id: '7.3',
        title: '扫码提示音',
        description: '可开启/关闭扫码成功、重复、错误时的语音播报和震动反馈。',
      },
      {
        id: '7.4',
        title: '版本检测与更新',
        description: '点击"检查更新"可从NAS远程检测并下载最新版本APK。下载完成后自动保存到Downloads文件夹。',
        tip: 'Android 7.0需要开启存储权限，Android 13需要开启"安装未知来源应用"权限。',
      },
      {
        id: '7.5',
        title: '解析配置 - 解析规则',
        description: '配置二维码解析规则，包含规则名称、分隔符、字段顺序三部分。系统根据规则解析扫码内容。',
        tip: '可添加多条规则，设置匹配条件实现自动识别。',
      },
      {
        id: '7.5.1',
        title: '分隔符设置',
        description: '支持预设分隔符（/、|、,、*、#、;、||、//）和自定义分隔符（括号对如 {}、()、[]、<>，或自定义两字符符号）。',
      },
      {
        id: '7.5.2',
        title: '字段顺序配置',
        description: '点击字段按钮添加标准字段（型号、批次、封装、版本号、数量、生产日期、追踪码、箱号），可拖动调整顺序。',
        tip: '字段顺序必须与扫码内容实际顺序一致，否则解析结果会错位。',
      },
      {
        id: '7.5.3',
        title: '匹配条件',
        description: '可设置匹配条件精确识别规则。例如：第1个字段包含"BL"则匹配该规则。适用于多个规则的扫码内容格式不同的情况。',
      },
      {
        id: '7.5.4',
        title: '规则匹配优先级',
        description: '系统优先匹配有匹配条件的规则（条件越多优先级越高），其次按字段数量精确匹配或近似匹配，最后无匹配则自动识别。',
      },
      {
        id: '7.6',
        title: '解析配置 - 自定义字段',
        description: '可扩展自定义字段，在解析规则中添加使用。适用于标准字段无法满足的特殊扫码格式。',
      },
      {
        id: '7.7',
        title: '数据同步',
        description: '手动填写服务器IP和端口，对接电脑同步脚本。',
        tip: '需配合电脑端同步脚本使用。',
      },
      {
        id: '7.7.1',
        title: '同步内容',
        description: '支持同步：入库单、出库单、盘点单、盘点拆包标签、订单拆包标签。',
      },
      {
        id: '7.8',
        title: '备份与恢复',
        description: '备份：解析规则、自定义字段、物料绑定、仓库、同步服务器配置。点击"恢复"可一键还原所有配置。',
      },
      {
        id: '7.9',
        title: '数据管理',
        description: '可清空：订单数据、物料数据、标签缓存数据。',
        tip: '清空数据不可恢复，请谨慎操作。',
      },
    ],
  },
];

export default function HelpScreen() {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();

  const renderModule = (module: HelpModule) => {
    return (
      <View key={module.id} style={styles.moduleBlock}>
        <View style={styles.moduleHeader}>
          <View style={styles.moduleIcon}>
            <Feather name={module.icon} size={16} color={theme.primary} />
          </View>
          <Text style={styles.moduleTitle}>{module.id}. {module.title}</Text>
        </View>
        
        {module.items.map((item) => (
          <View key={item.id} style={styles.itemContainer}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>{item.id}</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
                {item.tip && (
                  <View style={styles.tipBox}>
                    <Text style={styles.tipText}>{item.tip}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: Spacing['5xl'] + insets.bottom 
          }
        ]}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>使用说明</Text>
        </View>

        {HELP_DATA.map(renderModule)}
      </ScrollView>
    </Screen>
  );
}
