"use client";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Download,
  Upload,
  ShieldCheck,
  Cloud,
  LogOut,
  Trash2,
  Check,
} from "lucide-react";
import {
  useStudy,
  assetRefs,
  saveAsset,
  loadAsset,
  STORAGE_KEY,
} from "./store";
import { PageTitle, Panel, Badge, Notice, Modal, download } from "./ui";
import { cloudConfigured, getSupabase } from "@/lib/supabase";
import { modes, recommendMode, type Mode, type StudyState } from "@/lib/model";
import { isAllowedAssetMime } from "@/lib/asset-mime";
import { stateSchema } from "@/lib/validation";
function encode(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
function decode(base64: string, type: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type });
}
export function Settings() {
  const { state, update, replace, reset } = useStudy();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [cloudDelete, setCloudDelete] = useState(false);
  const [revision, setRevision] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const currentUser = useRef<string | null>(null);
  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    const apply = (u: User | null) => {
      setUser(u);
      currentUser.current = u?.id || null;
      try {
        const saved = JSON.parse(
          localStorage.getItem("ielts-cloud-revision") || "null",
        );
        setRevision(saved?.user === u?.id ? saved.revision : null);
      } catch {
        setRevision(null);
      }
    };
    client.auth.getUser().then(({ data }) => apply(data.user));
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) =>
      apply(session?.user || null),
    );
    return () => subscription.unsubscribe();
  }, []);
  const markRevision = (rev: number) => {
    setRevision(rev);
    localStorage.setItem(
      "ielts-cloud-revision",
      JSON.stringify({ user: currentUser.current, revision: rev }),
    );
  };
  const auth = async (signup: boolean) => {
    const client = getSupabase();
    if (!client) return;
    setBusy(true);
    setNotice("");
    try {
      if (signup) {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        setNotice(
          data.session
            ? "账户已创建并登录。"
            : "注册请求已提交，请检查邮箱完成验证后登录。",
        );
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setNotice("已登录。请主动选择上传本机数据或恢复云端记录。");
      }
      setPassword("");
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "登录失败，请检查Supabase配置。",
      );
    } finally {
      setBusy(false);
    }
  };
  const exportBackup = async () => {
    setBusy(true);
    try {
      const assets: Record<string, { type: string; base64: string }> = {};
      const missing: string[] = [];
      for (const key of assetRefs(state)) {
        const blob = await loadAsset(key);
        if (blob) assets[key] = { type: blob.type, base64: await encode(blob) };
        else missing.push(key);
      }
      download(
        new Blob(
          [
            JSON.stringify({
              format: "ielts-study-os-backup",
              version: 1,
              state,
              assets,
            }),
          ],
          { type: "application/json" },
        ),
        "ielts-study-os-backup.json",
      );
      setNotice(
        missing.length
          ? `文本已导出，但此设备缺少 ${missing.length} 个录音、截图或资料；请先恢复云端附件，再做完整备份。`
          : "已导出全部本机学习记录和可用录音、截图或资料，请妥善保存。",
      );
    } catch {
      setNotice("导出失败，可能是浏览器内存或存储不可用。");
    } finally {
      setBusy(false);
    }
  };
  const importBackup = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      setNotice("备份超过100MB，请在原设备分批保存附件。");
      return;
    }
    setBusy(true);
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== "ielts-study-os-backup" || data.version !== 1)
        throw new Error("不是受支持的 Study OS 备份。");
      const parsed = stateSchema.parse(data.state) as StudyState;
      const blobs: { key: string; blob: Blob }[] = [];
      for (const key of assetRefs(parsed)) {
        const asset = data.assets?.[key];
        if (!asset) continue;
        if (
          !/^[\w-]{1,100}$/.test(key) ||
          typeof asset.base64 !== "string" ||
          !isAllowedAssetMime(asset.type)
        )
          throw new Error("备份附件格式无效。");
        blobs.push({ key, blob: decode(asset.base64, asset.type) });
      }
      if (
        !confirm(
          "恢复将替换此设备的全部学习记录。请先导出当前数据。确认继续吗？",
        )
      )
        return;
      for (const { key, blob } of blobs) await saveAsset(key, blob);
      replace(parsed);
      localStorage.removeItem("ielts-cloud-revision");
      setRevision(null);
      setNotice("已恢复备份。云端尚未改变；如要同步请先核对云端版本。");
    } catch (e) {
      setNotice(
        e instanceof Error
          ? `备份未恢复：${e.message.slice(0, 200)}`
          : "备份格式无法读取。",
      );
    } finally {
      setBusy(false);
    }
  };
  const sync = async (direction: "upload" | "download") => {
    const client = getSupabase();
    if (!client || !user) return;
    setBusy(true);
    setNotice("");
    try {
      if (direction === "upload") {
        for (const key of assetRefs(state)) {
          const blob = await loadAsset(key);
          if (blob) {
            const { error } = await client.storage
              .from("study-private")
              .upload(`${user.id}/${key}`, blob, {
                upsert: true,
                contentType: blob.type.split(";")[0] || "audio/webm",
              });
            if (error) throw error;
          } else {
            const { error } = await client.storage
              .from("study-private")
              .download(`${user.id}/${key}`);
            if (error)
              throw new Error(
                "本机与云端均缺少一个引用附件，请先恢复完整备份。",
              );
          }
        }
        const { data, error } = await client.rpc("save_learning_state", {
          p_data: state,
          p_expected_revision: revision,
        });
        if (error) throw error;
        markRevision(Number(data));
        setNotice("学习记录与引用附件已同步至你的私有云端空间。");
      } else {
        const { data, error } = await client
          .from("learning_states")
          .select("data,revision")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setNotice("云端还没有学习记录，可以先上传此设备的数据。");
          return;
        }
        const parsed = stateSchema.parse(data.data) as StudyState;
        if (
          !confirm(
            "将用云端记录替换本机记录。未同步内容请先导出备份，确认继续吗？",
          )
        )
          return;
        const blobs: { key: string; blob: Blob }[] = [];
        for (const key of assetRefs(parsed)) {
          const result = await client.storage
            .from("study-private")
            .download(`${user.id}/${key}`);
          if (result.error) throw result.error;
          blobs.push({ key, blob: result.data });
        }
        for (const { key, blob } of blobs) await saveAsset(key, blob);
        replace(parsed);
        markRevision(data.revision);
        setNotice("已恢复云端记录和附件。可以继续学习。");
      }
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : (e as { message?: string })?.message || "云同步失败";
      setNotice(
        message.includes("SYNC_CONFLICT")
          ? "云端已有不同版本，已阻止覆盖。请先导出本机备份，再恢复云端版本，核对后继续。"
          : `云端操作未完成：${message}。本机数据仍保留，请检查SQL迁移与存储配置。`,
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (confirmText !== "删除") return;
    setBusy(true);
    try {
      const client = getSupabase();
      if (cloudDelete && client && user) {
        let more = true;
        while (more) {
          const { data, error } = await client.storage
            .from("study-private")
            .list(user.id, { limit: 100 });
          if (error) throw error;
          if (data.length) {
            const result = await client.storage
              .from("study-private")
              .remove(data.map((f) => `${user.id}/${f.name}`));
            if (result.error) throw result.error;
          }
          more = data.length === 100;
        }
        const { error } = await client
          .from("learning_states")
          .delete()
          .eq("user_id", user.id);
        if (error) throw error;
      }
      await reset();
      localStorage.removeItem("ielts-cloud-revision");
      setRevision(null);
      setDeleting(false);
      setNotice(
        cloudDelete
          ? "此设备和当前账号的云端学习数据已删除。登录账号仍保留。"
          : "此设备的学习数据与附件已删除；云端没有改变。",
      );
    } catch {
      setNotice("删除未完成，请检查云端权限。尚未清空本机数据，可重试。");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="YOUR SPACE · YOUR DATA"
        title="按照自己的方式，安心学习。"
        description="本地优先、云端可选。你的学习记录始终可以导出和删除。"
      />
      <div className="two-columns">
        <div>
          <Panel title="我的备考设置">
            <label className="field">
              称呼
              <input
                value={state.profile.name}
                maxLength={100}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    profile: { ...s.profile, name: e.target.value },
                  }))
                }
              />
            </label>
            <div className="form-grid">
              <label className="field">
                规划开始日期
                <input
                  type="date"
                  value={state.profile.startDate}
                  max={state.profile.examDate}
                  onChange={(e) => {
                    if (
                      e.target.value &&
                      e.target.value < state.profile.examDate
                    )
                      update((s) => ({
                        ...s,
                        profile: { ...s.profile, startDate: e.target.value },
                      }));
                  }}
                />
              </label>
              <label className="field">
                考试日期
                <input
                  type="date"
                  value={state.profile.examDate}
                  min={state.profile.startDate}
                  onChange={(e) => {
                    if (
                      e.target.value &&
                      e.target.value > state.profile.startDate
                    )
                      update((s) => ({
                        ...s,
                        profile: { ...s.profile, examDate: e.target.value },
                      }));
                  }}
                />
              </label>
              <label className="field">
                目标总分
                <select
                  value={state.profile.target}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      profile: { ...s.profile, target: Number(e.target.value) },
                    }))
                  }
                >
                  {[5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map((n) => (
                    <option key={n} value={n}>
                      {n.toFixed(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                每日净学习时间
                <input readOnly value="300 分钟" />
              </label>
            </div>
            <label className="field">
              学习模式
              <select
                value={state.profile.mode}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    profile: { ...s.profile, mode: e.target.value as Mode },
                  }))
                }
              >
                {Object.entries(modes).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <Notice>
              根据当前独立输出与练习证据，建议使用「
              {modes[recommendMode(state)]}
              」。手动调整模式不等于通过能力检测，也不会覆盖今天的进度。
            </Notice>
          </Panel>
          <Panel
            title="登录与跨设备保存"
            action={
              <Badge tone={cloudConfigured ? "blue" : "gray"}>
                {cloudConfigured ? "云端已配置" : "本地模式"}
              </Badge>
            }
          >
            {!cloudConfigured ? (
              <>
                <p>当前无需账号即可学习，数据保存在这台设备的浏览器。</p>
                <p className="muted">
                  站点管理员配置 Supabase
                  公共URL和匿名密钥，并运行仓库中的数据库迁移后，可以启用真实登录和私有云端同步。
                </p>
                <Notice>
                  没有配置时不会展示虚假的已登录状态或上传成功提示。
                </Notice>
              </>
            ) : user ? (
              <>
                <p className="row">
                  <ShieldCheck size={18} />
                  {user.email}
                </p>
                <p>云端同步为主动操作。请在切换账号或设备前导出重要记录。</p>
                <div className="row wrap">
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => sync("upload")}
                  >
                    <Cloud size={16} />
                    上传本机数据
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => sync("download")}
                  >
                    <Download size={16} />
                    恢复云端记录
                  </button>
                </div>
                <p className="tiny">
                  {revision === null
                    ? "尚未关联云端版本；有远端记录时会阻止覆盖。"
                    : `已关联云端版本 ${revision}。`}
                  记录与附件使用你的账号权限隔离。
                </p>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !confirm(
                        "退出并清空此设备的学习记录与录音。未同步的内容请先导出，确认继续？",
                      )
                    )
                      return;
                    setBusy(true);
                    const { error } = await getSupabase()!.auth.signOut();
                    if (error) setNotice("退出失败，请稍后再试。");
                    else {
                      await reset();
                      localStorage.removeItem("ielts-cloud-revision");
                      setNotice("已退出并清除此设备的数据。");
                    }
                    setBusy(false);
                  }}
                >
                  <LogOut size={15} />
                  退出并清除此设备
                </button>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void auth(false);
                }}
              >
                <label className="field">
                  邮箱
                  <input
                    type="email"
                    value={email}
                    required
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="field">
                  密码
                  <input
                    type="password"
                    value={password}
                    required
                    minLength={8}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <div className="row">
                  <button
                    className="button primary"
                    type="submit"
                    disabled={busy}
                  >
                    登录
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={busy || !email || password.length < 8}
                    onClick={() => auth(true)}
                  >
                    注册新账号
                  </button>
                </div>
              </form>
            )}
          </Panel>
        </div>
        <div>
          <Panel title="导出与恢复">
            <p>
              完整备份包括学习任务、作文、反馈、错题、练习记录，以及此设备可用的录音、截图、私人资源原文件及提取文本。
            </p>
            <div className="stack">
              <button
                className="button primary"
                disabled={busy}
                onClick={exportBackup}
              >
                <Download size={16} />
                导出完整备份（JSON）
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={16} />
                从备份恢复
              </button>
              <button
                className="text-link"
                onClick={() => {
                  const raw = localStorage.getItem(STORAGE_KEY);
                  download(
                    new Blob([raw || "null"], { type: "application/json" }),
                    "ielts-raw-state.json",
                  );
                }}
              >
                导出原始文本记录（用于异常恢复）
              </button>
            </div>
            <input
              ref={fileInput}
              hidden
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importBackup(file);
                e.target.value = "";
              }}
            />
          </Panel>
          <Panel title="隐私与AI使用">
            <div className="privacy-item">
              <ShieldCheck size={19} />
              <p>
                离线教学和OCR在本机执行。录音只有在你主动云同步后才上传到私有存储。
              </p>
            </div>
            <div className="privacy-item">
              <ShieldCheck size={19} />
              <p>
                点击在线教师反馈时，当前题目和回答会发送给配置的AI服务；系统不会把全部学习档案发给模型。
              </p>
            </div>
            <div className="privacy-item">
              <ShieldCheck size={19} />
              <p>
                浏览器语音识别默认关闭，启用后可能使用浏览器厂商的在线转写服务。
              </p>
            </div>
            <div className="privacy-item">
              <ShieldCheck size={19} />
              <p>
                API密钥只从服务端环境变量读取。此页面不接收、保存或展示密钥。
              </p>
            </div>
            <Notice>
              共享设备使用后，请先备份再清空本机数据。浏览器存储不是加密保险箱，清理浏览器数据会删除本机记录。
            </Notice>
          </Panel>
          <Panel title="删除学习数据">
            <p>
              你可以清除此设备的数据，登录后也可以同时删除当前账号的云端学习数据。
            </p>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => {
                setConfirmText("");
                setCloudDelete(false);
                setDeleting(true);
              }}
            >
              <Trash2 size={16} />
              管理删除
            </button>
          </Panel>
        </div>
      </div>
      {notice && (
        <div className="settings-notice">
          <Notice>{notice}</Notice>
        </div>
      )}
      {deleting && (
        <Modal
          title="删除前，请确认已经备份"
          onClose={() => setDeleting(false)}
        >
          <p>
            这会删除任务、作文、反馈、录音、私人资源、导入截图和练习记录，无法撤销。
          </p>
          {user && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={cloudDelete}
                onChange={(e) => setCloudDelete(e.target.checked)}
              />
              同时删除当前账号的云端学习数据（不删除登录账号）
            </label>
          )}
          <label className="field">
            输入“删除”以继续
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </label>
          <button
            className="button danger"
            disabled={confirmText !== "删除" || busy}
            onClick={remove}
          >
            确认删除{cloudDelete ? "本机与云端" : "本机"}数据
          </button>
        </Modal>
      )}
    </>
  );
}
