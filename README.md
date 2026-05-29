# Wenmo Ziwei JSON

本项目只保留紫微斗数排盘核心、稳定 JSON 序列化、文墨风格标记层和本地校验脚本；不包含前端页面、AI 解读或默认外部网络请求。

## 规则口径

- 排盘内核：`iztro`
- JSON schema：`wenmo-ziwei-json/v2`
- 引擎追溯：JSON `engine.version` 记录实际加载的 `iztro` 版本
- 年分界：正月初一
- 运限分界：正月初一
- 子初换日：23:00 换日
- 安星法：中州派
- 宫名：`仆役` 统一输出为 `交友宫`；本命盘和流限宫名都必须是 12 个唯一固定宫名
- 四化：输出生年四化、自化 `↓`、向心自化 `↑`
- 流限：目标日期存在时，JSON 输出大限、流年、流月、流日、流时的 12 宫星曜、12 宫名和 `mutagenStars` 四化星映射；流时使用目标时辰，未传 `--target-hour` 时记录并使用 00:00 子时；`小限/age` 只保存 `iztro` 提供的基础 scope 字段，不补造星曜明细

## 使用

```powershell
$env:PATH = (Resolve-Path ..\.tools\node-v24.14.0-win-x64).Path + ';' + $env:PATH
npm run build
npm run generate -- --year 2000 --month 1 --day 1 --hour 0 --minute 0 --gender male --target-date 2026-01-01 --out output/demo-chart.json
```

CLI 只允许把 JSON 写入项目内的本地生成目录：

- `output/`
- `exports/`
- `private/`

`--out` 必须是 `.json` 文件，且不能写到项目目录之外，避免误写系统路径或公开源码文件。
输入字段使用固定白名单；除年月日时分、性别、`fixLeap`、`location`、`longitude` 外的额外字段会被拒绝，避免把姓名、备注或其他隐私资料混入命盘 JSON。
输出 JSON 的 `input.calendar` 固定记录为 `solar`。
`location` 和 `longitude` 只保存为输入备查，`input.locationUsedForCalculation` 与 `input.longitudeUsedForCalculation` 固定为 `false`。
CLI 可用 `--fix-leap true/false` 显式控制闰月修正开关。
CLI 可用 `--target-hour 0-23` 和 `--target-minute 0-59` 显式控制流时；传入目标时分时必须同时传入 `--target-date`。
输出 JSON 的 `input.fixLeap` 记录实际生效值；未传时默认为 `true`。
输出 JSON 的 `input.timeIndex` 记录实际传入 `iztro` 的出生时辰索引；23:00-23:59 会记录为 `12`，用于区分晚子时。
`natal.rawDates` 只保留经过结构校验的农历日期和四柱干支对，不透传未知原始对象。
所有输出干支字段必须落在十天干和十二地支枚举内；异常干支会直接中止生成。
每宫长生十二神、博士十二神、将前十二神、岁前十二神必须完整存在；星曜 `type`、`scope`、`brightness` 必须落在已知枚举内；星曜四化必须能输出对应 `化禄/化权/化科/化忌` 标签。

## 项目结构

```text
src/      可上传的排盘核心、序列化和文墨标记规则
scripts/  可上传的演示验证和隐私上传检查脚本
docs/     可上传的技术文档，不放真实案例
output/   本地生成命盘，默认忽略，不上传
inputs/   本地输入参数，默认忽略，不上传
private/  本地真实资料，默认忽略，不上传
exports/  本地导出结果，默认忽略，不上传
```

真实姓名、出生日期时间、出生地、经纬度、联系方式、命盘 JSON、解读记录和任何客户/案例文件，只能放在已忽略的本地目录中。上传前运行：

```powershell
npm run privacy:audit
```

## 验证

```powershell
npm test
```

演示校验固定参数：

- 阳历：2000-01-01 00:00
- 性别：男
- 目标日期：2026-01-01

校验内容覆盖引擎版本追溯、出生时辰索引、干支枚举、12 个唯一宫名、12 宫结构、四组神煞、宫位大限、小限年龄、原始日期结构、星曜元数据枚举、星曜四化标签、核心文墨标记、来因宫、五层流限星曜和宫名、流限四化星映射、非法输入、CLI 输出边界、闰月修正开关和隐私规则。新增规则时应先补充可重复验证的脚本，再更新文档。
