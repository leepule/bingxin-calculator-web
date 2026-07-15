# 冰心诀 · 暗影千机计算器

从宏工作簿迁移而来的 React 配装计算器，支持装备、大小附魔、五彩石、装备孔和精炼自定义，并在浏览器中执行完整公式链重算。

## 功能

- 12 个装备部位自定义
- 大附魔、小附魔和镶嵌联动
- 4 套工作簿配装方案
- 4273 个公式锚点、动态数组和命名表达式
- 浅色与深色主题
- 装备库、收益分析和加速档位展示

## 本地运行

```bash
yarn install
yarn dev
```

公式回归测试：

```bash
yarn test:formula
```

## 数据来源

项目使用目录中的 Excel/WPS 宏工作簿提取数据和公式模型。原始 Excel 参考页面：

- [JX3BOX · 冰心配装参考](https://www.jx3box.com/bps/107327)

浏览器不会直接执行 `vbaProject.bin`；配装读取、保存和替换操作由 React/JavaScript 实现，DPS 由网页公式运行时计算。

## 目录结构

```text
src/
  components/   通用 React 组件
  engine/       公式运行时与配装计算器
  generated/    从 XLSM 生成的数据和公式模型
  lib/          格式化等通用逻辑
  pages/        页面组件
scripts/        XLSM 数据与公式模型生成脚本
spreadsheets/   Excel/WPS 原始工作簿
tests/          公式链回归测试
```
