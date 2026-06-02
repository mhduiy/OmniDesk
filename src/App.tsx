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

  // 记录当天的日期，用于强制刷新壁纸
  const [currentDay, setCurrentDay] = useState(new Date().getDate());

  // 编辑模式开关
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    // 监听 Alt + E 切换编辑模式
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'e') {
        setIsEditMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 每隔 1 小时检查一次是否跨天了
    const timer = setInterval(() => {
      const today = new Date().getDate();
      if (today !== currentDay) {
        setCurrentDay(today);
      }
    }, 1000 * 60 * 60); // 1 小时
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentDay]);

  return (
    <main 
      className="w-screen h-screen relative bg-cover bg-center overflow-hidden transition-all duration-1000"
      // 通过 _day 参数强制浏览器在跨天时重新拉取最新壁纸，而不是使用旧缓存
      style={{ backgroundImage: `url('https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN&_day=${currentDay}')` }}
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
