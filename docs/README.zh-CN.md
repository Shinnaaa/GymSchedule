<p align="center">
  <a href="../README.md"><img alt="English" src="https://img.shields.io/badge/English-eaeef2?style=for-the-badge"></a>
  <a href="README.zh-CN.md"><img alt="简体中文" src="https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-1f2328?style=for-the-badge"></a>
  <a href="README.ja.md"><img alt="日本語" src="https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-eaeef2?style=for-the-badge"></a>
</p>

<h1 align="center">🏋️ Fitness OS</h1>

<p align="center">
  在浏览器里运行的每日训练与饮食计划工具。<br>
  设定好一周的训练安排，它每天告诉你吃什么、什么时候练、买什么。
</p>

<p align="center">
  <a href="https://shinnaaa.github.io/GymSchedule/"><b>打开应用 →</b></a>
</p>

<p align="center">
  <a href="https://github.com/Shinnaaa/GymSchedule/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Shinnaaa/GymSchedule/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="Zero runtime dependencies" src="https://img.shields.io/badge/runtime%20deps-0-brightgreen">
  <img alt="No account" src="https://img.shields.io/badge/account-none-blue">
  <a href="../LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-green"></a>
</p>

<p align="center"><img src="images/timeline.png" alt="训练日：三餐、练前加餐、训练和恢复排在同一条时间线上" width="760"></p>

---

## 功能

- **周计划** —— 把每天设为训练、有氧或休息，并写上内容（例如“推 · 胸、肩、三头”）。显示当前是计划第几周、处于哪个阶段（重新适应 → 建立 → 正式）。
- **每日时间线** —— 三餐、练前加餐、训练、练后恢复和睡前蛋白，全部围绕*你的*训练时间安排。“现在”卡片告诉你此刻该做什么、下一步是什么。
- **碳水循环** —— 热量和三大营养素随当天类型变化：训练日碳水多，休息日碳水少，一周平均正好落在目标上。当天大部分碳水放在训练后的第一餐。
- **按你的身体计算** —— BMR 用 Mifflin-St Jeor 公式（区分男女），按活动水平算 TDEE，再根据目标速度计算热量缺口或盈余（每公斤 7,700 kcal）。蛋白质按每公斤体重克数设定。计划摄入过低时会给出警告。
- **饮食挡位** —— 当天可选严格（−5%）、普通、宽松（+5%），不用改设置。
- **拍照识别热量** *(可选)* —— 拍下一餐，Google Gemini 估算每样食物的热量和营养素，一键加入今日记录。也可以手动记录。
- **购物清单** —— 根据当天目标算出蛋白质、主食、蔬菜等的分量。
- **体重记录** —— 体重和可选的体脂率、趋势图、每周变化、BMI（WHO 分级）和体脂范围（ACE 分级，区分男女）。
- **临时调整今天** —— 腿日改成休息了？给今天换一个安排，所有数字随之更新。
- **活动提醒** —— 久坐时每两小时做一遍你自己的拉伸动作。
- **English / 中文 / 日本語**，按浏览器语言自动选择，随时可切换。

<p align="center">
  <img src="images/nutrition.png" alt="当天和本周的营养目标" width="49%">
  <img src="images/weight.png" alt="体重记录、趋势图、BMI 和体脂" width="49%">
</p>

## 使用方法

1. 打开 [shinnaaa.github.io/GymSchedule](https://shinnaaa.github.io/GymSchedule/)。初次打开时使用示例身体数据，可以先随便看看。
2. 进入**设置**：填写性别、年龄、身高、体重、活动水平和目标；设置周计划、训练时间和计划开始日期。
3. 每天看**时间线**，每周记录一次体重。

所有数据都保存在浏览器的 `localStorage` 里，没有账号也没有服务器。用**设置 → 导出备份**备份或迁移到其他设备，用**导入备份**恢复。

### 拍照识别（可选）

需要你自己的 [Gemini API key](https://aistudio.google.com/apikey)（免费额度就够用）。在**设置 → 拍照识别**里粘贴。照片和 key 只会从你的浏览器直接发送到 Google 的 API；key 放在请求头里，不会出现在 URL 中。默认只在本次会话的内存中保留，勾选*在这台设备上记住*才会保存。模型的回复被当作不可信数据处理：解析、校验、限制在合理范围内并以纯文本显示，合计值根据各项重新计算。

> **这不是医疗建议。** 所有数字都是基于人群平均值的估算。如果你有疾病、正在怀孕或未满 18 岁，改变饮食前请先咨询医生或营养师。

<p align="center">
  <img src="images/settings.png" alt="设置：身体数据、周计划和训练时间" width="49%">
  <img src="images/mobile.png" alt="手机上的中文界面" width="30%">
</p>

---

## 数字是怎么算的

| | |
|---|---|
| BMR | Mifflin-St Jeor：`10·kg + 6.25·cm − 5·年龄 + 5`（男）或 `− 161`（女） |
| TDEE | BMR × 1.2 / 1.375 / 1.55 / 1.725，对应久坐 / 轻度 / 中度 / 高度活动 |
| 每日变化 | 目标速度（kg/周）× 7,700 kcal ÷ 7，减脂时减去，增肌时加上 |
| 日类型权重 | 训练 1.12、有氧 1.0、休息 0.9 —— 按*你的*一周安排归一化，使周平均正好达到目标 |
| 蛋白质 | 每公斤克数 × 体重（默认 1.8） |
| 脂肪 | 取 0.6–0.8 g/kg 与当天热量 25–35% 中的较大值（休息日碳水少，脂肪略多） |
| 碳水 | 剩余的热量（不低于 30 g） |

当周平均摄入低于 BMR 的 90% 时，周汇总会给出警告。

### 2.0 版的变化

1.0 版是为一个人写的单个 HTML 文件：身体数据、训练安排和训练时间都写死在代码里，界面只有中文。2.0 版重构为有测试的模块化项目，任何人都可以配置，并修复了重构过程中发现的这些问题：

- **通过 AI 回复的 XSS。** Gemini 返回的食物名用 `innerHTML` 插入，特制的图片或异常的模型输出可以注入标签和脚本。现在全部以文本渲染。
- **API key 出现在 URL 里。** Gemini key 以 `?key=` 查询参数发送，会留在日志和历史记录中。现在放在 `x-goog-api-key` 请求头里。
- **刷新后食物记录丢失。** 识别出的食物只保存在内存里。现在会持久保存，并自动清理 30 天前的记录。
- **购物分量算错。** 购物清单把日类型（`train`）传给了期望饮食等级（`high`）的计算函数，米饭分量按错误那天的碳水计算。
- **饮食挡位与说明不符。** 说明文字是写死的数字，和实际计算的结果对不上；现在两者来自同一段代码。
- **BMR 只有男性公式。** 女性也用男性公式计算（高约 166 kcal）。
- **时间线冲突。** 用餐可能被排在训练期间；现在会顺延到训练结束 30 分钟后。

1.0 版的数据（`localStorage` 中的 `fitness_*`）会在首次打开时自动迁移，包括体重记录。

---

## 开发

```bash
npm install
npm run dev      # 开发服务器
npm test         # Vitest：营养、计划、时间线、购物、身体指标、食物记录、识别结果解析、存储和 v1 迁移
npm run lint     # oxlint
npm run build    # → dist/
```

每次 push 都会运行 lint、测试和构建；`main` 分支部署到 GitHub Pages。项目结构见 [English README](../README.md#project-layout)。

## 许可证

[MIT](../LICENSE)
