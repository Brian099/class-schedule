/**
 * 备忘附件存储。
 *
 * 改造前:附件二进制存浏览器 IndexedDB,元数据存 localStorage —— 数据只在本机,
 * 换设备看不到,清缓存就没了。
 *
 * 现在:二进制存服务端(Docker 挂载卷的 data/attachments/),
 * 元数据仍随备忘一起存在服务端的 memos.json 里。附件按 key 读写,
 * 渲染时直接用 /api/attachments/<key> 这个 URL:
 * 服务端支持 Range 请求,视频/音频可以边播边缓冲、拖动进度条,
 * 不必像 IndexedDB 那样先把整个 Blob 取到内存再生成 Object URL。
 */
import { attachmentUrl, removeAttachment, uploadAttachment } from '../api/client';

/** 附件的直链,可直接用于 img/video/audio 的 src 或下载 */
export const urlForKey = (key: string): string => attachmentUrl(key);

/** 下载用直链(带 Content-Disposition,浏览器会用原始文件名另存) */
export const downloadUrlForKey = (key: string): string =>
  `${attachmentUrl(key)}?download=1`;

export const putBlob = async (key: string, blob: Blob): Promise<void> => {
  const name = blob instanceof File && blob.name ? blob.name : key;
  await uploadAttachment(key, blob, name);
};

export const deleteBlob = async (key: string): Promise<void> => {
  try {
    await removeAttachment(key);
  } catch {
    // 附件本来就不存在时不必打扰用户,下一次 pruneOrphans 还会再清一遍
  }
};

/**
 * 回收不再被引用的附件(删备忘时若只更新 memos.json,附件本体会永久占着磁盘)。
 *
 * 判定交给服务端做,而不是在浏览器里比对:数据现在是多设备共享的,
 * 本机的备忘列表可能还没轮询到最新,由它决定"哪些是孤儿"会删掉别的设备刚加的附件。
 * usedKeys 只作为额外的保护名单传过去(本机还没提交的待上传附件)。
 */
export const pruneOrphans = async (usedKeys: Set<string>): Promise<number> => {
  try {
    const res = await fetch('/api/attachments/prune', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keep: [...usedKeys] }),
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { removed?: number };
    return typeof data.removed === 'number' ? data.removed : 0;
  } catch {
    return 0;
  }
};

/** 服务端存储始终可用(不像 IndexedDB 在无痕模式下会被禁用) */
export const isSupported = (): boolean => true;
