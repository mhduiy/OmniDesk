import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./index.css";
import GridEngine, { WidgetLayout } from "./components/GridEngine";

const DEFAULT_WIDGETS: WidgetLayout[] = [
  { id: "clock", instanceId: "clock_1", x: 2, y: 2, w: 4, h: 4 },
  { id: "system-monitor", instanceId: "sys_1", x: 6, y: 2, w: 4, h: 2 },
  { id: "todo", instanceId: "todo_1", x: 6, y: 4, w: 4, h: 4 },
  { id: "countdown", instanceId: "countdown_1", x: 10, y: 2, w: 2, h: 2 },
  { id: "shortcuts", instanceId: "shortcuts_1", x: 10, y: 4, w: 2, h: 2 },
  { id: "pomodoro", instanceId: "pomodoro_1", x: 2, y: 6, w: 2, h: 2 },
  { id: "prompt", instanceId: "prompt_1", x: 10, y: 6, w: 4, h: 2 },
  { id: "weather", instanceId: "weather_1", x: 12, y: 2, w: 2, h: 2 },
  { id: "github-monitor", instanceId: "github_1", x: 14, y: 2, w: 4, h: 4 },
  { id: "habit-tracker", instanceId: "habit_1", x: 4, y: 6, w: 2, h: 2 },
  { id: "ai-quota", instanceId: "quota_1", x: 12, y: 4, w: 2, h: 2 },
  { id: "ai-news", instanceId: "news_1", x: 18, y: 2, w: 4, h: 4 },
  { id: "weibo-hot", instanceId: "weibo_1", x: 14, y: 6, w: 4, h: 4 }
];

function App() {
  const [widgets, setWidgets] = useState<WidgetLayout[]>([]);
  const isInitialized = useRef(false);

  useEffect(() => {
    // 首次加载时从本地读取配置
    invoke<WidgetLayout[] | null>('load_layout')
      .then(saved => {
        if (saved && saved.length > 0) {
          setWidgets(saved);
        } else {
          setWidgets(DEFAULT_WIDGETS);
        }
      })
      .catch(err => {
        console.error("加载布局失败:", err);
        setWidgets(DEFAULT_WIDGETS);
      });
  }, []);

  // 包装一下 setWidgets，以便在更新状态的同时保存到本地
  const handleWidgetChange = (newWidgets: WidgetLayout[]) => {
    setWidgets(newWidgets);
    invoke('save_layout', { layout: newWidgets }).catch(err => {
      console.error("保存布局失败:", err);
    });
  };

  const [bgUrl, setBgUrl] = useState("https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN");
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    // 监听 Alt + E 切换编辑模式
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'e') {
        setIsEditMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 动态获取真实 Bing 壁纸，避免跨天缓存问题
    const fetchWallpaper = async () => {
      try {
        const res = await invoke<string>('fetch_proxy', { 
          url: 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN',
          token: null
        });
        const data = JSON.parse(res);
        if (data.images && data.images[0]) {
          const realUrl = "https://www.bing.com" + data.images[0].url;
          setBgUrl(prev => prev !== realUrl ? realUrl : prev);
        }
      } catch (e) {
        console.error("获取壁纸失败:", e);
      }
    };

    fetchWallpaper();
    // 每 30 分钟检查一次壁纸更新
    const timer = setInterval(fetchWallpaper, 1000 * 60 * 30);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <main 
      className="w-screen h-screen relative bg-cover bg-center overflow-hidden transition-all duration-1000"
      style={{ backgroundImage: `url('${bgUrl}')` }}
    >
      {/* 桌面层遮罩，用来稍微压暗壁纸，保证组件文字可读性 */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none z-0"></div>

      {/* 编辑模式提示条 */}
      {isEditMode && (
        <div className="absolute top-0 left-0 w-full bg-blue-500/80 backdrop-blur text-white text-center py-2 z-50 font-bold shadow-lg">
          进入布局编辑模式：拖拽移动组件。按 Alt+E 退出。
        </div>
      )}

      {/* 网格引擎作为容器层 */}
      <div className="relative z-10 w-full h-full">
        <GridEngine 
          widgets={widgets} 
          isEditMode={isEditMode}
          onWidgetChange={handleWidgetChange}
        />
      </div>

      {/* 右下角版本提示 */}
      <div className="absolute bottom-4 right-6 text-white/50 text-sm z-20 pointer-events-none">
        Widget Desktop (Debug) v0.1.0
      </div>
    </main>
  );
}

export default App;
