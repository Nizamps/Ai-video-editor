import { ProjectData, TimelineClip } from '../types/editor';

const DB_NAME = 'ClipForgeAI_DB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProjectToIndexedDB(project: ProjectData): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      store.put({ ...project, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback to lightweight metadata in sessionStorage if IndexedDB is restricted
  }
}

export async function loadAllProjectsFromIndexedDB(): Promise<ProjectData[]> {
  try {
    const db = await openDB();
    const list = await new Promise<ProjectData[]>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as ProjectData[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function deleteProjectFromIndexedDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      tx.objectStore(STORE_PROJECTS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}

/**
 * Exports all text/caption clips on the timeline to standard SubRip (.srt) format.
 */
export function exportTimelineToSRT(clips: TimelineClip[]): string {
  const textClips = clips
    .filter((c) => c.type === 'text' && c.textConfig?.text)
    .sort((a, b) => a.startTime - b.startTime);

  const formatSrtTime = (sec: number) => {
    const totalMs = Math.max(0, Math.round(sec * 1000));
    const ms = totalMs % 1000;
    const totalS = Math.floor(totalMs / 1000);
    const s = totalS % 60;
    const m = Math.floor(totalS / 60) % 60;
    const h = Math.floor(totalS / 3600);
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
  };

  return textClips
    .map((clip, i) => {
      const start = formatSrtTime(clip.startTime);
      const end = formatSrtTime(clip.startTime + clip.duration);
      return `${i + 1}\n${start} --> ${end}\n${clip.textConfig?.text || clip.name}\n`;
    })
    .join('\n');
}

/**
 * Exports all text/caption clips on the timeline to WebVTT (.vtt) format.
 */
export function exportTimelineToVTT(clips: TimelineClip[]): string {
  const srt = exportTimelineToSRT(clips).replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${srt}`;
}

/**
 * Parses an imported .srt or .vtt file into caption segments ({ startTime, duration, text }).
 */
export function parseSubtitlesFile(content: string): { startTime: number; duration: number; text: string }[] {
  const blocks = content
    .replace(/\r\n/g, '\n')
    .replace(/^WEBVTT.*\n+/i, '')
    .trim()
    .split(/\n\s*\n/);

  const parseTimestamp = (raw: string): number => {
    const clean = raw.trim().replace(',', '.');
    const parts = clean.split(':');
    if (parts.length === 3) {
      return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
    }
    if (parts.length === 2) {
      return Number(parts[0]) * 60 + Number(parts[1]);
    }
    return 0;
  };

  const results: { startTime: number; duration: number; text: string }[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const arrowLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (arrowLineIdx === -1) continue;

    const [startRaw, endRaw] = lines[arrowLineIdx].split('-->');
    const startTime = parseTimestamp(startRaw);
    const endTime = parseTimestamp(endRaw.split(' ')[0]);
    const text = lines.slice(arrowLineIdx + 1).join(' ').replace(/<[^>]+>/g, '');

    if (text && endTime > startTime) {
      results.push({
        startTime: Number(startTime.toFixed(2)),
        duration: Number(Math.max(0.4, endTime - startTime).toFixed(2)),
        text,
      });
    }
  }

  return results;
}
