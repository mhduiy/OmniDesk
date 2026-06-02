// src/types/widget.d.ts

export interface WidgetBridge {
  /**
   * 调用宿主与后端的指令
   * @param command - 必须在宿主后端白名单内的指令
   * @param args - 可选参数
   */
  invoke: <T = any>(command: string, args?: Record<string, any>) => Promise<T>;
  
  /**
   * 监听来自宿主或后端的系统事件（如配置变更、硬件状态推送）
   * @param event - 事件名称
   * @param callback - 处理回调函数
   */
  on: (event: string, callback: (payload: any) => void) => void;
}

declare global {
  interface Window {
    __widgetBridge: WidgetBridge;
  }
}
