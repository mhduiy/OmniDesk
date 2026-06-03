import { useState } from 'react';
import { WidgetLayout } from './GridEngine';

interface AppConfig {
  wallpaperType: 'static' | 'video';
  glassIntensity: number;
}

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: WidgetLayout[];
  onWidgetChange: (widgets: WidgetLayout[]) => void;
  config: AppConfig;
  onConfigChange: (config: AppConfig) => void;
}

export default function SettingsPage({ isOpen, onClose, widgets, onWidgetChange, config, onConfigChange }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'appearance' | 'advanced'>('appearance');

  if (!isOpen) return null;

  const tabs = [
    { key: 'appearance' as const, label: '🎨 外观设置' },
    { key: 'advanced' as const, label: '⚙️ 高级设置' },
  ];

  return (
    <>
      {/* 背景遮罩 */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* 设置面板 */}
      <div className="fixed inset-8 z-50 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex overflow-hidden">
        {/* 侧边栏 */}
        <div className="w-56 bg-black/20 border-r border-white/10 p-4 flex flex-col gap-1">
          <div className="text-white text-xl font-bold mb-4">⚙️ 设置</div>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            关闭
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 外观设置 */}
          {activeTab === 'appearance' && (
            <div>
              <h3 className="text-white text-lg font-bold mb-4">壁纸类型</h3>
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => onConfigChange({ ...config, wallpaperType: 'static' })}
                  className={`flex-1 p-4 rounded-xl border cursor-pointer transition-colors ${
                    config.wallpaperType === 'static'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/8'
                  }`}
                >
                  <div className="text-2xl mb-2">🖼️</div>
                  <div className="text-white text-sm font-medium">静态壁纸</div>
                  <div className="text-white/40 text-xs">Bing 每日美图</div>
                </button>
                <button
                  onClick={() => onConfigChange({ ...config, wallpaperType: 'video' })}
                  className={`flex-1 p-4 rounded-xl border cursor-pointer transition-colors ${
                    config.wallpaperType === 'video'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/8'
                  }`}
                >
                  <div className="text-2xl mb-2">📺</div>
                  <div className="text-white text-sm font-medium">动态壁纸</div>
                  <div className="text-white/40 text-xs">Apple TV 航拍</div>
                </button>
              </div>

              <h3 className="text-white text-lg font-bold mb-4">毛玻璃强度</h3>
              <input
                type="range"
                min="0"
                max="60"
                value={config.glassIntensity}
                onChange={(e) => onConfigChange({ ...config, glassIntensity: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />
              <div className="text-white/40 text-xs mt-1">{config.glassIntensity}px 模糊</div>
            </div>
          )}

          {/* 高级设置 */}
          {activeTab === 'advanced' && (
            <div>
              <h3 className="text-white text-lg font-bold mb-4">布局管理</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const data = JSON.stringify(widgets, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'omnidesk-layout.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors cursor-pointer text-left"
                >
                  📤 导出布局配置
                </button>
                <label className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors cursor-pointer block text-left">
                  📥 导入布局配置
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const imported = JSON.parse(reader.result as string);
                          if (Array.isArray(imported)) {
                            onWidgetChange(imported);
                          }
                        } catch {
                          alert('无效的布局文件');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    if (confirm('确定要恢复默认布局吗？当前布局将被覆盖。')) {
                      window.location.reload();
                    }
                  }}
                  className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/15 transition-colors cursor-pointer text-left"
                >
                  🔄 恢复默认布局
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
