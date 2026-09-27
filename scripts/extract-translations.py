#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 data/ 里的四六级真题 Translation 段落加工成题目库。

输入：data/CET46-Resources-main/**/{真题PDF,真题Word,答案解析}/...
输出：data/bank/translations.json

设计要点
--------
1. 题目粒度：按中文句号拆成单句。四六级翻译段的每个分句本来就是独立的
   翻译得分点，拆开后才是「一道题」。
2. 原卷题干里 `木结构（timberwork）` 这种括号提示会被剥出来单独存 hints，
   题干只留纯中文。提示词就是考试院给的得分关键词，等于官方划重点。
3. 只存题干：提示词 + 中文句子。参考译文不处理（解析 PDF 又大又乱，收益低）。
4. 抽取链：pdftotext（NFKC）→ LibreOffice 转 txt（.doc/.docx/.rtf）
   → 都不行再 OCR（rapidocr）。OCR 默认只认最后两页，Translation 永远是
   最后一个 Part；认不到才退化成整本。
5. 四级和六级同一个考次都存在，所以 id 带级别前缀（cet4-… / cet6-…），
   题库里用 exam 分场次时必须连 level 一起看。

用法：
    python3 scripts/extract-translations.py                 # 只抽六级
    python3 scripts/extract-translations.py --level cet4    # 抽四级
    python3 scripts/extract-translations.py --level all     # 两个都抽
    python3 scripts/extract-translations.py --ocr           # 扫描件走 OCR
    python3 scripts/prewarm-ocr.py --level all              # 分批预热 OCR 缓存
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
from collections import Counter

VERBOSE = os.environ.get('CET_EXTRACT_VERBOSE') == '1'
# OCR 只认最后几页：Translation 是试卷最后一个 Part，且总在一页内放得下。
# 认不到再退化成整本（见 extract 里的兜底）。
OCR_TAIL = int(os.environ.get('CET_OCR_TAIL', '2'))

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_ROOT = os.path.join(REPO, 'data', 'CET46-Resources-main')
# 仓库里可能是解压后的双层目录
if os.path.isdir(os.path.join(DATA_ROOT, 'CET46-Resources-main')):
    DATA_ROOT = os.path.join(DATA_ROOT, 'CET46-Resources-main')
OUT_DIR = os.path.join(REPO, 'data', 'bank')
CACHE_DIR = os.path.join(REPO, 'data', '.cache')
OCR_CACHE = os.path.join(CACHE_DIR, 'ocr')

CJK = re.compile(r'[一-鿿]')
LATIN = re.compile(r'[A-Za-z]')

LEVELS = {'cet6': '六级真题', 'cet4': '四级真题'}

SOURCE_EXTS = ('.pdf', '.doc', '.docx', '.rtf')


# --------------------------------------------------------------------------
# 基础工具
# --------------------------------------------------------------------------

def nfkc(s: str) -> str:
    """全角字符（Ｐａｒｔ ＩＶ）归一成半角，否则正则一个都匹配不上。"""
    return unicodedata.normalize('NFKC', s)


def cjk_ratio(s: str) -> float:
    s = s.strip()
    if not s:
        return 0.0
    return len(CJK.findall(s)) / len(s)


def run(cmd: list[str]) -> str:
    r = subprocess.run(cmd, capture_output=True)
    return r.stdout.decode('utf-8', 'replace')


def sha1(s: str) -> str:
    return hashlib.sha1(s.encode('utf-8')).hexdigest()[:16]


def dedupe(xs):
    seen, out = set(), []
    for x in xs:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


# --------------------------------------------------------------------------
# 文本抽取
# --------------------------------------------------------------------------

def pdf_text(path: str) -> str:
    """-layout 保持版面，双栏Content不容易串行。"""
    for args in (['pdftotext', '-layout', path, '-'], ['pdftotext', '-raw', path, '-']):
        t = run(args)
        if len(CJK.findall(t)) > 50:
            return t
    return run(['pdftotext', '-layout', path, '-'])


def doc_text(path: str) -> str:
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache = os.path.join(CACHE_DIR, 'doctxt-' + sha1(path + str(os.path.getsize(path))) + '.txt')
    if os.path.exists(cache):
        return open(cache, encoding='utf-8', errors='replace').read()
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(
            ['soffice', '--headless', '--convert-to', 'txt:Text (encoded):UTF8',
             '--outdir', td, path],
            capture_output=True,
        )
        for f in os.listdir(td):
            if f.lower().endswith('.txt'):
                t = open(os.path.join(td, f), encoding='utf-8', errors='replace').read()
                open(cache, 'w', encoding='utf-8').write(t)
                return t
    return ''


def ocr_pdf(path: str, tail: int = OCR_TAIL) -> str:
    """尾页优先：Translation 永远是最后一个 Part，只认最后几页能省 70% 时间。

    tail <= 0 表示整本都认。缓存名带上 tail，两种结果互不覆盖。
    """
    os.makedirs(OCR_CACHE, exist_ok=True)
    cache = os.path.join(OCR_CACHE,
                         sha1(path + str(os.path.getsize(path)) + f'|{tail}') + '.txt')
    if os.path.exists(cache):
        return open(cache, encoding='utf-8', errors='replace').read()
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError:
        print('    ! 需要 OCR 但没装 rapidocr-onnxruntime，跳过', file=sys.stderr)
        return ''
    engine = RapidOCR()
    with tempfile.TemporaryDirectory() as td:
        # 栅格化很便宜（8 页 1.5 秒），贵的是识别，所以全部栅格化、只认最后几页
        subprocess.run(['pdftoppm', '-r', '150', '-png', path, os.path.join(td, 'p')],
                       capture_output=True)
        pngs = [f for f in os.listdir(td) if f.endswith('.png')]
        # 按页码数字排：字典序会把 p-10 排到 p-2 前面，打乱段落先后
        def _pg(f: str) -> int:
            mnum = re.search(r'(\d+)\.png$', f)
            return int(mnum.group(1)) if mnum else 0
        pngs.sort(key=_pg)
        if tail > 0:
            pngs = pngs[-tail:]
        lines: list[str] = []
        for png in pngs:
            res, _ = engine(os.path.join(td, png))
            if not res:
                continue
            lines.append('\f' + png)
            lines.extend(item[1] for item in res)
    t = '\n'.join(lines)
    open(cache, 'w', encoding='utf-8').write(t)
    return t


_MEMO: dict[str, str] = {}


def read_any(path: str, use_ocr: bool) -> str:
    key = f'{path}|{os.path.getsize(path)}|{use_ocr}'
    if key in _MEMO:
        return _MEMO[key]
    ext = os.path.splitext(path)[1].lower()
    if ext == '.pdf':
        t = pdf_text(path)
        if len(CJK.findall(t)) < 50 and use_ocr:
            t = ocr_pdf(path)
    elif ext in ('.doc', '.docx', '.rtf'):
        t = doc_text(path)
    else:
        t = ''
    _MEMO[key] = t
    return t


# --------------------------------------------------------------------------
# 定位 Translation 段
# --------------------------------------------------------------------------

SKIP_LINE = (
    re.compile(r'^\s*$'),
    re.compile(r'(?i)^\s*directions?\b'),
    re.compile(r'^\s*【\s*原文\s*】\s*$'),
    re.compile(r'^\s*\[?\s*原文\s*\]?\s*$'),
    re.compile(r'^\s*[（(]?\s*30\s*(?:分钟|minutes)\s*[）)]?\s*$', re.I),
    re.compile(r'^\s*```'),
)

BREAK_LINE = (
    # 注意别写 '^part\s+[a-z]\b'：罗马数字 'IV' 取一个字母后 \b 不成立，
    # 'Part IV · Translation' 整条都匹配不上，翻译段就会串到下一节去
    re.compile(r'(?i)^part\b'),
    re.compile(r'(?i)^section\b'),
    re.compile(r'难点注释|译点精析|翻译技巧|参考译文|参考翻译|参考答案|参考范文|答案与解析'),
    re.compile(r'本资源根据|题目版权归|完整保留所有原文'),
    re.compile(r'^\s*[-—–_]{4,}\s*$'),
    re.compile(r'^\s*第\s*\d+\s*页\s*$'),
    re.compile(r'^\s*[-–—]?\s*\d{1,3}\s*[-–—]?\s*$'),
    re.compile(r'^\s*[一二三四五六]、'),
    re.compile(r'^\s*公众号'),
    # 卷子末尾的说明性小注：'注：2022年9月四级考试共考了1套听力…'
    re.compile(r'^\s*注\s*[:：]'),
    re.compile(r'^\s*请用黑色签字笔'),
    re.compile(r'^\s*未得到监考教师'),
    re.compile(r'^\s*准考证号'),
    re.compile(r'^\s*错填'),
    # 页脚：'六级 2021 年 6 月 31'、'2022年6月英语六级真题第2套 第1页 共1页'
    re.compile(r'^\s*(?:四|六)级\s*\d{4}\s*年'),
    re.compile(r'^\s*\d{4}\s*年\s*\d{1,2}\s*月.*真题'),
    re.compile(r'第\s*\d+\s*页\s*共\s*\d+\s*页'),
)


def _collect_passage(lines: list[str], start: int):
    """从标题下一行开始收集中文段落，返回段落列表。

    段内的软换行用 \\x01 占位而不是直接拼掉——PDF/Word 丢了段落空行时，
    这是唯一还能看出「这里原本换行」的线索，split_sentences 靠它切超长段。
    真正的段落边界（空行）仍然切成不同段落。
    """
    paras: list[str] = []
    cur: list[str] = []
    pending_break = False
    started = False
    for j in range(start, len(lines)):
        ls = lines[j].strip()
        if not ls:
            if cur:
                pending_break = True
            continue
        if any(p.search(ls) for p in SKIP_LINE):
            continue
        if any(p.search(ls) for p in BREAK_LINE):
            break
        # 纯英文长行说明已经滑到阅读理解了
        if cjk_ratio(ls) < 0.05 and len(ls) > 12:
            # 但还没收到中文时不能断：OCR 会把标题后面切成
            # '(30 minutes)'、'Directions: ...' 这种独立纯英文行，
            # 一断就整篇都收不到。
            if not started:
                continue
            break
        if cjk_ratio(ls) >= 0.05:
            if pending_break and cur:
                paras.append('\x01'.join(cur))
                cur = []
            pending_break = False
            started = True
            cur.append(ls)
            if sum(len(CJK.findall(x)) for x in cur) > 600:
                break
    if cur:
        paras.append('\x01'.join(cur))
    return paras


def _fallback_last_blocks(raw: str):
    """没有 Part IV 标题的老卷子：取全文所有大连贯中文块。"""
    lines = nfkc(raw).split('\n')
    blocks = []
    i = 0
    while i < len(lines):
        if cjk_ratio(lines[i]) >= 0.2 and len(CJK.findall(lines[i])) >= 10:
            j, cur, paras = i, [], []
            pending_break = False
            while j < len(lines) and (not lines[j].strip() or cjk_ratio(lines[j]) >= 0.05):
                ls = lines[j].strip()
                if not ls:
                    if cur:
                        pending_break = True
                elif cjk_ratio(ls) < 0.05 or any(p.search(ls) for p in BREAK_LINE):
                    break
                else:
                    if pending_break and cur:
                        paras.append('\x01'.join(cur))
                        cur = []
                    pending_break = False
                    cur.append(ls)
                j += 1
            if cur:
                paras.append('\x01'.join(cur))
            for p in paras:
                if len(CJK.findall(p)) > 80 and p not in blocks:
                    blocks.append(p)
            # 注意：j 可能等于 i（首行就被 BREAK_LINE 命中），不强制前进会死循环
            i = max(j, i + 1)
        else:
            i += 1
    return blocks


def find_translation_papers(raw: str):
    """返回 [ (段落列表, 定位方式) ]，一个元素对应一份卷子的翻译段。

    标题定位：每个 'Part X Translation' 标题收下的所有中文段落属于同一份卷子
    （翻译段本身就是 2~3 个自然段）。
    兜底定位：全文所有大连贯中文块，一块算一份卷子。
    """
    lines = nfkc(raw).split('\n')
    cands = []
    for i, l in enumerate(lines):
        ls = l.strip()
        # 按 strip 后的长度判断，-layout 的标题行尾随一大堆对齐空格
        if re.search(r'(?i)\bpart\b', ls) and re.search(r'(?i)\btranslation\b', ls) \
                and len(ls) < 120:
            cands.append(i)
    # OCR 场景：'Part IV' / 'Translation' / '(30 minutes)' 会被切成三行，
    # 而且罗马数字经常被认错（IV 认成 V），甚至紧贴成 'PartV'、空格全丢。
    # 只要单独一行是 Translation 且上一行以 Part 开头，就当它是标题——
    # 四级是 Part V，别去数第几部分。这里不能用 \bpart\b，'PartV' 没有边界。
    for i, l in enumerate(lines):
        ls = l.strip()
        if i and re.match(r'(?i)^translation\b', ls) and len(ls) < 40 \
                and re.match(r'(?i)^part', lines[i - 1].strip()):
            cands.append(i)
    cands += [
        i for i, l in enumerate(lines)
        if re.match(r'^[一二三四五六]、\s*翻译\s*$', l.strip())
        or re.match(r'^第[一二三四五六]部分\s*翻译$', l.strip())
    ]
    papers = []
    for i in sorted(set(cands)):
        paras = [p for p in _collect_passage(lines, i + 1) if len(CJK.findall(p)) > 80]
        if paras:
            papers.append((paras, 'header'))
    if papers:
        return papers
    return [([b], 'fallback') for b in _fallback_last_blocks(raw)]


# --------------------------------------------------------------------------
# 题干加工
# --------------------------------------------------------------------------

def strip_hints(zh: str):
    """剥掉括号里的英文提示，返回 (干净题干, 提示词列表)。

    只剥含英文字母的括号；「（矫正方法）」这种中文注释保留——
    那是题干自带的释义，不是答案。
    """
    hints: list[str] = []

    def repl(m):
        inner = m.group(1)
        if LATIN.search(inner):
            for h in re.split(r'[,，;；/]', inner):
                # \x01 是段内软换行占位符：'lucky\x01money' 得还原成一个词
                h = re.sub(r'\x01+', ' ', h).strip(' .。')
                h = re.sub(r'\s{2,}', ' ', h)
                if h:
                    hints.append(h)
            return ''
        return m.group(0)

    clean = re.sub(r'[（(【\[]([^）)】\]]{1,60})[）)】\]]', repl, zh)
    clean = re.sub(r'[（(]\s*[）)]', '', clean)
    # 段首的栏目标签（【中文原文】【原文】…）
    clean = re.sub(r'^\s*[【\[]\s*(?:中文原文|原文|译文|翻译|题目|答案|参考答案|参考译文)\s*[】\]]\s*', '', clean)
    return clean, hints


def _squeeze_ws(para: str) -> str:
    """去掉换行/软换行造成的空白，但保留英文提示词内部的空格。

    'rammed earth\nconstruction' 是一个词组，硬删空格会把它粘成
    'rammedearthconstruction'，提示词就没法看了。
    """
    s = re.sub(r'(?<=[一-鿿])\s+(?=[一-鿿])', '', para)
    s = re.sub(r'(?<=[一-鿿])\s+(?=[A-Za-z0-9（(，,;；:：])', '', s)
    s = re.sub(r'(?<=[A-Za-z0-9）)，,;；:：])\s+(?=[一-鿿])', '', s)
    return s


def _squeeze_ws_no_latin(s: str) -> str:
    """删掉两侧都不是英文字母的空白。

    收尾用：'“麦 ”、“福”'、'( 1420年)'、'7 600亿元' 里的空格都是 PDF
    排版产物。但 'rammed earth construction' 两侧是字母，必须留下。
    """
    return re.sub(r'(?<![A-Za-z])\s+(?![A-Za-z])', '', s)


def _split_soft_wraps(p: str):
    """把没了段落空行而粘在一起的长段，在软换行处切开。

    只在句长超标时调用——真题翻译句极少超过 100 字。

    换行位置是源文件里唯一还留着的段落线索。先把不足 10 字的碎块并回邻居，
    再要求每块都够长——'中国的无 / 人机以…' 这种纯硬换行切了只会切出残句，
    不该切。
    """
    chunks = [q.strip() for q in p.split('\x01') if q.strip()]
    if len(chunks) < 2:
        return [p]
    merged: list[str] = []
    for q in chunks:
        if merged and len(q) < 10:
            merged[-1] += q
        else:
            merged.append(q)
    # 首块太短就和下一块合并
    if len(merged) > 1 and len(merged[0]) < 10:
        merged[1] = merged[0] + merged[1]
        merged.pop(0)
    if len(merged) > 1 and all(len(q) >= 10 for q in merged):
        return merged
    return [p]


def split_sentences(para: str):
    """拆句并逐句收提示词。

    顺序是「先切句、后剥括号」而不是反过来——这样才能知道每个提示词原本
    挂在哪句话上（'以木结构（timberwork）为特色' 的提示不该漏给后半段）。
    \\x01 是段内软换行的占位符。超过 60 字的片段基本就是源文件丢了段落空行、
    两段粘成了一段（2021.06 海南、青海湖都是这样），在换行处补一刀。
    两侧都至少 10 字才切——'中国的无 / 人机以…' 这种硬换行切了只会切出残句。
    """
    z = fix_glyphs(repair_punct(normalize_punct(_squeeze_ws(para))))
    pieces: list[str] = []
    for p in re.split(r'(?<=[。？！])', z):
        p = p.strip(' ，,;；:：')
        if len(p) < 4 or not CJK.search(p) or BOILERPLATE.search(p):
            continue
        # 真题翻译句正常都在 90 字以内；超过 100 字还没断句，
        # 基本就是源文件丢了段落空行、两段粘成了一段
        if len(p) > 100:
            chunks = _split_soft_wraps(p)
            if len(chunks) > 1:
                pieces += chunks
                continue
        pieces.append(p)

    out = []
    for p in pieces:
        clean, hints = strip_hints(p)
        clean = _squeeze_ws_no_latin(clean.replace('\x01', '')).strip()
        if len(clean) < 4 or not CJK.search(clean) or BOILERPLATE.search(clean):
            continue
        out.append((clean, hints))
    return out


def repair_punct(zh: str) -> str:
    """修几种真题转文本时被字体替换搞坏的标点。

    1. 句号渲成字母 o/O（海南…气候宜人 o）。\x01 是段内软换行占位符，
       也得算「后面还有内容」，否则 '游客o\x01海南1988年' 修不回来。
    2. 逗号渲成感叹号（地大物博!石油和天然气…）
    3. 逗号渲成右单引号（…发源地’在中国的水生态…）
    4. 千分位逗号被认成句点（OCR：'2.000多年'）。
    """
    # OCR 常把千分位逗号认成句点：'2.000多年' → '2,000多年'
    z = re.sub(r'(?<=\d)\.(?=\d{3}(?!\d))', ',', zh)
    z = re.sub(r'(?<=[一-鿿])\s*[oO](?=\s*(?:[一-鿿]|\x01|$))', '。', z)
    z = re.sub(r'(?<=[一-鿿])[’\'](?=[一-鿿])', '，', z)
    # 半角感叹号夹在中文里基本是坏逗号
    z = re.sub(r'(?<=[一-鿿])!(?=[一-鿿])', '，', z)
    return z


# 老 PDF 的字形映射坏掉后，个别字被换成了形近字。只修这几处有实测依据的，
# 不做无差别替换——「千」「川」本身是合法常用字。
GLYPH_FIX = (
    ('相当千', '相当于'),
    ('试验川', '试验田'),
    ('巳达', '已达'),
    ('清澈貞', '清澈，'),
    ('基千', '基于'),
    ('亳不', '毫不'),
)


def fix_glyphs(zh: str) -> str:
    for bad, good in GLYPH_FIX:
        zh = zh.replace(bad, good)
    return zh


# 中日韩标点也算「中文上下文」——'倡导"光盘行动",减少食物浪费' 里的逗号
# 紧挨的是引号，不是汉字，按纯汉字边界判断会漏掉。
CJKCTX = r'[一-鿿“”‘’〈〉《》（）、。，！？；：…—·]'


def normalize_punct(z: str) -> str:
    """把 CJK 上下文里的半角标点还原成全角。

    有些年份的 PDF 转文本后中文逗号成了 ','，不还原的话句号切分拿不到
    句子边界（'尊老是...遵守的' 会被当成一句）。
    半角句点分两种：夹在中文中间的是坏点（'一.个省份'），跟在中文后面的
    才是被替换掉的句号。
    """
    # 还有第三种：源文件把句号**整体**换成了半角 '.'（2015.12 的 docx 全文如此），
    # '赛.这项比赛' 里的点其实是句号。判定：通篇一个全角句号都没有、却有 2 处以上
    # 「汉字.汉字」，就当这些点全是句号——反过来，真有 '一.个省份' 这种坏点时，
    # 同一篇里一定能找到正常句号，两个特征不会同时成立。
    # \x01 是段内软换行占位符，点可能正好落在换行处，两侧都要放行。
    if '。' not in z and len(re.findall(r'(?<=[一-鿿\x01])\.(?=[\x01一-鿿])', z)) >= 2:
        z = re.sub(r'(?<=[一-鿿\x01])\.(?=[\x01一-鿿])', '。', z)
    z = re.sub(rf'(?<={CJKCTX})\s*\.\s*(?={CJKCTX})', '', z)
    z = re.sub(rf'(?<={CJKCTX})\s*\.\s*$', '。', z)
    # 逗号/分号/冒号：只要有一侧贴著中文就当作被替换掉的中文标点。
    # '文化遗产,2008年'（左侧中文）和 '20年代,中国'（右侧中文）都要修，
    # 而 '6,000' 两侧都是数字，千分位分隔符必须留住。
    for half, full in ((',', '，'), (';', '；'), (':', '：')):
        z = re.sub(rf'(?<={CJKCTX}){re.escape(half)}', full, z)
        z = re.sub(rf'{re.escape(half)}(?={CJKCTX})', full, z)
    # 包着中文的半角括号统一成全角
    z = re.sub(r'\((?=[一-鿿“”‘’])', '（', z)
    z = re.sub(r'(?<=[一-鿿“”‘’])\)', '）', z)
    return z


# --------------------------------------------------------------------------
# 题干里的噪声
# --------------------------------------------------------------------------

BOILERPLATE = re.compile(
    r'未得到监考教师|不得翻阅该试题册|请用黑色签字笔|准考证号|错填|'
    r'^第\s*\d+\s*页|共\s*\d+\s*页|^六级\s*\d{4}|^\d{4}\s*年\s*\d{1,2}\s*月.*真题|'
    r'本资源根据|题目版权归|完整保留所有原文|考试机构所有|无商业用途'
)


def dup_ratio(text: str) -> float:
    """文本重复比例。那种「可复制可搜索」PDF 会把翻译段印两遍，靠这个认出来。"""
    t = re.sub(r'\s+', '', text)
    if len(t) < 60:
        return 0.0
    w = 20
    seen, rep, tot = set(), 0, 0
    step = max(1, w // 2)
    for i in range(0, len(t) - w + 1, step):
        k = t[i:i + w]
        tot += 1
        if k in seen:
            rep += 1
        seen.add(k)
    return rep / max(tot, 1)


def quality(paras: list[str], sents: list[str]) -> float:
    """质量分：完整句子多、碎句少、正文不重复，分就高。

    用于同一套卷子的 PDF / Word 两份来源里挑更好的那份。纯按句子数挑会
    选中那种把翻译段交错印两遍的「可复制可搜索」PDF——它的句子数反而更多。
    所以这里同时罚三种情况：短碎句、被别的句子包含的冗余句、正文重复。
    """
    good = sum(1 for s in sents if s.rstrip()[-1:] in '。？！')
    frag = sum(1 for s in sents if len(s) < 14)
    redun = sum(1 for i, s in enumerate(sents)
                if any(s in o for j, o in enumerate(sents) if j != i))
    return good * 2 - len(sents) - frag * 2 - redun * 3 - 20 * dup_ratio(''.join(paras))


# --------------------------------------------------------------------------
# 文件名 → 套号
# --------------------------------------------------------------------------

CN_NUM = '一二三四五六'

def paper_no_of(fname: str) -> int:
    """文件名 → 起始套号。

    '第2、3套' '第2-3套' 这种一份多卷的取起始号，后面的卷子按顺序往后排。
    取不到就返回 1，由调用方按块序号累加。
    """
    m = re.search(rf'第\s*([{CN_NUM}\d]+)\s*(?:[、,，~\-到至]+\s*([{CN_NUM}\d]+))?\s*套', fname)
    if m:
        g = m.group(1)
        return CN_NUM.index(g) + 1 if g in CN_NUM else int(g)
    # 'cet4_2022_09_2-3.pdf' 这种不带「套」字的一份多卷，也要取起始号，
    # 否则默认落到 1，把真正的第 1 套挤掉（2022.09 四级就丢过一套）
    m = re.search(rf'[_\s-]([{CN_NUM}\d])\s*[-~到至,，]\s*([{CN_NUM}\d])(?=[_.\s]|$)', fname)
    if m:
        g = m.group(1)
        return CN_NUM.index(g) + 1 if g in CN_NUM else int(g)
    for pat in (rf'[（(]第?([{CN_NUM}])[）)]', rf'第([{CN_NUM}])套',
                rf'第([123456])套', rf'[（(](\d+)[）)]', rf'[_\s](\d)(?:[_\s.]|$)'):
        m = re.search(pat, fname)
        if m:
            g = m.group(1)
            return CN_NUM.index(g) + 1 if g in CN_NUM else int(g)
    return 1


def period_of(rel: str) -> str:
    m = re.match(r'(\d{4})\.(\d{2})', rel.replace(os.sep, '/'))
    return f'{m.group(1)}.{m.group(2)}' if m else rel


# --------------------------------------------------------------------------
# 主流程
# --------------------------------------------------------------------------

def iter_files(level: str):
    """按考次产出真题文件。同一考次优先 Word——PDF 若是扫描件还得白跑一趟 OCR。"""
    root = os.path.join(DATA_ROOT, LEVELS[level])
    if not os.path.isdir(root):
        return
    for period in sorted(os.listdir(root)):
        pdir = os.path.join(root, period)
        if not os.path.isdir(pdir):
            continue
        word_stems = set()
        pdfs = []
        words = []
        for sub in sorted(os.listdir(pdir)):
            if not sub.startswith('真题'):
                continue
            d = os.path.join(pdir, sub)
            for f in sorted(os.listdir(d)):
                p = os.path.join(d, f)
                if not os.path.isfile(p) or not f.lower().endswith(SOURCE_EXTS):
                    continue
                if f.lower().endswith('.pdf'):
                    pdfs.append(p)
                else:
                    words.append(p)
                    word_stems.add(os.path.splitext(f)[0])
        for p in words + pdfs:
            # 有同名 Word 就不啃 PDF：省一次昂贵的 OCR
            if p in pdfs and os.path.splitext(os.path.basename(p))[0] in word_stems:
                continue
            yield period, p


def extract(levels, use_ocr: bool):
    """扫真题 → {（级别, 考次, 套号）: 题目列表}。只取题干，不碰答案解析。"""
    papers: dict[tuple, dict] = {}
    diag: list[tuple] = []

    for level in levels:
        for period, path in iter_files(level):
            if VERBOSE:
                print(f'  … {period} {os.path.basename(path)}', flush=True)
            raw = read_any(path, use_ocr)
            base = os.path.basename(path)
            if not raw:
                diag.append((level, period, 'READ', base))
                continue

            found = find_translation_papers(raw)
            # 只认了尾页还没认到，说明这份卷子的排版不常规，整本重认一次
            if not found and use_ocr and path.lower().endswith('.pdf') \
                    and len(CJK.findall(raw)) < 200:
                raw = ocr_pdf(path, tail=0)
                found = find_translation_papers(raw)
                _MEMO[f'{path}|{os.path.getsize(path)}|True'] = raw
            if not found:
                diag.append((level, period, 'no-section', base))
                continue

            base_no = paper_no_of(base)
            for k, (paras, how) in enumerate(found):
                rows = []          # [(题干, [该句自己的提示词])]
                for para in paras:
                    rows += split_sentences(para)
                sents = [r[0] for r in rows]
                hints = dedupe(h for r in rows for h in r[1])
                # 源文件本身被截断时，末尾那句往往是半截的（'…国内外企业家创'），
                # 或者干脆只剩个名词短语（'物质文化。'）——都丢掉。
                # 但只剩两句的卷子（2021.06 青海湖）不能再丢，否则整篇没了。
                while len(rows) > 2 and (rows[-1][0].rstrip()[-1:] not in '。？！'
                                         or len(rows[-1][0]) < 10):
                    rows.pop()
                sents, hints_of = [r[0] for r in rows], [r[1] for r in rows]
                if len(sents) < 2:
                    diag.append((level, period, f'FEWSENT({len(sents)})', f'{base}#{k + 1}'))
                    continue
                # 「全3套」「第2、3套」这种一份多卷的：按文件名的起始套号往后排
                key = (level, period, base_no + k)
                prev = papers.get(key)
                # 同一套常有 PDF + Word 两份，留质量高的那份
                if prev and quality(prev['paras'], [r[0] for r in prev['rows']]) \
                        >= quality(paras, sents):
                    continue
                papers[key] = dict(level=level, period=period, paper=base_no + k,
                                   paras=paras, rows=rows, zh=dedupe(sents),
                                   hints=dedupe(hints), how=how, file=base)
    return list(papers.values()), diag


def build(levels, use_ocr: bool):
    papers, diag = extract(levels, use_ocr)
    sentences = []
    for p in papers:
        for i, (zh, hs) in enumerate(p['rows'], 1):
            hs = dedupe(hs)
            sentences.append({
                'id': f"{p['level']}-{p['period']}-{p['paper']}-{i}",
                'level': p['level'],
                'exam': p['period'],
                'paper': p['paper'],
                'seq': i,
                'source': zh,
                'hints': hs,
                'vocab': hs,
                'sourceFile': p['file'],
                'extractedBy': p['how'],
            })
    return sentences, papers, diag


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--level', default='cet6', choices=['cet4', 'cet6', 'all'])
    ap.add_argument('--ocr', action='store_true', help='扫描件走 OCR')
    ap.add_argument('-v', '--verbose', action='store_true', help='打印每个文件的处理进度')
    ap.add_argument('--out', default=os.path.join(OUT_DIR, 'translations.json'))
    args = ap.parse_args()

    global VERBOSE
    VERBOSE = VERBOSE or args.verbose
    levels = ['cet4', 'cet6'] if args.level == 'all' else [args.level]
    sentences, papers, diag = build(levels, args.ocr)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    meta = {
        'levels': levels,
        'useOcr': args.ocr,
        'papers': len(papers),
        'sentences': len(sentences),
        'withHints': sum(1 for s in sentences if s['hints']),
        'byExam': dict(sorted(Counter(s['exam'] for s in sentences).items())),
        'byDetection': dict(Counter(p['how'] for p in papers)),
    }
    json.dump({'meta': meta, 'sentences': sentences},
              open(args.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(f"试卷 {len(papers)} 篇 → 题目 {len(sentences)} 道")
    print(f"  带提示词 {meta['withHints']} 题 / 定位方式 {meta['byDetection']}")
    print(f"  每考次题量：{meta['byExam']}")
    if diag:
        print(f"\n未抽取 {len(diag)} 个文件：")
        for d in diag:
            print(f"  {d[0]} {d[1]} [{d[2]}] {d[3][:56]}")
    print(f"\n输出 → {args.out}")


if __name__ == '__main__':
    main()
