// useOpenExternalUrl.ts
import { useCallback } from "react";
import { useEnv } from "@/contexts/EnvContext";
import { addToast } from "@heroui/toast";

/**
 * 打开外部链接的自定义 Hook
 * @returns openExternalUrl 函数
 */
export function useOpenExternalUrl() {
  const { isDesktop } = useEnv();

  const openExternalUrl = useCallback(
    async (url: string): Promise<void> => {
      if (isDesktop) {
        // Tauri 桌面端：本地后端地址（歌曲组件设置等）直接在窗口内整页跳转，避免 opener 打不开
        if (url.startsWith("http://localhost:9863") || url.startsWith("http://127.0.0.1:9863")) {
          window.location.href = url;
          return;
        }
        // Tauri 桌面端：外部链接用系统默认浏览器打开
        try {
          const { openUrl } = await import("@tauri-apps/plugin-opener");
          await openUrl(url);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "未知错误";

          console.error("外部链接打开失败：", error);
          addToast({
            title: "外部链接打开失败",
            description: errorMessage,
            color: "warning",
            timeout: 3000,
          });

          // 降级方案：使用 window.open
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } else {
        // 电脑浏览器
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
    [isDesktop]
  );

  return { openExternalUrl };
}
