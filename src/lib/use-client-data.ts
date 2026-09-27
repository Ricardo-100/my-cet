'use client';

/**
 * 读取本应用全部 localStorage 数据的 hook。
 *
 * 用 useSyncExternalStore 而不是「useEffect 里 setState」：
 * React 会自己保证首帧与 SSR 渲染一致，挂载后再切到真实数据，
 * 不会出现 hydration mismatch（服务端渲染 0 题、客户端一 hydration 变 3 题那种）。
 *
 * 必须单独放一个 'use client' 文件：storage.ts 会被 api route 间接引用，
 * 那边不能出现客户端 hook。
 */

import { useSyncExternalStore } from 'react';
import { readClientData, readClientDataOnServer, subscribe, type ClientData } from './storage';

export function useClientData(): ClientData {
  return useSyncExternalStore(subscribe, readClientData, readClientDataOnServer);
}
