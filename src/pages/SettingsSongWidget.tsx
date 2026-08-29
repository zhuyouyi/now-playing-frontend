// SettingsSongWidget.tsx 歌曲组件设置/说明页（替代旧版空白页）
import React from "react";
import { Snippet } from "@heroui/snippet";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Alert } from "@heroui/alert";
import { Spacer } from "@heroui/spacer";
import { Link } from "@heroui/link";
import { useOpenExternalUrl } from "@/hooks/useOpenExternalUrl";

export default function SettingsSongWidgetPage() {
  const { openExternalUrl } = useOpenExternalUrl();
  const widgetUrl = "http://localhost:9863/widgetDesktop";

  return (
    <div className="flex justify-center">
      <div className="flex flex-col w-full max-w-[800px] py-6 px-10 gap-6">
        <h1 className="text-3xl text-white font-bold leading-9">歌曲组件</h1>

        <Alert
          variant="faded"
          description="歌曲组件是 Now Playing 的核心功能。在 OBS 中把下面的地址添加为浏览器源，即可在直播画面中显示当前正在播放的歌曲。"
        />

        <Card>
          <CardHeader className="flex gap-3">
            <div className="flex flex-col">
              <p className="text-md font-semibold">OBS 浏览器源</p>
              <p className="text-small text-default-500">
                在 OBS 中：来源 → 浏览器 → URL 填下面地址，宽度/高度按需设置。
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <Snippet hideSymbol size="sm" codeString={widgetUrl}>
              {widgetUrl}
            </Snippet>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-md font-semibold">预览</p>
          </CardHeader>
          <CardBody>
            <iframe
              src="/widgetDesktop"
              title="歌曲组件预览"
              style={{
                width: "100%",
                height: 140,
                border: "none",
                background: "transparent",
              }}
            />
          </CardBody>
        </Card>

        <p className="text-small text-default-500">
          更丰富的歌曲组件外观/歌词设置请前往侧边栏「桌面组件」或「歌词组件」。
          <Link
            className="ml-1 text-primary"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openExternalUrl("http://localhost:9863/settings/desktop");
            }}
          >
            打开桌面组件设置
          </Link>
        </p>
        <Spacer y={4} />
      </div>
    </div>
  );
}
