/**
 * 将 public/ui-screenshots/*.png 与 public/town-schematics.html 以 data: URL
 * 写入单文件 public/designer-handoff-embedded.html（无需外链资源）
 * 先 npm run capture:ui  再  npm run bundle:designer
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pub = path.join(root, "public");
const srcPath = path.join(pub, "designer-handoff.html");
const outPath = path.join(pub, "designer-handoff-embedded.html");
const shotDir = path.join(pub, "ui-screenshots");
const townPath = path.join(pub, "town-schematics.html");

const SHOTS = [
  { file: "home.png", label: "首页 /" },
  { file: "auth.png", label: "登录 /auth" },
  { file: "privacy.png", label: "隐私 /privacy" },
  { file: "intro-quiz.png", label: "测验 /intro/quiz" },
  { file: "onboarding.png", label: "引导 /onboarding" },
  { file: "match-start.png", label: "开启匹配 /match-start" },
  { file: "heartbeat.png", label: "心动设置 /settings/heartbeat" },
  { file: "matches.png", label: "匹配列表 /matches" },
  { file: "town.png", label: "小镇 /town" },
  { file: "town-explore.png", label: "小镇探索 /town/explore" },
  { file: "town-messages.png", label: "小镇消息 /town/messages" },
  { file: "town-my-needs.png", label: "我的需求 /town/my-needs" },
];

const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function escAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escText(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function shotFigure(s, src, missing) {
  const cap = missing ? `${s.label}（缺图：请先 npm run capture:ui 再 bundle）` : s.label;
  return (
    `<figure class="shot">` +
    `<figcaption>${escText(cap)}</figcaption>` +
    `<div class="shot-body">` +
    `<img alt="${escAttr(s.label)}" style="width:100%;height:auto;display:block;" src="${src}" />` +
    `</div></figure>`
  );
}

const SHARE_BOX_EMBEDDED = `    <div class="share-box" style="border-color:rgba(74,222,128,0.35)">
      <strong>【单文件内嵌版】</strong>由 <code>npm run bundle:designer</code> 生成。12 张界面 PNG 与「小镇线框」整页均已写入 <code>data:</code> URL，<strong>发本 HTML 即可，无需 <code>ui-screenshots</code> 等</strong>；文件较大为正常现象。<br />
      更新：在仓库中 <code>npm run dev:3456</code> → <code>npm run capture:ui</code> → 再 <code>npm run bundle:designer</code> 覆盖 <code>designer-handoff-embedded.html</code>。
    </div>
    <div class="share-box">
      <strong>不想发大文件时：</strong>可改发 <code>designer-handoff.html</code> + 同级 <code>ui-screenshots/</code> + <code>town-schematics.html</code> 打 zip；或浏览器「打印」另存 PDF。
    </div>`;

function main() {
  if (!fs.existsSync(srcPath)) {
    console.error("Missing", srcPath);
    process.exit(1);
  }
  let html = fs.readFileSync(srcPath, "utf8");
  html = html.replace(/\r\n/g, "\n");

  const oldShareBlocks = `    <div class="share-box" style="border-color:rgba(74,222,128,0.25)">
      <strong>要「单文件、图片全在 HTML 里」发给对方？</strong>在已有截图的前提下执行 <code>npm run bundle:designer</code>，会生成 <code>public/designer-handoff-embedded.html</code>：PNG 与 <code>town-schematics.html</code> 均以 <code>data:</code> 内嵌，<strong>只发这 1 个 HTML 即可</strong>（文件会较大，属正常）。<br />
      更新内嵌图：<code>npm run capture:ui</code> → 再 <code>npm run bundle:designer</code>。
    </div>
    <div class="share-box">
      <strong>多文件打包法（不跑 bundle 时）：</strong><br />
      1）本文件 <code>designer-handoff.html</code> 与 <code>ui-screenshots/</code>、<code>town-schematics.html</code> 放同一层目录后 zip；<br />
      2）或浏览器<strong>打印 → 另存为 PDF</strong>；<br />
      3）更新截图先 <code>npm run dev:3456</code>，再 <code>npm run capture:ui</code>。
    </div>`;

  if (!html.includes("要「单文件、图片全在 HTML 里」")) {
    console.error("designer-handoff.html: expected share-box block not found. Update bundle-designer-handoff.mjs");
    process.exit(1);
  }
  html = html.replace(oldShareBlocks, SHARE_BOX_EMBEDDED);

  let miss = 0;
  const figs = [];
  for (const s of SHOTS) {
    const fp = path.join(shotDir, s.file);
    if (fs.existsSync(fp) && fs.statSync(fp).size > 8) {
      const b64 = fs.readFileSync(fp).toString("base64");
      figs.push(shotFigure(s, "data:image/png;base64," + b64, false));
    } else {
      miss++;
      figs.push(shotFigure(s, PIXEL, true));
    }
  }

  const townHtml = fs.existsSync(townPath)
    ? fs.readFileSync(townPath, "utf8")
    : "<!DOCTYPE html><html><body>缺少 town-schematics.html</body></html>";
  const townSrc = "data:text/html;base64," + Buffer.from(townHtml, "utf8").toString("base64");
  const iframe = `<iframe title="丘比小镇四页线框" src="${townSrc}"></iframe>`;

  html = html.replace(
    /<div class="shots" id="shots"><\/div>/,
    '<div class="shots" id="shots">\n      ' + figs.join("\n      ") + "\n      </div>"
  );

  html = html.replace(
    /<div class="schematic-frame" id="schematicBox">[\s\S]*?<\/iframe>[\s\S]*?<\/div>/,
    '<div class="schematic-frame" id="schematicBox">' + iframe + "</div>"
  );

  html = html.replace(
    /<h2>二、主要界面参考图（PNG）<\/h2>\s*<p>下列图片路径为[^]*?<\/p>/,
    "<h2>二、主要界面参考图（内嵌，无需外链）</h2>\n" +
      "      <p>截图为生成时自 <code>ui-screenshots</code> 读入的 PNG，已以 data URL 写入，对方<strong>只打开本 HTML 即可</strong>。</p>"
  );

  html = html.replace(
    /<h2>三、丘比小镇四页线框（结构示意，非真机截屏）<\/h2>\s*<p>与 <code>src\/app\/town<\/code> 下页面结构对应[^]*?<\/p>/,
    "<h2>三、丘比小镇四页线框（内嵌）</h2>\n" +
      "      <p>以下为 <code>town-schematics.html</code> 全页内嵌（<code>data:text/html;base64</code>），结构对应 <code>src/app/town</code>。</p>"
  );

  if (miss > 0) {
    html = html.replace(
      /<p id="shot-note"[^>]*><\/p>/,
      "<p id=\"shot-note\" style=\"margin-top:1rem; font-size:0.86rem; color: var(--muted); display:block\">" +
        "有 " +
        miss +
        " 张图缺失，当前为 1 像素透明占位。请 <code>npm run capture:ui</code> 后重跑 <code>npm run bundle:designer</code>。</p>"
    );
  } else {
    html = html.replace(
      /<p id="shot-note"[^>]*>[^<]*<\/p>/,
      "<p id=\"shot-note\" style=\"margin-top:1rem; font-size:0.86rem; color: var(--muted); display:none\"></p>"
    );
  }

  html = html.replace(/<script>[\s\S]*?<\/script>(?=\s*<\/body>)/, "");

  html = html.replace(
    /<title>[^<]+<\/title>/,
    "<title>丘比（Qiubi）— UI/设计沟通稿（单文件内嵌版）</title>"
  );
  if (!/designer-handoff-embedded 生成/.test(html)) {
    html = html.replace(
      /<!DOCTYPE html>\s*<html/i,
      "<!DOCTYPE html>\n<!-- designer-handoff-embedded：由 scripts/bundle-designer-handoff.mjs 生成 -->\n<html"
    );
  }

  html = html.replace(
    /给 UI\/视觉设计师的<strong>单页静态稿<\/strong>：产品摘要 \+ 主要界面参考图。无需打开 App、不嵌入实时试玩页。/,
    "给 UI/视觉设计师的<strong>单页静态稿（data URL 内嵌，可单文件外发）</strong>：产品摘要 + 主要界面与小镇线框。无需资源文件夹。"
  );

  fs.writeFileSync(outPath, html, "utf8");
  const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log("OK", outPath, "≈" + kb + " KB  missing_png:", miss);
}

main();
