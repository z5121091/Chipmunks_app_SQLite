import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initDatabase, cleanupOldEmptyOrders } from '@/utils/database';
import { Provider } from '@/components/Provider';

/**
 * App 根组件
 * 在 APP 启动时就初始化数据库
 */
export default function RootLayout() {
  useEffect(() => {
    // APP 启动时初始化数据库
    const init = async () => {
      try {
        console.log('[App] 开始初始化数据库...');
        await initDatabase();
        console.log('[App] 数据库初始化完成');

        // 清理 7 天前的空订单
        console.log('[App] 开始清理空订单...');
        const result = await cleanupOldEmptyOrders();
        console.log(`[App] 清理完成，删除了 ${result.deletedCount} 个空订单`);
      } catch (error) {
        console.error('[App] 数据库初始化失败:', error);
      }
    };

    init();
  }, []);

  return (
    <Provider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="inbound" />
        <Stack.Screen name="outbound" />
        <Stack.Screen name="inventory" />
        <Stack.Screen name="orders" />
        <Stack.Screen name="warehouse-management" />
        <Stack.Screen name="rules" />
        <Stack.Screen name="custom-fields" />
        <Stack.Screen name="inventory-binding" />
        <Stack.Screen name="detail" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="help" />
        <Stack.Screen name="changelog" />
      </Stack>
    </Provider>
  );
}
