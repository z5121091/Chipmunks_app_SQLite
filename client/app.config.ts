import { ExpoConfig, ConfigContext } from 'expo/config';
import versionConfig from './version.json';

const projectId = process.env.COZE_PROJECT_ID || process.env.EXPO_PUBLIC_COZE_PROJECT_ID;
const slugAppName = projectId ? `app${projectId}` : 'myapp';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    "name": versionConfig.appName,
    "slug": slugAppName,
    "version": versionConfig.version,
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    // 浅色模式启动画面
    "splash": {
      "image": "./assets/images/splash.png",
      "backgroundColor": "#ffffff",
      "resizeMode": "contain"
    },
    "ios": {
      "supportsTablet": true,
      // iOS 深色模式启动画面
      "splash": {
        "image": "./assets/images/splash.png",
        "backgroundColor": "#1a1a2e",
        "resizeMode": "contain"
      }
    },
    "android": {
      "package": "com.chipmunks.traceability",
      "versionCode": versionConfig.versionCode,
      // Android 深色模式启动画面
      "splash": {
        "image": "./assets/images/splash.png",
        "backgroundColor": "#1a1a2e",
        "resizeMode": "contain"
      }
    },
    "web": {
      "bundler": "metro",
      "output": "single"
    },
    "plugins": [
      process.env.EXPO_PUBLIC_BACKEND_BASE_URL ? [
        "expo-router",
        {
          "origin": process.env.EXPO_PUBLIC_BACKEND_BASE_URL
        }
      ] : 'expo-router',
      [
        "expo-build-properties",
        {
          "android": {
            // 最低 Android 版本
            "minSdkVersion": 33, // Android 13
            // 允许 HTTP 明文流量（电脑同步功能需要）
            "usesCleartextTraffic": true,
            // 网络权限配置
            "permissions": [
              "android.permission.INTERNET",
              "android.permission.ACCESS_NETWORK_STATE",
              "android.permission.ACCESS_WIFI_STATE",
              "android.permission.REQUEST_INSTALL_PACKAGES",
              "android.permission.WRITE_EXTERNAL_STORAGE",
              "android.permission.READ_EXTERNAL_STORAGE"
            ]
          }
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": `允许元器件溯源扫码App访问您的相册，以便您上传或保存图片。`,
          "cameraPermission": `允许元器件溯源扫码App使用您的相机，以便您直接拍摄照片上传。`,
          "microphonePermission": `允许元器件溯源扫码App访问您的麦克风，以便您拍摄带有声音的视频。`
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": `元器件溯源扫码App需要访问您的位置以提供周边服务及导航功能。`
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": `元器件溯源扫码App需要访问相机以拍摄照片和视频。`,
          "microphonePermission": `元器件溯源扫码App需要访问麦克风以录制视频声音。`,
          "recordAudioAndroid": true
        }
      ],
      [
        "expo-media-library",
        {
          "photosPermission": "允许元器件溯源扫码App保存APK到下载文件夹以便安装更新",
          "savePhotosPermission": "允许元器件溯源扫码App保存文件到您的设备",
          "isAccessMediaLocationGranted": true
        }
      ],
      [
        "expo-document-picker",
        {
          "iCloudContainerEnvironment": "Production"
        }
      ],
      [
        "expo-sqlite",
        {
          enableExperimental: false,
          // WebAssembly 模式配置（虚拟机/Web 平台使用）
          // 使用官方 CDN 的 libSQL WASM 文件
          libSQLUrl: "https://unpkg.com/@libsql/sqlite-wasm@latest/dist/sqlite3.wasm",
          useSQLCipher: false
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
