import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Select, SelectItem } from "@heroui/select";
import { Slider } from "@heroui/slider";
import { Input, Textarea } from "@heroui/input";
import { Divider } from "@heroui/divider";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Spacer } from "@heroui/spacer";
import { addToast } from "@heroui/toast";
import { Snippet } from "@heroui/snippet";
import { Alert } from "@heroui/alert";

import type { Game, GameSettings, GameProcess } from "@/types/backend/gameSettings";

const DEFAULT_SETTINGS: GameSettings = {
  pos: "bl",
  theme: "dark",
  accent: "#66c0f4",
  fontSize: 20,
  height: 76,
  showCover: true,
  showAppid: true,
  showPlatform: true,
  showTime: true,
  customGames: {},
};

function procMapToText(customGames: Record<string, GameProcess>): string {
  return Object.entries(customGames)
    .map(([proc, v]) => `${proc}|${v.name}|${v.platform ?? "custom"}`)
    .join("\n");
}

function textToProcMap(text: string): Record<string, GameProcess> {
  const map: Record<string, GameProcess> = {};
  text.split("\n").forEach((line) => {
    const t = line.trim();
    if (!t) return;
    const parts = t.split("|").map((s) => s.trim());
    const proc = parts[0]?.toLowerCase().replace(/\.exe$/, "");
    const name = parts[1];
    if (!proc || !name) return;
    map[proc] = { name, platform: parts[2] || "custom" };
  });
  return map;
}

export default function GameSettingsPage() {
  const [game, setGame] = useState<Game | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [procText, setProcText] = useState("");
  const [processes, setProcesses] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/game/settings")
      .then((res) => (res.ok ? res.json() : DEFAULT_SETTINGS))
      .then((data: GameSettings) => {
        const s = { ...DEFAULT_SETTINGS, ...data };
        setSettings(s);
        setProcText(procMapToText(s.customGames || {}));
      })
      .catch(() => {});

    fetch("/api/game/processes")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: string[]) => setProcesses(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      fetch("/api/query/game")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: Game | null) => {
          if (alive) setGame(data);
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const handleSave = () => {
    const body: GameSettings = { ...settings, customGames: textToProcMap(procText) };
    fetch("/api/game/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        addToast({ title: "保存成功", description: "游戏组件设置已更新", timeout: 2000 });
      })
      .catch((err) => {
        addToast({ title: "保存失败", description: err.message, color: "danger", timeout: 6000 });
      });
  };

  const previewUrl = useMemo(
    () => `/widget/game?demo=${game && game.running ? "0" : "1"}`,
    [game],
  );

  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex justify-center">
      <div className="flex flex-col w-full max-w-[800px] py-6 px-10 gap-6">
        <h1 className="text-3xl text-white font-bold leading-9">游戏组件</h1>

        <Alert
          variant="faded"
          description="在 OBS 中显示当前正在游玩的游戏。Steam 用注册表自动识别，其它平台用进程检测。"
        />

        <Card>
          <CardHeader className="flex gap-3">
            <div className="flex flex-col">
              <p className="text-md font-semibold">当前状态</p>
              <p className="text-small text-default-500">
                {game && game.running ? `${game.platformLabel ?? ""} · ${game.name}` : "未在游玩"}
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <Snippet hideSymbol size="sm" codeString="http://localhost:9863/widget/game">
              浏览器源地址：http://localhost:9863/widget/game
            </Snippet>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-md font-semibold">自定义美化</p>
          </CardHeader>
          <CardBody className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-default-500">位置</span>
                <Select
                  selectedKeys={new Set([settings.pos])}
                  onSelectionChange={(keys) => {
                    const k = String(Array.from(keys as Set<string>)[0] ?? "bl");
                    set("pos", k);
                  }}
                >
                  <SelectItem key="bl">左下</SelectItem>
                  <SelectItem key="br">右下</SelectItem>
                  <SelectItem key="tl">左上</SelectItem>
                  <SelectItem key="tr">右上</SelectItem>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-default-500">主题</span>
                <Select
                  selectedKeys={new Set([settings.theme])}
                  onSelectionChange={(keys) => {
                    const k = String(Array.from(keys as Set<string>)[0] ?? "dark");
                    set("theme", k);
                  }}
                >
                  <SelectItem key="dark">深色</SelectItem>
                  <SelectItem key="light">浅色</SelectItem>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-default-500">强调色</span>
                <Input
                  type="color"
                  value={settings.accent}
                  onValueChange={(v) => set("accent", v)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-default-500">游戏名字号：{settings.fontSize}px</span>
                <Slider
                  minValue={12}
                  maxValue={44}
                  step={1}
                  value={settings.fontSize}
                  onChange={(val) => set("fontSize", Array.isArray(val) ? val[0] : val)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-default-500">卡片高度：{settings.height}px</span>
                <Slider
                  minValue={48}
                  maxValue={160}
                  step={1}
                  value={settings.height}
                  onChange={(val) => set("height", Array.isArray(val) ? val[0] : val)}
                />
              </div>
            </div>

            <Divider />

            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <Switch isSelected={settings.showCover} onValueChange={(v) => set("showCover", v)}>
                封面
              </Switch>
              <Switch isSelected={settings.showAppid} onValueChange={(v) => set("showAppid", v)}>
                AppID
              </Switch>
              <Switch isSelected={settings.showPlatform} onValueChange={(v) => set("showPlatform", v)}>
                平台标识
              </Switch>
              <Switch isSelected={settings.showTime} onValueChange={(v) => set("showTime", v)}>
                本次时长
              </Switch>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-md font-semibold">其它平台进程映射（Steam 之外）</p>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <p className="text-small text-default-500">
              每行一个：进程名|显示名|平台（epic / gog / ubisoft / custom）。可省略 .exe。
            </p>
            <Textarea
              minRows={6}
              value={procText}
              onValueChange={setProcText}
              placeholder={"eldenring|艾尔登法环|epic\nacvalhalla|刺客信条：英灵殿|ubisoft"}
            />
            {processes.length > 0 && (
              <p className="text-tiny text-default-400">
                当前运行的进程（供参考）：{processes.slice(0, 20).join("、")}
                {processes.length > 20 ? "…" : ""}
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-md font-semibold">预览</p>
          </CardHeader>
          <CardBody>
            <iframe
              src={previewUrl}
              title="游戏组件预览"
              style={{ width: "100%", height: 120, border: "none", background: "transparent" }}
            />
          </CardBody>
        </Card>

        <div className="flex items-center gap-4">
          <Button color="primary" onPress={handleSave}>
            保存设置
          </Button>
          <Snippet hideSymbol size="sm" codeString="http://localhost:9863/widget/game">
            复制浏览器源地址
          </Snippet>
        </div>
        <Spacer y={4} />
      </div>
    </div>
  );
}
