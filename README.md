# Wenmo Ziwei JSON

本项目现在只保留紫微斗数排盘核心和文墨天机风格标记层，不包含前端页面、AI 解读或任何默认外部网络请求。

## 规则口径

- 排盘内核：`iztro`
- 年分界：正月初一
- 运限分界：正月初一
- 子初换日：23:00 换日
- 安星法：中州派
- 宫名：`仆役` 统一输出为 `交友宫`
- 四化：输出生年四化、自化 `↓`、向心自化 `↑`
- 流限：JSON 可包含大限、流年、流月、流日、流时

## 使用

```powershell
$env:PATH = 'E:\Code\ziweridoushu\.tools\node-v24.14.0-win-x64;' + $env:PATH
npm run build
npm run generate -- --year 2000 --month 1 --day 1 --hour 0 --minute 0 --gender male --target-date 2026-01-01 --out output/demo-chart.json
```

生成文件只写入本地 JSON，例如：

```text
output/demo-chart.json
```

`output/` 目录已加入 `.gitignore`，不要把包含真实出生资料、地点、姓名或解读记录的生成文件提交到 GitHub。

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

验证样例固定为：

- 阳历：2000-01-01 00:00
- 性别：男

必须命中的文墨风格标记：

- 福德宫：左辅 `↑科`
- 官禄宫：太阴 `↓权`、文曲 `生年忌`
- 交友宫：贪狼 `生年权`、`↓权`、`来因`
- 财帛宫：天同 `↑禄`、天梁 `生年科`、`↓禄`
- 子女宫：武曲 `生年禄`
- 夫妻宫：太阳 `↓忌`
- 命宫：天机 `↓权`
