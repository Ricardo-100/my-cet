#!/usr/bin/env python3
"""预热 OCR 缓存：把「非扫描」抽不到 Translation 的 PDF 逐份 tail-OCR 一遍。

extract-translations.py 里 read_any 已经会做同样的事，但一次全跑完要一小时
以上，单次工具调用有超时。这里可以按 --limit / --offset 分批跑，
每批自动跳过已有缓存的文件，全部跑完后直接跑主脚本就是秒出。

用法：
    python3 scripts/prewarm-ocr.py --level cet4              # 前 --limit 份
    python3 scripts/prewarm-ocr.py --level cet4 --offset 10 --limit 10
    python3 scripts/prewarm-ocr.py --level all
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    'ex', os.path.join(HERE, 'extract-translations.py'))
ex = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ex)  # type: ignore[attr-defined]


def targets(levels) -> list[tuple[str, str, str]]:
    out = []
    for lvl in levels:
        for period, path in ex.iter_files(lvl):
            if not path.lower().endswith('.pdf'):
                continue
            t = ex.read_any(path, False)
            if t and ex.find_translation_papers(t):
                continue           # 普通 PDF，不烧 OCR
            out.append((lvl, period, path))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--level', default='cet6',
                    choices=['cet4', 'cet6', 'all'])
    ap.add_argument('--offset', type=int, default=0)
    ap.add_argument('--limit', type=int, default=10)
    args = ap.parse_args()
    levels = ['cet4', 'cet6'] if args.level == 'all' else [args.level]

    todo = targets(levels)
    print(f'待识别 {len(todo)} 份，本批 [{args.offset}, {args.offset + args.limit})')
    batch = todo[args.offset:args.offset + args.limit]
    done = skipped = 0

    for lvl, period, path in batch:
        cache = os.path.join(
            ex.OCR_CACHE, ex.sha1(path + str(os.path.getsize(path)) + f'|{ex.OCR_TAIL}') + '.txt')
        if os.path.exists(cache):
            skipped += 1
            continue
        t0 = time.time()
        t = ex.ocr_pdf(path)
        ok = bool(ex.find_translation_papers(t))
        if not ok and ex.OCR_TAIL:
            t = ex.ocr_pdf(path, tail=0)
            ok = bool(ex.find_translation_papers(t))
        print(f'  {lvl} {period} {os.path.basename(path)[:46]:46s} '
              f'{"命中" if ok else "未命中"} {time.time() - t0:5.1f}s', flush=True)
        done += 1

    print(f'\n本批新识别 {done} 份、命中缓存 {skipped} 份')


if __name__ == '__main__':
    main()
