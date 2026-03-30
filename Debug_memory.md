## 心动设置年龄范围双滑块 Debug 经验记录

> 本文件用于记录本项目遇到过的典型坑，后续开发前 **必须先通读**，避免重复踩雷。

### 问题背景

- 页面：`settings/heartbeat/page.tsx`（心动设置）
- 功能：年龄范围「一条线两个圆点」的双向滑块，控制 `ageMin` / `ageMax`
- 期望：左右圆点都能独立拖动，高亮区间在两点之间连续显示，并与后端 `UserPreference.ageMin/ageMax` 保持一致

### 实际遇到的错误现象

1. **左右滑块互相遮挡**
   - 用两个 `<input type="range">` 叠加实现双滑块：
     - 有时左滑块拖不动（被右滑块的点击区域盖住）
     - 有时右滑块拖不动（被左滑块盖住）
   - 尝试用 `w-1/2` 分割左右区域 + `z-index` 调整层级，仍然容易出现「只能拖一侧」的问题。

2. **中间高亮区间对不齐 / 断裂**
   - 高亮区间用 `left` / `right` 百分比计算时，一旦 `ageMin` 或 `ageMax` 超出 [18, 100]，就会出现：
     - 粉色线段跑出卡片外
     - 中间出现一段空白，和圆点位置对不上
   - 数据库里如果已经存了异常值（如 1 岁），前端直接使用会放大这个问题。

3. **`min` / `max` 逻辑混乱**
   - 拖动左滑块时可能超过右滑块，导致 `min > max`
   - 拖动右滑块时可能小于左滑块，导致区间宽度为负数，表现为高亮条消失或反向。

### 最终稳定方案（当前生效的实现）

1. **废弃双 `<input type="range">` 叠加方案**
   - 不再用两个重叠的 `range` 控件，全部改为：
     - 一条轨道 `div`
     - 一段高亮区间 `div`
     - 左右两个可拖拽的圆点 `div`
   - 拖拽逻辑用 `useRef + mousemove/touchmove` 手动计算，不依赖浏览器对 `range` 的默认交互。

2. **新增独立组件 `AgeRangeSection`**
   - 接口：
     - `props.ageMin: number | ""`
     - `props.ageMax: number | ""`
     - `props.onChange(min: number, max: number)`
   - 内部逻辑：
     - `normalizeAge`：对传入数据统一夹在 `[18, 100]` 内，过滤掉数据库中的异常值（如 1 岁）。
     - 如果 `effectiveMin > effectiveMax`，自动交换，保证 `min <= max`。
     - 用 `leftPercent / rightPercent` 映射到轨道宽度：  
       \[
         \text{percent} = \frac{\text{value} - 18}{100 - 18} \times 100
       \]
     - 使用 `draggingRef` 标记当前拖动的是 `"min"` 还是 `"max"`，全局监听 `mousemove/touchmove` 更新。

3. **与外部状态同步**
   - 页面仍然用原始的 `ageMin` / `ageMax` state，并通过：
     - `<AgeRangeSection ageMin={ageMin} ageMax={ageMax} onChange={(min, max) => { setAgeMin(min); setAgeMax(max); }} />`
   - 这样：
     - 前端显示与后端存储字段完全一致
     - 任何一侧圆点拖动，都会同步刷新文案和高亮区间

### 开发/重构该组件时必须遵守的规则

1. **禁止再次叠加多个 `<input type="range">`**
   - 任何时候需要「两个圆点」的区间选择，都应优先使用类似 `AgeRangeSection` 的自绘方案。
   - 如果确实要用 `range`，必须确保不会互相遮挡，并写单元测试验证两端都能独立拖动。

2. **所有年龄值都必须先归一化再计算百分比**
   - 永远先夹在 `[18, 100]` 再参与 `percent = (value - 18) / 82` 计算。
   - 任何直接用数据库值参与位置计算的写法，都要视为高风险。

3. **`min` / `max` 不得出现反转**
   - 在组件内部一律保证 `min <= max`，必要时自动调整。
   - 拖动左端时：`nextMin = min(raw, currentMax)`  
     拖动右端时：`nextMax = max(raw, currentMin)`。

4. **UI 改动前先想好「自动化验证」**
   - 对核心映射逻辑（数值 → 像素）抽成纯函数，写简单断言脚本（见本次聊天提供的 `ageRange.test` 示例）。
   - 本项目中，如果再次修改年龄范围组件，**先写/更新测试，再改 UI**。

### 未来类似功能的建议

- 任何「双滑块区间」需求（比如价位区间、距离区间等），可以直接复用或复制本组件的模式：
  - 自绘轨道 + 高亮区间 + 两个圆点
  - `draggingRef + window mousemove/touchmove`
  - 统一归一化 + `min/max` 约束
- 在动交互前，先列出：
  - 极端边界（最小值、最大值、`min == max`）
  - 脏数据（小于最小、大于最大、`min > max`）
  - 与后端字段的映射关系

只要遵守以上约束，后续再实现任何双滑块型控件时，都不应该再遇到「一边拖不动、中间断线、圆点跑出卡片」这类问题。

