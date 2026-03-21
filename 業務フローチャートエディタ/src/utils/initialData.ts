import type {
  FlowchartProject,
  FlowNode,
  FlowEdge,
  Lane,
  LaneGroup,
  Phase,
} from "../types/flowchart";
import {
  DEFAULT_CANVAS_CONFIG,
  DEFAULT_LANE_HEIGHT,
  STYLE_STANDARD_TASK,
  STYLE_IMPORTANT_TASK,
  STYLE_DECISION,
  STYLE_DASHED_TASK,
  STYLE_ANNOTATION,
  STYLE_OPERATOR_BADGE,
  PHASE_COLORS,
} from "./constants";

// ── Lane IDs ─────────────────────────────────────────────────────
const LANE_CUSTOMER = "lane-customer";
const LANE_SALES = "lane-sales";
const LANE_SALES_SUPPORT = "lane-sales-support";
const LANE_TECH_SALES = "lane-tech-sales";
const LANE_ACCOUNTING = "lane-accounting";
const LANE_PROCUREMENT = "lane-procurement";
const LANE_POWER_APP = "lane-power-app";
const LANE_DESIGN = "lane-design";
const LANE_POWAMARU = "lane-powamaru";
const LANE_ASSET = "lane-asset";
const LANE_SYSTEM = "lane-system";
const LANE_OM = "lane-om";

// ── Phase IDs ────────────────────────────────────────────────────
const PHASE_REG = "phase-registration";
const PHASE_SURVEY = "phase-survey";
const PHASE_DOC = "phase-doc-review";
const PHASE_CONST = "phase-construction";

// ── Helpers ──────────────────────────────────────────────────────
const laneH = DEFAULT_LANE_HEIGHT;
const phaseW = 500;

function laneY(order: number): number {
  return DEFAULT_CANVAS_CONFIG.phaseHeaderHeight + order * laneH;
}

function phaseX(order: number): number {
  return DEFAULT_CANVAS_CONFIG.laneLabelsWidth + order * phaseW;
}

// ── Phases ───────────────────────────────────────────────────────
const phases: Phase[] = [
  { id: PHASE_REG, name: "登録", color: PHASE_COLORS.yellow, x: phaseX(0), width: phaseW, order: 0 },
  { id: PHASE_SURVEY, name: "現地調査", color: PHASE_COLORS.yellow, x: phaseX(1), width: phaseW, order: 1 },
  { id: PHASE_DOC, name: "書類確認中", color: PHASE_COLORS.yellow, x: phaseX(2), width: phaseW, order: 2 },
  { id: PHASE_CONST, name: "工事日", color: PHASE_COLORS.yellow, x: phaseX(3), width: phaseW, order: 3 },
];

// ── Lanes ────────────────────────────────────────────────────────
const lanes: Lane[] = [
  { id: LANE_CUSTOMER, name: "お客様", y: laneY(0), height: laneH, order: 0 },
  { id: LANE_SALES, name: "営業", y: laneY(1), height: laneH, order: 1, groupId: "group-olte" },
  { id: LANE_SALES_SUPPORT, name: "営業支援", y: laneY(2), height: laneH, order: 2, groupId: "group-olte" },
  { id: LANE_TECH_SALES, name: "技術営業", y: laneY(3), height: laneH, order: 3, groupId: "group-olte" },
  { id: LANE_ACCOUNTING, name: "経理", y: laneY(4), height: laneH, order: 4, groupId: "group-olte" },
  { id: LANE_PROCUREMENT, name: "調達G", y: laneY(5), height: laneH, order: 5, groupId: "group-olte" },
  { id: LANE_POWER_APP, name: "電力申請", y: laneY(6), height: laneH, order: 6, groupId: "group-olte" },
  { id: LANE_DESIGN, name: "設計", y: laneY(7), height: laneH, order: 7, groupId: "group-olte" },
  { id: LANE_POWAMARU, name: "パワまる業務G", y: laneY(8), height: laneH, order: 8, groupId: "group-olte" },
  { id: LANE_ASSET, name: "アセット管理", y: laneY(9), height: laneH, order: 9, groupId: "group-olte" },
  { id: LANE_SYSTEM, name: "システムG", y: laneY(10), height: laneH, order: 10, groupId: "group-olte" },
  { id: LANE_OM, name: "O&M", y: laneY(11), height: laneH, order: 11, groupId: "group-olte" },
];

// ── Lane Groups ──────────────────────────────────────────────────
const laneGroups: LaneGroup[] = [
  {
    id: "group-olte",
    name: "オルテナジー",
    laneIds: [
      LANE_SALES, LANE_SALES_SUPPORT, LANE_TECH_SALES, LANE_ACCOUNTING,
      LANE_PROCUREMENT, LANE_POWER_APP, LANE_DESIGN, LANE_POWAMARU,
      LANE_ASSET, LANE_SYSTEM, LANE_OM,
    ],
  },
];

// ── Node position helper ─────────────────────────────────────────
// Places a node at a relative position within a phase/lane cell
function pos(
  phaseOrder: number,
  laneOrder: number,
  xOffset: number,
  yOffset: number = 15,
): { x: number; y: number } {
  return {
    x: phaseX(phaseOrder) + xOffset,
    y: laneY(laneOrder) + yOffset,
  };
}

// ── Nodes ────────────────────────────────────────────────────────
const nodes: FlowNode[] = [
  // Customer lane
  { id: "n-cust-1", type: "task", label: "問合せ", laneId: LANE_CUSTOMER, phaseId: PHASE_REG, position: pos(0, 0, 30), size: { width: 100, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-cust-2", type: "decision", label: "検討", laneId: LANE_CUSTOMER, phaseId: PHASE_REG, position: pos(0, 0, 200), size: { width: 70, height: 50 }, style: STYLE_DECISION },
  { id: "n-cust-3", type: "task", label: "申しこみ", laneId: LANE_CUSTOMER, phaseId: PHASE_REG, position: pos(0, 0, 340), size: { width: 100, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-cust-4", type: "task", label: "発注(追加工事分)", laneId: LANE_CUSTOMER, phaseId: PHASE_DOC, position: pos(2, 0, 60), size: { width: 140, height: 44 }, style: STYLE_IMPORTANT_TASK },
  { id: "n-cust-5", type: "task", label: "受渡し", laneId: LANE_CUSTOMER, phaseId: PHASE_CONST, position: pos(3, 0, 180), size: { width: 100, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-cust-6", type: "task", label: "サービス開始", laneId: LANE_CUSTOMER, phaseId: PHASE_CONST, position: pos(3, 0, 360), size: { width: 110, height: 44 }, style: { ...STYLE_IMPORTANT_TASK, backgroundColor: "#E8F5E9" } },

  // Sales lane
  { id: "n-sales-1", type: "task", label: "対応", laneId: LANE_SALES, phaseId: PHASE_REG, position: pos(0, 1, 30), size: { width: 80, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-sales-2", type: "task", label: "管理情報\n登録情報", laneId: LANE_SALES, phaseId: PHASE_REG, position: pos(0, 1, 160), size: { width: 110, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-sales-3", type: "task", label: "標準仕様基準提案", laneId: LANE_SALES, phaseId: PHASE_REG, position: pos(0, 1, 340), size: { width: 130, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-sales-4", type: "task", label: "申込書・申請書類準備", laneId: LANE_SALES, phaseId: PHASE_SURVEY, position: pos(1, 1, 60), size: { width: 150, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-sales-5", type: "task", label: "発注書受領/売買契約共有", laneId: LANE_SALES, phaseId: PHASE_DOC, position: pos(2, 1, 60), size: { width: 170, height: 44 }, style: STYLE_IMPORTANT_TASK },

  // Sales Support lane
  { id: "n-sup-1", type: "task", label: "取引先コンタクト商談", laneId: LANE_SALES_SUPPORT, phaseId: PHASE_REG, position: pos(0, 2, 30), size: { width: 160, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-sup-2", type: "task", label: "登録依頼", laneId: LANE_SALES_SUPPORT, phaseId: PHASE_REG, position: pos(0, 2, 240), size: { width: 100, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-sup-3", type: "task", label: "標準仕様格り作成\n電波確認", laneId: LANE_SALES_SUPPORT, phaseId: PHASE_REG, position: pos(0, 2, 380), size: { width: 110, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-sup-4", type: "task", label: "受注残処理部", laneId: LANE_SALES_SUPPORT, phaseId: PHASE_SURVEY, position: pos(1, 2, 60), size: { width: 110, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-sup-5", type: "task", label: "設計依頼(CRM情報)", laneId: LANE_SALES_SUPPORT, phaseId: PHASE_DOC, position: pos(2, 2, 60), size: { width: 140, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-sup-6", type: "task", label: "受注残処理依頼", laneId: LANE_SALES_SUPPORT, phaseId: PHASE_CONST, position: pos(3, 2, 60), size: { width: 120, height: 44 }, style: STYLE_STANDARD_TASK },

  // Tech Sales lane
  { id: "n-tech-1", type: "decision", label: "構成確認", laneId: LANE_TECH_SALES, phaseId: PHASE_SURVEY, position: pos(1, 3, 80), size: { width: 80, height: 50 }, style: STYLE_DECISION },
  { id: "n-tech-2", type: "task", label: "追加工事見積り作成", laneId: LANE_TECH_SALES, phaseId: PHASE_DOC, position: pos(2, 3, 60), size: { width: 150, height: 44 }, style: STYLE_STANDARD_TASK },

  // Accounting lane
  { id: "n-acct-1", type: "task", label: "受注情報登", laneId: LANE_ACCOUNTING, phaseId: PHASE_REG, position: pos(0, 4, 200), size: { width: 100, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-acct-2", type: "task", label: "決済情報確認&\nリース申請依頼", laneId: LANE_ACCOUNTING, phaseId: PHASE_DOC, position: pos(2, 4, 60), size: { width: 140, height: 44 }, style: STYLE_STANDARD_TASK },

  // Procurement lane
  { id: "n-proc-1", type: "task", label: "機器・資材手配/在庫管理・現場", laneId: LANE_PROCUREMENT, phaseId: PHASE_DOC, position: pos(2, 5, 40), size: { width: 190, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-proc-2", type: "task", label: "SmartLogger・SIM発送し", laneId: LANE_PROCUREMENT, phaseId: PHASE_CONST, position: pos(3, 5, 60), size: { width: 160, height: 44 }, style: STYLE_STANDARD_TASK },

  // Power Application lane
  { id: "n-power-1", type: "task", label: "工事", laneId: LANE_POWER_APP, phaseId: PHASE_SURVEY, position: pos(1, 6, 60), size: { width: 80, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-power-2", type: "task", label: "電力申請高圧系事\n(受電側工程管理)", laneId: LANE_POWER_APP, phaseId: PHASE_DOC, position: pos(2, 6, 40), size: { width: 160, height: 44 }, style: STYLE_DASHED_TASK },
  { id: "n-power-3", type: "task", label: "申請", laneId: LANE_POWER_APP, phaseId: PHASE_CONST, position: pos(3, 6, 60), size: { width: 80, height: 44 }, style: STYLE_STANDARD_TASK },

  // Design lane
  { id: "n-design-1", type: "task", label: "設計", laneId: LANE_DESIGN, phaseId: PHASE_DOC, position: pos(2, 7, 40), size: { width: 80, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-design-2", type: "task", label: "部材リスト作成", laneId: LANE_DESIGN, phaseId: PHASE_DOC, position: pos(2, 7, 200), size: { width: 120, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-design-3", type: "task", label: "設計図面修正", laneId: LANE_DESIGN, phaseId: PHASE_CONST, position: pos(3, 7, 60), size: { width: 110, height: 44 }, style: STYLE_STANDARD_TASK },

  // Powamaru Operations lane
  { id: "n-powa-1", type: "task", label: "管理コンソール/\nID/PASS設定・連絡", laneId: LANE_POWAMARU, phaseId: PHASE_REG, position: pos(0, 8, 200), size: { width: 150, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-powa-2", type: "task", label: "ユーザーID/PASS\n確認入力", laneId: LANE_POWAMARU, phaseId: PHASE_SURVEY, position: pos(1, 8, 60), size: { width: 130, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-powa-3", type: "task", label: "工事日確定連絡", laneId: LANE_POWAMARU, phaseId: PHASE_DOC, position: pos(2, 8, 60), size: { width: 120, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-powa-4", type: "task", label: "施工日確定入力", laneId: LANE_POWAMARU, phaseId: PHASE_DOC, position: pos(2, 8, 280), size: { width: 120, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-powa-5", type: "task", label: "完了登録/\nデータ確認", laneId: LANE_POWAMARU, phaseId: PHASE_CONST, position: pos(3, 8, 60), size: { width: 120, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-powa-6", type: "task", label: "稼働連絡", laneId: LANE_POWAMARU, phaseId: PHASE_CONST, position: pos(3, 8, 300), size: { width: 100, height: 44 }, style: STYLE_STANDARD_TASK },

  // Asset Management lane
  { id: "n-asset-1", type: "task", label: "現調受付/日程調整", laneId: LANE_ASSET, phaseId: PHASE_SURVEY, position: pos(1, 9, 40), size: { width: 140, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-asset-2", type: "task", label: "現地調査情報記入の確認", laneId: LANE_ASSET, phaseId: PHASE_SURVEY, position: pos(1, 9, 260), size: { width: 160, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-asset-3", type: "task", label: "工事手配", laneId: LANE_ASSET, phaseId: PHASE_DOC, position: pos(2, 9, 40), size: { width: 90, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-asset-4", type: "badge", label: "OPERATOR", laneId: LANE_ASSET, phaseId: PHASE_DOC, position: pos(2, 9, 200), size: { width: 90, height: 30 }, style: STYLE_OPERATOR_BADGE },
  { id: "n-asset-5", type: "task", label: "S/L単体設定", laneId: LANE_ASSET, phaseId: PHASE_CONST, position: pos(3, 9, 40), size: { width: 110, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-asset-6", type: "task", label: "竣工報告書作成", laneId: LANE_ASSET, phaseId: PHASE_CONST, position: pos(3, 9, 200), size: { width: 120, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-asset-7", type: "task", label: "S/N登録", laneId: LANE_ASSET, phaseId: PHASE_CONST, position: pos(3, 9, 360), size: { width: 90, height: 44 }, style: STYLE_STANDARD_TASK },

  // System G lane
  { id: "n-sys-1", type: "task", label: "管理コンソール/\n監視側ゲートウェイ/\nIoTデバイスG", laneId: LANE_SYSTEM, phaseId: PHASE_CONST, position: pos(3, 10, 40), size: { width: 160, height: 50 }, style: STYLE_STANDARD_TASK },
  { id: "n-sys-2", type: "task", label: "架通確認/\nシステム連携", laneId: LANE_SYSTEM, phaseId: PHASE_CONST, position: pos(3, 10, 280), size: { width: 120, height: 44 }, style: STYLE_STANDARD_TASK },

  // O&M lane
  { id: "n-om-1", type: "annotation", label: "閲覧のみ", laneId: LANE_OM, phaseId: PHASE_REG, position: pos(0, 11, 60), size: { width: 80, height: 30 }, style: STYLE_ANNOTATION },
  { id: "n-om-2", type: "task", label: "現地調査", laneId: LANE_OM, phaseId: PHASE_SURVEY, position: pos(1, 11, 60), size: { width: 100, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-om-3", type: "task", label: "施工情報共有", laneId: LANE_OM, phaseId: PHASE_DOC, position: pos(2, 11, 60), size: { width: 110, height: 44 }, style: STYLE_STANDARD_TASK },
  { id: "n-om-4", type: "task", label: "設計依頼", laneId: LANE_OM, phaseId: PHASE_CONST, position: pos(3, 11, 60), size: { width: 100, height: 44 }, style: STYLE_STANDARD_TASK },

  // Asset input node at end
  { id: "n-asset-8", type: "task", label: "アセット入力", laneId: LANE_ASSET, phaseId: PHASE_CONST, position: pos(3, 9, 460), size: { width: 100, height: 44 }, style: STYLE_STANDARD_TASK },
];

// ── Edges ────────────────────────────────────────────────────────
const edges: FlowEdge[] = [
  // Customer flow
  { id: "e-c1-c2", source: "n-cust-1", target: "n-cust-2", lineStyle: "solid" },
  { id: "e-c2-c3", source: "n-cust-2", target: "n-cust-3", lineStyle: "solid", label: "OK" },
  { id: "e-c4-c5", source: "n-cust-4", target: "n-cust-5", lineStyle: "solid" },
  { id: "e-c5-c6", source: "n-cust-5", target: "n-cust-6", lineStyle: "solid" },

  // Customer to Sales
  { id: "e-c1-s1", source: "n-cust-1", target: "n-sales-1", lineStyle: "solid" },
  { id: "e-c3-s3", source: "n-cust-3", target: "n-sales-3", lineStyle: "solid" },

  // Sales flow
  { id: "e-s1-s2", source: "n-sales-1", target: "n-sales-2", lineStyle: "solid" },
  { id: "e-s2-s3", source: "n-sales-2", target: "n-sales-3", lineStyle: "solid" },
  { id: "e-s3-s4", source: "n-sales-3", target: "n-sales-4", lineStyle: "solid" },
  { id: "e-s4-s5", source: "n-sales-4", target: "n-sales-5", lineStyle: "solid" },

  // Sales to Sales Support
  { id: "e-s2-sup1", source: "n-sales-2", target: "n-sup-1", lineStyle: "solid" },
  { id: "e-sup1-sup2", source: "n-sup-1", target: "n-sup-2", lineStyle: "solid" },
  { id: "e-sup2-sup3", source: "n-sup-2", target: "n-sup-3", lineStyle: "solid" },
  { id: "e-sup3-sup4", source: "n-sup-3", target: "n-sup-4", lineStyle: "solid" },
  { id: "e-sup4-sup5", source: "n-sup-4", target: "n-sup-5", lineStyle: "solid" },
  { id: "e-sup5-sup6", source: "n-sup-5", target: "n-sup-6", lineStyle: "solid" },

  // Tech Sales flow
  { id: "e-sup4-tech1", source: "n-sup-4", target: "n-tech-1", lineStyle: "solid" },
  { id: "e-tech1-tech2", source: "n-tech-1", target: "n-tech-2", lineStyle: "solid" },
  { id: "e-tech2-c4", source: "n-tech-2", target: "n-cust-4", lineStyle: "solid" },

  // Accounting flow
  { id: "e-s2-acct1", source: "n-sales-2", target: "n-acct-1", lineStyle: "dashed" },
  { id: "e-acct1-acct2", source: "n-acct-1", target: "n-acct-2", lineStyle: "solid" },

  // Procurement flow
  { id: "e-sup5-proc1", source: "n-sup-5", target: "n-proc-1", lineStyle: "solid" },
  { id: "e-proc1-proc2", source: "n-proc-1", target: "n-proc-2", lineStyle: "solid" },

  // Power application flow
  { id: "e-sup4-power1", source: "n-sup-4", target: "n-power-1", lineStyle: "dashed" },
  { id: "e-power1-power2", source: "n-power-1", target: "n-power-2", lineStyle: "dashed" },
  { id: "e-power2-power3", source: "n-power-2", target: "n-power-3", lineStyle: "dashed" },

  // Design flow
  { id: "e-sup5-design1", source: "n-sup-5", target: "n-design-1", lineStyle: "solid" },
  { id: "e-design1-design2", source: "n-design-1", target: "n-design-2", lineStyle: "solid" },
  { id: "e-design2-design3", source: "n-design-2", target: "n-design-3", lineStyle: "solid" },

  // Powamaru flow
  { id: "e-sup2-powa1", source: "n-sup-2", target: "n-powa-1", lineStyle: "solid" },
  { id: "e-powa1-powa2", source: "n-powa-1", target: "n-powa-2", lineStyle: "solid" },
  { id: "e-powa3-powa4", source: "n-powa-3", target: "n-powa-4", lineStyle: "solid" },
  { id: "e-powa4-powa5", source: "n-powa-4", target: "n-powa-5", lineStyle: "solid" },
  { id: "e-powa5-powa6", source: "n-powa-5", target: "n-powa-6", lineStyle: "solid" },

  // Asset Management flow
  { id: "e-asset1-asset2", source: "n-asset-1", target: "n-asset-2", lineStyle: "solid" },
  { id: "e-asset2-asset3", source: "n-asset-2", target: "n-asset-3", lineStyle: "solid" },
  { id: "e-asset3-asset5", source: "n-asset-3", target: "n-asset-5", lineStyle: "solid" },
  { id: "e-asset5-asset6", source: "n-asset-5", target: "n-asset-6", lineStyle: "solid" },
  { id: "e-asset6-asset7", source: "n-asset-6", target: "n-asset-7", lineStyle: "solid" },
  { id: "e-asset7-asset8", source: "n-asset-7", target: "n-asset-8", lineStyle: "solid" },

  // Powamaru to Asset
  { id: "e-powa3-asset3", source: "n-powa-3", target: "n-asset-3", lineStyle: "solid" },

  // System G flow
  { id: "e-sys1-sys2", source: "n-sys-1", target: "n-sys-2", lineStyle: "solid" },
  { id: "e-asset5-sys1", source: "n-asset-5", target: "n-sys-1", lineStyle: "solid" },

  // O&M flow
  { id: "e-om2-om3", source: "n-om-2", target: "n-om-3", lineStyle: "solid" },
  { id: "e-om3-om4", source: "n-om-3", target: "n-om-4", lineStyle: "solid" },
  { id: "e-asset1-om2", source: "n-asset-1", target: "n-om-2", lineStyle: "dashed" },

  // Powa to customer delivery
  { id: "e-powa6-c6", source: "n-powa-6", target: "n-cust-6", lineStyle: "solid" },
];

/**
 * Creates the initial sample project data representing
 * the "パワまる 2603～(社内SIM)" flowchart.
 */
export function createInitialProject(): FlowchartProject {
  return {
    id: "proj-powamaru-sim",
    title: "パワまる 2603～(社内SIM）",
    subtitle: "業務フロー図",
    phases,
    laneGroups,
    lanes,
    nodes,
    edges,
    canvasConfig: { ...DEFAULT_CANVAS_CONFIG },
  };
}
