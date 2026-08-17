import { useEffect, useMemo, useState } from "react";
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Circle,
  Columns3,
  Copy,
  Database,
  FileCode2,
  FolderOpen,
  GalleryHorizontalEnd,
  LayoutDashboard,
  Loader2,
  Moon,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sun,
  SwatchBook,
  Zap,
} from "lucide-react";
import {
  duplicateGroupBadgeLabel,
  duplicateGroupBoardCountCopy,
  duplicateGroupBoardFilterCopy,
  duplicateGroupFindingSummary,
  duplicateGroupJumpTargets,
  duplicateGroupPanelCopy,
  filterDuplicateGroupSummaries,
  findDuplicateGroups,
  parseDuplicateBoardFilter,
  type DuplicateGroupFinding,
  type DuplicateGroupPanelMode,
} from "./group-duplicates";
import { movePageBlockToRegion, reorderPageBlock } from "./page-layout";
import {
  emptyReviewProgressCopy,
  filterReportReviewItems,
  loadedReviewDecisionMessage,
  loadedReviewDecisionSummary,
  normalizeReportFilters,
  parseReportFilters,
  parseStoredReviewDecisionResult,
  pruneReviewDecisions,
  reviewDecisionSourceMessage,
  reviewDecisionSourceSummary,
  reviewDecisionExportPayload,
  reviewItemKey,
  reviewedReportStatus,
  reportReviewTotals,
  staleLocalDecisionActionLabel,
  storedReviewDecisionWarningMessage,
  uniqueReportValues,
  type ReviewDecision,
  type ReportReviewFilters,
} from "./report-review";
import "./App.css";

type ComponentSummary = {
  id: string;
  name: string;
  description: string;
  stateCount: number;
};

type ComponentFile = {
  component: {
    id: string;
    name: string;
    description: string;
    themes: string[];
  };
  framework: {
    react: boolean;
    svelte: boolean;
  };
  props: ComponentProp[];
  states: ComponentState[];
};

type ComponentProp = {
  id: string;
  label: string;
  kind: "boolean" | "enum" | "text" | "number";
  default: string;
  values: string[];
};

type ComponentState = {
  id: string;
  label: string;
  props: Record<string, string>;
};

type GroupSummary = {
  id: string;
  name: string;
  description: string;
  layout: GroupLayout;
  itemCount: number;
};

type GroupFile = {
  group: {
    id: string;
    name: string;
    description: string;
    layout: GroupLayout;
    themes: string[];
  };
  items: GroupItem[];
};

type GroupItem = {
  kind?: "component" | "variant" | "";
  component: string;
  state: string;
  variant?: string;
  role: string;
};

type VariantSummary = {
  id: string;
  name: string;
  description: string;
  component: string;
  state: string;
  slotCount: number;
};

type VariantFile = {
  variant: {
    id: string;
    name: string;
    description: string;
    component: string;
    state: string;
    themes: string[];
  };
  framework: {
    react: boolean;
    svelte: boolean;
  };
  source: {
    adapter: string;
    id: string;
    path: string;
  };
  props: Record<string, string>;
  slots: VariantSlot[];
};

type VariantSlot = {
  name: string;
  kind: "text" | "media" | "badge" | "divider" | "action" | "metadata" | string;
  value: string;
};

type PageSummary = {
  id: string;
  name: string;
  description: string;
  theme: string;
  blockCount: number;
};

type PageFile = {
  page: {
    id: string;
    name: string;
    description: string;
    theme: string;
    route: string;
  };
  regions: PageRegion[];
};

type PageRegion = {
  id: string;
  label: string;
  layout: PageLayout;
  blocks: PageBlock[];
};

type PageBlock = {
  kind: "group" | "variant";
  reference: string;
  role: string;
  layout: PageLayout;
};

type ThemeSummary = {
  id: string;
  name: string;
  description: string;
};

type ThemeFile = {
  theme: ThemeSummary;
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    text: string;
    muted: string;
    border: string;
    primary: string;
    secondary: string;
    danger: string;
    success: string;
    warning: string;
    focus: string;
  };
  spacing: {
    unit: number;
    density: string;
  };
  radius: {
    small: number;
    medium: number;
    large: number;
  };
  typography: {
    font: string;
    scale: number;
  };
};

type EnvironmentStatus = {
  duckdbAvailable: boolean;
  duckdbVersion?: string;
  ollamaAvailable: boolean;
  ollamaVersion?: string;
  embeddingModel: string;
  indexInitialized: boolean;
  indexedRecordCount: number;
  message: string;
};

type CatalogRecordType = "component" | "theme" | "group" | "variant" | "page" | "source" | "shadcn-component" | "source-item";

type CatalogResult = {
  id: string;
  recordType: CatalogRecordType;
  title: string;
  body: string;
};

type SourceSummary = {
  id: string;
  name: string;
  description: string;
  adapter: string;
  kind: string;
  location: string;
  enabled: boolean;
  itemCount: number;
  status: "ready" | "warning";
};

type SourceCatalog = {
  source: SourceSummary;
  items: SourceCatalogItem[];
  warnings: string[];
};

type SourceCatalogItem = {
  id: string;
  name: string;
  itemType: string;
  description: string;
  files: string[];
  dependencies: string[];
  sourcePath: string;
  previewStatus: string;
};

type SourceItemImportResult = {
  componentId: string;
  path: string;
  materializedFiles: string[];
  status: string;
};

type SourceItemImportRequest = {
  sourceId: string;
  itemId: string;
};

type GroupValidation = {
  status: "ready" | "warning" | "error";
  issueCount: number;
  issues: GroupValidationIssue[];
};

type GroupValidationIssue = {
  severity: "warning" | "error";
  title: string;
  detail: string;
};

type VisualCheck = {
  status: "ready" | "warning" | "error";
  title: string;
  detail: string;
};

type ScreenshotReportSummary = {
  reportPath: string;
  htmlReportPath: string;
  markdownReportPath: string;
  comparedAt: string;
  baselineSnapshotId: string;
  latestSnapshotId: string;
  baselineDir: string;
  latestDir: string;
  status: "ready" | "tolerated" | "review";
  statusTitle: string;
  statusDetail: string;
  thresholds: {
    pixelColorDistance: number;
    pixelDiffRatio: number;
  };
  summary: {
    added: number;
    removed: number;
    changed: number;
    tolerated: number;
    unchanged: number;
    totalCompared: number;
    changedPixels: number;
    toleratedPixels: number;
  };
  reviewItems: ScreenshotReviewItem[];
  reviewDecisions: ScreenshotReviewDecision[];
};

type ScreenshotReviewItem = {
  status: "changed" | "added" | "removed" | "tolerated";
  theme: string;
  kind: string;
  name: string;
  relativePath: string;
  previewPath: string | null;
  baselinePath: string | null;
  latestPath: string | null;
  diffPath: string | null;
  changedPixels: number | null;
  changedRatio: number | null;
};

type ScreenshotReviewDecision = {
  key: string;
  decision: ReviewDecision;
};

type ScreenshotReviewExportResult = {
  path: string;
  accepted: number;
  dismissed: number;
  decisionCount: number;
};

type GroupLayout = "row" | "grid" | "stack" | "toolbar" | "form-row" | "dialog-footer" | "table-header";
type PageLayout = "stack" | "grid" | "split" | "sidebar" | "section";
type LibraryMode = "components" | "variants" | "groups" | "pages" | "sources";
type InvokeArgs = Record<string, unknown>;
type TomlValue = string | number | boolean | string[] | Record<string, string>;

interface TomlObject {
  [key: string]: TomlValue | TomlObject | TomlObject[];
}

const metadataModules = import.meta.glob("../metadata/**/*.toml", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

let browserGroupFiles: GroupFile[] | null = null;
let browserVariantFiles: VariantFile[] | null = null;
let browserPageFiles: PageFile[] | null = null;
let browserImportedComponents: ComponentFile[] = [];

const groupLayouts: GroupLayout[] = ["row", "grid", "stack", "toolbar", "form-row", "dialog-footer", "table-header"];
const pageLayouts: PageLayout[] = ["stack", "grid", "split", "sidebar", "section"];
const variantSlotKinds = ["text", "media", "badge", "divider", "action", "metadata"];
const booleanValue = (value: string | undefined) => value === "true";

const emptyGroupDraft = (): GroupFile => ({
  group: {
    id: "",
    name: "New Component Area",
    description: "A named area where selected component states belong together.",
    layout: "row",
    themes: ["light", "dark", "aurora"],
  },
  items: [
    { component: "badge", state: "soft-info", role: "Status" },
    { component: "card", state: "comfortable-summary", role: "Summary" },
    { component: "button", state: "primary-ready", role: "Action" },
  ],
});

const emptyVariantDraft = (): VariantFile => ({
  variant: {
    id: "",
    name: "New Card Variant",
    description: "A saved component recipe that can be reused in groups and pages.",
    component: "card",
    state: "comfortable-summary",
    themes: ["blue-slate", "light", "dark", "aurora"],
  },
  framework: {
    react: true,
    svelte: false,
  },
  source: {
    adapter: "local-toml",
    id: "local-toml",
    path: "metadata/components/card.toml",
  },
  props: {
    density: "comfortable",
    tone: "neutral",
    showFooter: "true",
    title: "New reusable card",
    metric: "94",
  },
  slots: [
    { name: "media", kind: "media", value: "Preview media" },
    { name: "header", kind: "text", value: "New reusable card" },
    { name: "body", kind: "text", value: "Structured slots keep component editing form-driven." },
    { name: "action", kind: "action", value: "Review" },
  ],
});

const emptyPageDraft = (): PageFile => ({
  page: {
    id: "",
    name: "New React Page",
    description: "A block-based page assembled from saved variants and groups.",
    theme: "blue-slate",
    route: "/new-react-page",
  },
  regions: [
    {
      id: "header",
      label: "Header",
      layout: "section",
      blocks: [{ kind: "variant", reference: "project-feature-card", role: "Hero feature", layout: "section" }],
    },
    {
      id: "main",
      label: "Main",
      layout: "stack",
      blocks: [
        { kind: "group", reference: "dash-summary", role: "Dashboard summary", layout: "grid" },
        { kind: "variant", reference: "project-feature-card", role: "Saved feature card", layout: "section" },
      ],
    },
    {
      id: "footer",
      label: "Footer",
      layout: "section",
      blocks: [{ kind: "group", reference: "confirm-footer", role: "Footer actions", layout: "section" }],
    },
  ],
});

async function invoke<T>(command: string, args: InvokeArgs = {}): Promise<T> {
  if (isTauriRuntime()) {
    return tauriInvoke<T>(command, args);
  }

  return browserInvoke<T>(command, args);
}

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

async function browserInvoke<T>(command: string, args: InvokeArgs): Promise<T> {
  switch (command) {
    case "list_components":
      return listBrowserComponents() as T;
    case "load_component":
      return loadBrowserComponent(String(args.componentId)) as T;
    case "list_groups":
      return listBrowserGroups() as T;
    case "load_group":
      return loadBrowserGroup(String(args.groupId)) as T;
    case "list_variants":
      return listBrowserVariants() as T;
    case "load_variant":
      return loadBrowserVariant(String(args.variantId)) as T;
    case "save_variant":
      return saveBrowserVariant(args.variant as VariantFile) as T;
    case "update_variant":
      return updateBrowserVariant(String(args.originalVariantId), args.variant as VariantFile) as T;
    case "validate_variant":
      return validateVariantAgainstComponents(args.variant as VariantFile, listBrowserComponentFiles()) as T;
    case "list_pages":
      return listBrowserPages() as T;
    case "load_page":
      return loadBrowserPage(String(args.pageId)) as T;
    case "save_page":
      return saveBrowserPage(args.page as PageFile) as T;
    case "update_page":
      return updateBrowserPage(String(args.originalPageId), args.page as PageFile) as T;
    case "validate_page":
      return validatePageAgainstRecords(args.page as PageFile, listBrowserGroupFiles(), listBrowserVariantFiles()) as T;
    case "list_sources":
      return listBrowserSources() as T;
    case "load_source_catalog":
      return loadBrowserSourceCatalog(String(args.sourceId)) as T;
    case "import_source_item_as_component":
      return importBrowserSourceItem(args.request as SourceItemImportRequest) as T;
    case "save_group":
      return saveBrowserGroup(args.group as GroupFile) as T;
    case "update_group":
      return updateBrowserGroup(String(args.originalGroupId), args.group as GroupFile) as T;
    case "validate_group":
      return validateGroupAgainstComponents(args.group as GroupFile, listBrowserComponentFiles()) as T;
    case "list_themes":
      return listBrowserThemes() as T;
    case "load_theme":
      return loadBrowserTheme(String(args.themeId)) as T;
    case "save_preview_selection":
      return undefined as T;
    case "initialize_local_index":
      return browserEnvironmentStatus() as T;
    case "search_index":
      return searchBrowserIndex(String(args.query ?? ""), String(args.recordType ?? "all")) as T;
    case "latest_screenshot_report":
      return browserScreenshotReportFixture() as T;
    case "recent_screenshot_reports":
      return [browserScreenshotReportFixture()] as T;
    case "export_screenshot_review_decisions":
      throw new Error("Review decision export is available in the desktop app.");
    default:
      throw new Error(`Browser preview does not support command: ${command}`);
  }
}

function browserScreenshotReportFixture(): ScreenshotReportSummary {
  return {
    reportPath: "browser://reports/smoke-source.json",
    htmlReportPath: "browser://reports/smoke-source.html",
    markdownReportPath: "browser://reports/smoke-source.md",
    comparedAt: "2026-08-09T00:00:00.000Z",
    baselineSnapshotId: "smoke-base",
    latestSnapshotId: "smoke-latest",
    baselineDir: "browser://previews/smoke-base",
    latestDir: "browser://previews/smoke-latest",
    status: "review",
    statusTitle: "Needs review",
    statusDetail: "Browser smoke fixture includes review items.",
    thresholds: {
      pixelColorDistance: 0,
      pixelDiffRatio: 0,
    },
    summary: {
      added: 1,
      removed: 0,
      changed: 1,
      tolerated: 0,
      unchanged: 37,
      totalCompared: 39,
      changedPixels: 24,
      toleratedPixels: 0,
    },
    reviewItems: [
      {
        status: "changed",
        theme: "light",
        kind: "components",
        name: "Button / Primary",
        relativePath: "light/components/button-primary.png",
        previewPath: null,
        baselinePath: null,
        latestPath: null,
        diffPath: null,
        changedPixels: 24,
        changedRatio: 0.001,
      },
      {
        status: "added",
        theme: "dark",
        kind: "groups",
        name: "Settings Row",
        relativePath: "dark/groups/settings-row.png",
        previewPath: null,
        baselinePath: null,
        latestPath: null,
        diffPath: null,
        changedPixels: null,
        changedRatio: null,
      },
    ],
    reviewDecisions: [
      {
        key: "changed:light/components/button-primary.png",
        decision: "accepted",
      },
    ],
  };
}

function listBrowserComponents(): ComponentSummary[] {
  return listBrowserComponentFiles().map((component) => ({
    id: component.component.id,
    name: component.component.name,
    description: component.component.description,
    stateCount: component.states.length,
  }));
}

function listBrowserComponentFiles(): ComponentFile[] {
  return [...readBrowserMetadata<ComponentFile>("components"), ...browserImportedComponents.map(clone)].sort((left, right) =>
    left.component.id.localeCompare(right.component.id),
  );
}

function loadBrowserComponent(componentId: string): ComponentFile {
  const component = listBrowserComponentFiles().find((item) => item.component.id === componentId);
  if (!component) throw new Error(`Component ${componentId} was not found in browser metadata.`);
  return clone(component);
}

function listBrowserGroups(): GroupSummary[] {
  return listBrowserGroupFiles().map((group) => ({
    id: group.group.id,
    name: group.group.name,
    description: group.group.description,
    layout: group.group.layout,
    itemCount: group.items.length,
  }));
}

function listBrowserGroupFiles(): GroupFile[] {
  if (!browserGroupFiles) {
    browserGroupFiles = readBrowserMetadata<GroupFile>("groups");
  }

  return browserGroupFiles.map(clone);
}

function loadBrowserGroup(groupId: string): GroupFile {
  const group = listBrowserGroupFiles().find((item) => item.group.id === groupId);
  if (!group) throw new Error(`Group ${groupId} was not found in browser metadata.`);
  return clone(group);
}

function saveBrowserGroup(group: GroupFile): GroupFile {
  const saved = normalizeGroupForSave(group);
  const groups = listBrowserGroupFiles();
  if (groups.some((item) => item.group.id === saved.group.id)) {
    throw new Error(`A group named ${saved.group.name} already exists. Choose a different name before saving.`);
  }

  browserGroupFiles = [...groups, saved].sort((left, right) => left.group.id.localeCompare(right.group.id));
  return clone(saved);
}

function updateBrowserGroup(originalGroupId: string, group: GroupFile): GroupFile {
  const saved = normalizeGroupForSave(group);
  const groups = listBrowserGroupFiles();
  if (groups.some((item) => item.group.id !== originalGroupId && item.group.id === saved.group.id)) {
    throw new Error(`A group named ${saved.group.name} already exists. Choose a different name before saving.`);
  }

  browserGroupFiles = groups
    .filter((item) => item.group.id !== originalGroupId)
    .concat(saved)
    .sort((left, right) => left.group.id.localeCompare(right.group.id));
  return clone(saved);
}

function normalizeGroupForSave(group: GroupFile): GroupFile {
  const saved = clone(group);
  saved.group.id = slugify(saved.group.name);
  if (!saved.group.id) {
    throw new Error("Group name must contain at least one letter or number.");
  }

  const validation = validateGroupAgainstComponents(saved, listBrowserComponentFiles(), listBrowserVariantFiles());
  if (validation.issues.some((issue) => issue.severity === "error")) {
    const details = validation.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.title)
      .join(", ");
    throw new Error(`Group has blocking validation issues: ${details}`);
  }

  return saved;
}

function listBrowserVariants(): VariantSummary[] {
  return listBrowserVariantFiles().map((variant) => ({
    id: variant.variant.id,
    name: variant.variant.name,
    description: variant.variant.description,
    component: variant.variant.component,
    state: variant.variant.state,
    slotCount: variant.slots.length,
  }));
}

function listBrowserVariantFiles(): VariantFile[] {
  if (!browserVariantFiles) {
    browserVariantFiles = readBrowserMetadata<VariantFile>("variants");
  }

  return browserVariantFiles.map(clone);
}

function loadBrowserVariant(variantId: string): VariantFile {
  const variant = listBrowserVariantFiles().find((item) => item.variant.id === variantId);
  if (!variant) throw new Error(`Variant ${variantId} was not found in browser metadata.`);
  return clone(variant);
}

function saveBrowserVariant(variant: VariantFile): VariantFile {
  const saved = normalizeVariantForSave(variant);
  const variants = listBrowserVariantFiles();
  if (variants.some((item) => item.variant.id === saved.variant.id)) {
    throw new Error(`A variant named ${saved.variant.name} already exists. Choose a different name before saving.`);
  }

  browserVariantFiles = [...variants, saved].sort((left, right) => left.variant.id.localeCompare(right.variant.id));
  return clone(saved);
}

function updateBrowserVariant(originalVariantId: string, variant: VariantFile): VariantFile {
  const saved = normalizeVariantForSave(variant);
  const variants = listBrowserVariantFiles();
  if (variants.some((item) => item.variant.id !== originalVariantId && item.variant.id === saved.variant.id)) {
    throw new Error(`A variant named ${saved.variant.name} already exists. Choose a different name before saving.`);
  }

  browserVariantFiles = variants
    .filter((item) => item.variant.id !== originalVariantId)
    .concat(saved)
    .sort((left, right) => left.variant.id.localeCompare(right.variant.id));
  return clone(saved);
}

function normalizeVariantForSave(variant: VariantFile): VariantFile {
  const saved = clone(variant);
  saved.variant.id = slugify(saved.variant.name);
  if (!saved.variant.id) {
    throw new Error("Variant name must contain at least one letter or number.");
  }

  const validation = validateVariantAgainstComponents(saved, listBrowserComponentFiles());
  if (validation.issues.some((issue) => issue.severity === "error")) {
    const details = validation.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.title)
      .join(", ");
    throw new Error(`Variant has blocking validation issues: ${details}`);
  }

  return saved;
}

function listBrowserPages(): PageSummary[] {
  return listBrowserPageFiles().map((page) => ({
    id: page.page.id,
    name: page.page.name,
    description: page.page.description,
    theme: page.page.theme,
    blockCount: page.regions.reduce((total, region) => total + region.blocks.length, 0),
  }));
}

function listBrowserPageFiles(): PageFile[] {
  if (!browserPageFiles) {
    browserPageFiles = readBrowserMetadata<PageFile>("pages");
  }

  return browserPageFiles.map(clone);
}

function loadBrowserPage(pageId: string): PageFile {
  const page = listBrowserPageFiles().find((item) => item.page.id === pageId);
  if (!page) throw new Error(`Page ${pageId} was not found in browser metadata.`);
  return clone(page);
}

function saveBrowserPage(page: PageFile): PageFile {
  const saved = normalizePageForSave(page);
  const pages = listBrowserPageFiles();
  if (pages.some((item) => item.page.id === saved.page.id)) {
    throw new Error(`A page named ${saved.page.name} already exists. Choose a different name before saving.`);
  }

  browserPageFiles = [...pages, saved].sort((left, right) => left.page.id.localeCompare(right.page.id));
  return clone(saved);
}

function updateBrowserPage(originalPageId: string, page: PageFile): PageFile {
  const saved = normalizePageForSave(page);
  const pages = listBrowserPageFiles();
  if (pages.some((item) => item.page.id !== originalPageId && item.page.id === saved.page.id)) {
    throw new Error(`A page named ${saved.page.name} already exists. Choose a different name before saving.`);
  }

  browserPageFiles = pages
    .filter((item) => item.page.id !== originalPageId)
    .concat(saved)
    .sort((left, right) => left.page.id.localeCompare(right.page.id));
  return clone(saved);
}

function normalizePageForSave(page: PageFile): PageFile {
  const saved = clone(page);
  saved.page.id = slugify(saved.page.name);
  if (!saved.page.id) {
    throw new Error("Page name must contain at least one letter or number.");
  }

  const validation = validatePageAgainstRecords(saved, listBrowserGroupFiles(), listBrowserVariantFiles());
  if (validation.issues.some((issue) => issue.severity === "error")) {
    const details = validation.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.title)
      .join(", ");
    throw new Error(`Page has blocking validation issues: ${details}`);
  }

  return saved;
}

function listBrowserThemes(): ThemeSummary[] {
  return listBrowserThemeFiles().map((theme) => theme.theme);
}

function listBrowserThemeFiles(): ThemeFile[] {
  return readBrowserMetadata<ThemeFile>("themes");
}

function loadBrowserTheme(themeId: string): ThemeFile {
  const theme = listBrowserThemeFiles().find((item) => item.theme.id === themeId);
  if (!theme) throw new Error(`Theme ${themeId} was not found in browser metadata.`);
  return clone(theme);
}

function browserEnvironmentStatus(): EnvironmentStatus {
  const recordCount =
    listBrowserComponents().length +
    listBrowserGroups().length +
    listBrowserVariants().length +
    listBrowserPages().length +
    listBrowserThemes().length +
    buildBrowserSourceIndexRecords().length;

  return {
    duckdbAvailable: false,
    ollamaAvailable: false,
    embeddingModel: "browser-preview",
    indexInitialized: true,
    indexedRecordCount: recordCount,
    message: "Browser preview is using bundled TOML metadata.",
  };
}

function searchBrowserIndex(query: string, recordType: string): CatalogResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  const records = buildBrowserIndexRecords().filter((record) => {
    const matchesType = recordType === "all" || record.recordType === recordType;
    const matchesQuery = !normalizedQuery || `${record.title} ${record.body}`.toLowerCase().includes(normalizedQuery);
    return matchesType && matchesQuery;
  });

  return records.slice(0, 50);
}

function buildBrowserIndexRecords(): CatalogResult[] {
  const components = listBrowserComponentFiles().map((component) => ({
    id: `component:${component.component.id}`,
    recordType: "component" as const,
    title: component.component.name,
    body: `${component.component.description} Props: ${component.props.map((prop) => `${prop.id}:${prop.kind}`).join(", ")}. States: ${component.states
      .map((state) => state.label)
      .join(", ")}. Themes: ${component.component.themes.join(", ")}.`,
  }));
  const themes = listBrowserThemeFiles().map((theme) => ({
    id: `theme:${theme.theme.id}`,
    recordType: "theme" as const,
    title: theme.theme.name,
    body: `${theme.theme.description} Primary ${theme.colors.primary} surface ${theme.colors.surface} text ${theme.colors.text} density ${theme.spacing.density}.`,
  }));
  const groups = listBrowserGroupFiles().map((group) => ({
    id: `group:${group.group.id}`,
    recordType: "group" as const,
    title: group.group.name,
    body: `${group.group.description} Layout: ${group.group.layout}. Items: ${group.items
      .map((item) => `${item.role} uses ${groupItemReference(item)}`)
      .join(", ")}. Themes: ${group.group.themes.join(", ")}.`,
  }));
  const variants = listBrowserVariantFiles().map((variant) => ({
    id: `variant:${variant.variant.id}`,
    recordType: "variant" as const,
    title: variant.variant.name,
    body: `${variant.variant.description} Base: ${variant.variant.component}:${variant.variant.state}. Slots: ${variant.slots
      .map((slot) => `${slot.name} ${slot.kind} ${slot.value}`)
      .join(", ")}. Themes: ${variant.variant.themes.join(", ")}.`,
  }));
  const pages = listBrowserPageFiles().map((page) => ({
    id: `page:${page.page.id}`,
    recordType: "page" as const,
    title: page.page.name,
    body: `${page.page.description} Route: ${page.page.route}. Theme: ${page.page.theme}. Blocks: ${page.regions
      .flatMap((region) => region.blocks.map((block) => `${region.label} uses ${block.kind}:${block.reference} as ${block.role}`))
      .join(", ")}.`,
  }));

  return [...components, ...themes, ...groups, ...variants, ...pages, ...buildBrowserSourceIndexRecords()].sort(
    (left, right) => left.recordType.localeCompare(right.recordType) || left.title.localeCompare(right.title),
  );
}

function listBrowserSources(): SourceSummary[] {
  return [browserLocalTomlCatalog(), browserShadcnCatalog()].map((catalog) => catalog.source);
}

function loadBrowserSourceCatalog(sourceId: string): SourceCatalog {
  const catalog = [browserLocalTomlCatalog(), browserShadcnCatalog()].find((item) => item.source.id === sourceId);
  if (!catalog) throw new Error(`Source ${sourceId} was not found in browser metadata.`);
  return clone(catalog);
}

function importBrowserSourceItem(request: SourceItemImportRequest): SourceItemImportResult {
  const catalog = loadBrowserSourceCatalog(request.sourceId);
  const item = catalog.items.find((candidate) => candidate.id === request.itemId);
  if (!item) throw new Error(`Item ${request.itemId} was not found in source ${request.sourceId}.`);
  if (catalog.source.adapter !== "shadcn") {
    throw new Error(`${catalog.source.adapter} items cannot be imported as components yet.`);
  }

  const component = importedBrowserComponentFromSourceItem(catalog.source, item);
  if (listBrowserComponentFiles().some((candidate) => candidate.component.id === component.component.id)) {
    throw new Error(`Component ${component.component.id} already exists.`);
  }

  browserImportedComponents = [...browserImportedComponents, component];
  return {
    componentId: component.component.id,
    path: `browser://metadata/components/${component.component.id}.toml`,
    materializedFiles: item.files.map((file) => `browser://imports/${catalog.source.adapter}/${catalog.source.id}/${file}`),
    status: "imported",
  };
}

function importedBrowserComponentFromSourceItem(source: SourceSummary, item: SourceCatalogItem): ComponentFile {
  const componentId = slugify(`${source.id} ${item.name}`);
  const files = item.files.length ? item.files.join(", ") : "none";
  const dependencies = item.dependencies.length ? item.dependencies.join(", ") : "none";
  const materializedFiles = item.files.length ? item.files.map((file) => `imports/${source.adapter}/${source.id}/${file}`).join(", ") : "none";
  const props = {
    label: item.name,
    source: source.name,
    adapter: source.adapter,
    itemType: item.itemType,
    files,
    materializedFiles,
    dependencies,
    previewStatus: "metadata-import",
  };

  return {
    component: {
      id: componentId,
      name: `${item.name} (${source.name})`,
      description: `${item.description} Imported from ${source.location} using the ${source.adapter} adapter. Source files: ${files}. Local files: ${materializedFiles}.`,
      themes: ["light", "dark", "aurora"],
    },
    framework: {
      react: true,
      svelte: false,
    },
    props: [
      { id: "label", label: "Label", kind: "text", default: item.name, values: [] },
      { id: "source", label: "Source", kind: "text", default: source.name, values: [] },
      { id: "adapter", label: "Adapter", kind: "text", default: source.adapter, values: [] },
      { id: "itemType", label: "Item Type", kind: "text", default: item.itemType, values: [] },
      { id: "files", label: "Files", kind: "text", default: files, values: [] },
      { id: "dependencies", label: "Dependencies", kind: "text", default: dependencies, values: [] },
      { id: "materializedFiles", label: "Materialized Files", kind: "text", default: materializedFiles, values: [] },
      { id: "previewStatus", label: "Preview Status", kind: "text", default: "metadata-import", values: [] },
    ],
    states: [
      {
        id: "imported",
        label: "Imported",
        props,
      },
    ],
  };
}

function buildBrowserSourceIndexRecords(): CatalogResult[] {
  return [browserLocalTomlCatalog(), browserShadcnCatalog()].flatMap((catalog) => [
    {
      id: `source:${catalog.source.id}`,
      recordType: "source" as const,
      title: catalog.source.name,
      body: `${catalog.source.description} Adapter: ${catalog.source.adapter}. Kind: ${catalog.source.kind}. Location: ${catalog.source.location}. Items: ${catalog.items.length}.`,
    },
    ...catalog.items.map((item) => ({
      id: `${catalog.source.adapter === "shadcn" ? "shadcn-component" : "source-item"}:${item.id}`,
      recordType: catalog.source.adapter === "shadcn" ? ("shadcn-component" as const) : ("source-item" as const),
      title: item.name,
      body: `${item.description} Source: ${catalog.source.name}. Type: ${item.itemType}. Files: ${item.files.join(", ")}. Dependencies: ${
        item.dependencies.length ? item.dependencies.join(", ") : "none"
      }. Preview: ${item.previewStatus}.`,
    })),
  ]);
}

function browserLocalTomlCatalog(): SourceCatalog {
  const items: SourceCatalogItem[] = [
    ...listBrowserComponentFiles().map((component) => ({
      id: `local-toml:component:${component.component.id}`,
      name: component.component.name,
      itemType: "component",
      description: component.component.description,
      files: [`metadata/components/${component.component.id}.toml`],
      dependencies: [],
      sourcePath: "metadata/components",
      previewStatus: "native",
    })),
    ...listBrowserGroupFiles().map((group) => ({
      id: `local-toml:group:${group.group.id}`,
      name: group.group.name,
      itemType: "group",
      description: group.group.description,
      files: [`metadata/groups/${group.group.id}.toml`],
      dependencies: [],
      sourcePath: "metadata/groups",
      previewStatus: "native",
    })),
    ...listBrowserVariantFiles().map((variant) => ({
      id: `local-toml:variant:${variant.variant.id}`,
      name: variant.variant.name,
      itemType: "variant",
      description: variant.variant.description,
      files: [`metadata/variants/${variant.variant.id}.toml`],
      dependencies: [],
      sourcePath: "metadata/variants",
      previewStatus: "native",
    })),
    ...listBrowserPageFiles().map((page) => ({
      id: `local-toml:page:${page.page.id}`,
      name: page.page.name,
      itemType: "page",
      description: page.page.description,
      files: [`metadata/pages/${page.page.id}.toml`],
      dependencies: [],
      sourcePath: "metadata/pages",
      previewStatus: "native",
    })),
    ...listBrowserThemeFiles().map((theme) => ({
      id: `local-toml:theme:${theme.theme.id}`,
      name: theme.theme.name,
      itemType: "theme",
      description: theme.theme.description,
      files: [`metadata/themes/${theme.theme.id}.toml`],
      dependencies: [],
      sourcePath: "metadata/themes",
      previewStatus: "native",
    })),
  ];

  return {
    source: {
      id: "local-toml",
      name: "Local TOML Metadata",
      description: "Built-in Theme Preview component, group, and theme metadata.",
      adapter: "local-toml",
      kind: "local-directory",
      location: "metadata",
      enabled: true,
      itemCount: items.length,
      status: "ready",
    },
    items,
    warnings: [],
  };
}

function browserShadcnCatalog(): SourceCatalog {
  const items: SourceCatalogItem[] = [
    {
      id: "shadcn-fixture:button",
      name: "Button",
      itemType: "registry:ui",
      description: "Action button fixture shaped like a shadcn registry item.",
      files: ["components/ui/button.tsx"],
      dependencies: ["@radix-ui/react-slot", "class-variance-authority"],
      sourcePath: "examples/shadcn-registry/registry.json",
      previewStatus: "indexed",
    },
    {
      id: "shadcn-fixture:card",
      name: "Card",
      itemType: "registry:ui",
      description: "Surface fixture for adapter catalog and preview planning.",
      files: ["components/ui/card.tsx"],
      dependencies: [],
      sourcePath: "examples/shadcn-registry/registry.json",
      previewStatus: "indexed",
    },
  ];

  return {
    source: {
      id: "shadcn-fixture",
      name: "shadcn Fixture Registry",
      description: "Local shadcn-style registry fixture used to exercise adapter indexing without network access.",
      adapter: "shadcn",
      kind: "local-directory",
      location: "examples/shadcn-registry",
      enabled: true,
      itemCount: items.length,
      status: "ready",
    },
    items,
    warnings: [],
  };
}

function validateGroupAgainstComponents(group: GroupFile, components: ComponentFile[], variants: VariantFile[] = []): GroupValidation {
  const issues: GroupValidationIssue[] = [];
  const componentMap = new Map(components.map((component) => [component.component.id, component]));
  const variantMap = new Map(variants.map((variant) => [variant.variant.id, variant]));
  const roles = new Set<string>();

  if (!groupLayouts.includes(group.group.layout)) {
    issues.push({
      severity: "error",
      title: "Unsupported layout",
      detail: `${group.group.layout} is not one of ${groupLayouts.join(", ")}.`,
    });
  }

  if (!group.items.length) {
    issues.push({
      severity: "error",
      title: "No group items",
      detail: "A group needs at least one component placement.",
    });
  }

  group.items.forEach((item) => {
    const kind = groupItemKind(item);
    if (!item.role.trim()) {
      issues.push({
        severity: "warning",
        title: "Missing role label",
        detail: `${groupItemReference(item)} does not describe what it does in the area.`,
      });
    } else if (roles.has(item.role.toLowerCase())) {
      issues.push({
        severity: "warning",
        title: "Duplicate role",
        detail: `${item.role} appears more than once in this group.`,
      });
    } else {
      roles.add(item.role.toLowerCase());
    }

    if (kind === "variant") {
      if (!item.variant?.trim()) {
        issues.push({
          severity: "error",
          title: "Missing variant reference",
          detail: "Variant-backed group items must name a saved variant.",
        });
      } else if (!variantMap.has(item.variant)) {
        issues.push({
          severity: "error",
          title: "Missing variant",
          detail: `${item.variant} is not defined in metadata/variants.`,
        });
      }
      return;
    }

    if (kind !== "component") {
      issues.push({
        severity: "error",
        title: "Unsupported item kind",
        detail: `${item.kind} is not component or variant.`,
      });
      return;
    }

    const component = componentMap.get(item.component);
    if (!component) {
      issues.push({
        severity: "error",
        title: "Missing component",
        detail: `${item.component} is not defined in metadata/components.`,
      });
      return;
    }

    if (!component.states.some((state) => state.id === item.state)) {
      issues.push({
        severity: "error",
        title: "Missing state",
        detail: `${item.component} does not define state ${item.state}.`,
      });
    }
  });

  return {
    status: issues.some((issue) => issue.severity === "error") ? "error" : issues.some((issue) => issue.severity === "warning") ? "warning" : "ready",
    issueCount: issues.length,
    issues,
  };
}

function validateVariantAgainstComponents(variant: VariantFile, components: ComponentFile[]): GroupValidation {
  const issues: GroupValidationIssue[] = [];
  const component = components.find((item) => item.component.id === variant.variant.component);

  if (!variant.variant.name.trim()) {
    issues.push({ severity: "error", title: "Missing variant name", detail: "A saved variant needs a reusable name." });
  }

  if (!component) {
    issues.push({
      severity: "error",
      title: "Missing base component",
      detail: `${variant.variant.component} is not defined in metadata/components.`,
    });
  } else if (!component.states.some((state) => state.id === variant.variant.state)) {
    issues.push({
      severity: "error",
      title: "Missing base state",
      detail: `${variant.variant.component} does not define state ${variant.variant.state}.`,
    });
  }

  variant.slots.forEach((slot) => {
    if (!slot.name.trim()) {
      issues.push({ severity: "warning", title: "Unnamed slot", detail: "Variant slots should name the content area they configure." });
    }
    if (!slot.kind.trim()) {
      issues.push({
        severity: "warning",
        title: "Missing slot kind",
        detail: `Slot ${slot.name || "unnamed"} does not declare text, media, badge, divider, action, or metadata.`,
      });
    }
  });

  return validationFromIssues(issues);
}

function validatePageAgainstRecords(page: PageFile, groups: GroupFile[], variants: VariantFile[]): GroupValidation {
  const issues: GroupValidationIssue[] = [];
  const groupIds = new Set(groups.map((group) => group.group.id));
  const variantIds = new Set(variants.map((variant) => variant.variant.id));

  if (!page.page.name.trim()) {
    issues.push({ severity: "error", title: "Missing page name", detail: "A page needs a name before it can be saved." });
  }

  if (!page.regions.length) {
    issues.push({ severity: "error", title: "No page regions", detail: "A page needs at least one semantic region." });
  }

  page.regions.forEach((region) => {
    if (!pageLayouts.includes(region.layout)) {
      issues.push({
        severity: "error",
        title: "Unsupported page layout",
        detail: `${region.layout} is not one of ${pageLayouts.join(", ")}.`,
      });
    }

    region.blocks.forEach((block) => {
      if (!block.role.trim()) {
        issues.push({
          severity: "warning",
          title: "Missing block role",
          detail: `${block.kind}:${block.reference} should describe its page role.`,
        });
      }

      if (block.kind === "group" && !groupIds.has(block.reference)) {
        issues.push({
          severity: "error",
          title: "Missing page group",
          detail: `${block.reference} is not defined in metadata/groups.`,
        });
      } else if (block.kind === "variant" && !variantIds.has(block.reference)) {
        issues.push({
          severity: "error",
          title: "Missing page variant",
          detail: `${block.reference} is not defined in metadata/variants.`,
        });
      } else if (block.kind !== "group" && block.kind !== "variant") {
        issues.push({
          severity: "error",
          title: "Unsupported page block",
          detail: `${block.kind} is not group or variant.`,
        });
      }
    });
  });

  return validationFromIssues(issues);
}

function validationFromIssues(issues: GroupValidationIssue[]): GroupValidation {
  return {
    status: issues.some((issue) => issue.severity === "error") ? "error" : issues.some((issue) => issue.severity === "warning") ? "warning" : "ready",
    issueCount: issues.length,
    issues,
  };
}

function readBrowserMetadata<T>(kind: "components" | "groups" | "themes" | "variants" | "pages"): T[] {
  return Object.entries(metadataModules)
    .filter(([path]) => path.includes(`/metadata/${kind}/`) || path.includes(`\\metadata\\${kind}\\`))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, content]) => parseToml(content) as T);
}

function parseToml(content: string): TomlObject {
  const root: TomlObject = {};
  let target: TomlObject = root;
  const arrayTargets = new Map<string, TomlObject>();

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const arrayMatch = trimmed.match(/^\[\[(.+)\]\]$/);
    if (arrayMatch) {
      const path = arrayMatch[1].split(".").map(camelCase);
      const key = path[path.length - 1];
      const parent = resolveTomlParent(root, path.slice(0, -1), arrayTargets);
      const items = (parent[key] as TomlObject[] | undefined) ?? [];
      target = {};
      items.push(target);
      parent[key] = items;
      arrayTargets.set(path.join("."), target);
      return;
    }

    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      const path = sectionMatch[1].split(".").map(camelCase);
      const key = path[path.length - 1];
      const parent = resolveTomlParent(root, path.slice(0, -1), arrayTargets);
      target = {};
      parent[key] = target;
      return;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) return;

    const key = camelCase(trimmed.slice(0, separator).trim());
    target[key] = parseTomlValue(trimmed.slice(separator + 1).trim());
  });

  return root;
}

function resolveTomlParent(root: TomlObject, path: string[], arrayTargets: Map<string, TomlObject>): TomlObject {
  let target = root;
  const seen: string[] = [];

  path.forEach((part) => {
    seen.push(part);
    const arrayTarget = arrayTargets.get(seen.join("."));
    if (arrayTarget) {
      target = arrayTarget;
      return;
    }

    const existing = target[part];
    if (Array.isArray(existing)) {
      target = (existing[existing.length - 1] as TomlObject | undefined) ?? target;
    } else {
      if (!existing || typeof existing !== "object") {
        target[part] = {};
      }
      target = target[part] as TomlObject;
    }
  });

  return target;
}

function parseTomlValue(value: string): TomlValue {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => String(parseTomlValue(item.trim())));
  }

  if (value.startsWith("{") && value.endsWith("}")) {
    const output: Record<string, string> = {};
    splitTomlInline(value.slice(1, -1)).forEach((entry) => {
      const separator = entry.indexOf("=");
      if (separator === -1) return;
      output[camelCase(entry.slice(0, separator).trim())] = String(parseTomlValue(entry.slice(separator + 1).trim()));
    });
    return output;
  }

  if (value === "true") return true;
  if (value === "false") return false;

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? value : numberValue;
}

function splitTomlInline(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inString = false;

  for (const character of value) {
    if (character === '"') inString = !inString;
    if (character === "," && !inString) {
      parts.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function camelCase(value: string) {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function groupItemKind(item: GroupItem): "component" | "variant" | string {
  return item.kind || "component";
}

function groupItemReference(item: GroupItem) {
  return groupItemKind(item) === "variant" ? `variant:${item.variant ?? ""}` : `${item.component}:${item.state}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function App() {
  const [components, setComponents] = useState<ComponentSummary[]>([]);
  const [componentFiles, setComponentFiles] = useState<Record<string, ComponentFile>>({});
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupFiles, setGroupFiles] = useState<Record<string, GroupFile>>({});
  const [variants, setVariants] = useState<VariantSummary[]>([]);
  const [variantFiles, setVariantFiles] = useState<Record<string, VariantFile>>({});
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [, setPageFiles] = useState<Record<string, PageFile>>({});
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [activeLibrary, setActiveLibrary] = useState<LibraryMode>("components");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState("button");
  const [selectedGroupId, setSelectedGroupId] = useState("settings-row");
  const [selectedVariantId, setSelectedVariantId] = useState("project-feature-card");
  const [selectedPageId, setSelectedPageId] = useState("workbench-home");
  const [selectedSourceId, setSelectedSourceId] = useState("local-toml");
  const [selectedThemeId, setSelectedThemeId] = useState("blue-slate");
  const [component, setComponent] = useState<ComponentFile | null>(null);
  const [group, setGroup] = useState<GroupFile | null>(null);
  const [variant, setVariant] = useState<VariantFile | null>(null);
  const [pageRecord, setPageRecord] = useState<PageFile | null>(null);
  const [sourceCatalog, setSourceCatalog] = useState<SourceCatalog | null>(null);
  const [theme, setTheme] = useState<ThemeFile | null>(null);
  const [themeFiles, setThemeFiles] = useState<ThemeFile[]>([]);
  const [propValues, setPropValues] = useState<Record<string, string>>({});
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [status, setStatus] = useState<EnvironmentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComparingThemes, setIsComparingThemes] = useState(false);
  const [isGroupBoardOpen, setIsGroupBoardOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showDuplicateGroupsOnly, setShowDuplicateGroupsOnly] = useState(() => readDuplicateBoardFilter());
  const [highlightedBoardGroupId, setHighlightedBoardGroupId] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogType, setCatalogType] = useState("all");
  const [catalogResults, setCatalogResults] = useState<CatalogResult[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [sourceActionMessage, setSourceActionMessage] = useState<string | null>(null);
  const [importingSourceItemId, setImportingSourceItemId] = useState<string | null>(null);
  const [screenshotReport, setScreenshotReport] = useState<ScreenshotReportSummary | null>(null);
  const [screenshotReports, setScreenshotReports] = useState<ScreenshotReportSummary[]>([]);
  const [screenshotReportError, setScreenshotReportError] = useState<string | null>(null);
  const [isGroupComposerOpen, setIsGroupComposerOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupFile>(() => emptyGroupDraft());
  const [isVariantComposerOpen, setIsVariantComposerOpen] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantDraft, setVariantDraft] = useState<VariantFile>(() => emptyVariantDraft());
  const [variantValidation, setVariantValidation] = useState<GroupValidation | null>(null);
  const [draftVariantValidation, setDraftVariantValidation] = useState<GroupValidation | null>(null);
  const [isPageComposerOpen, setIsPageComposerOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageDraft, setPageDraft] = useState<PageFile>(() => emptyPageDraft());
  const [pageValidation, setPageValidation] = useState<GroupValidation | null>(null);
  const [draftPageValidation, setDraftPageValidation] = useState<GroupValidation | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [groupValidation, setGroupValidation] = useState<GroupValidation | null>(null);
  const [draftValidation, setDraftValidation] = useState<GroupValidation | null>(null);
  const [hasReviewedDraftWarnings, setHasReviewedDraftWarnings] = useState(false);

  useEffect(() => {
    async function boot() {
      try {
        const [componentList, groupList, variantList, pageList, themeList, sourceList, environment, latestReport, recentReports] = await Promise.all([
          invoke<ComponentSummary[]>("list_components"),
          invoke<GroupSummary[]>("list_groups"),
          invoke<VariantSummary[]>("list_variants"),
          invoke<PageSummary[]>("list_pages"),
          invoke<ThemeSummary[]>("list_themes"),
          invoke<SourceSummary[]>("list_sources"),
          invoke<EnvironmentStatus>("initialize_local_index"),
          invoke<ScreenshotReportSummary | null>("latest_screenshot_report"),
          invoke<ScreenshotReportSummary[]>("recent_screenshot_reports", { limit: 5 }),
        ]);

        setComponents(componentList);
        setGroups(groupList);
        setVariants(variantList);
        setPages(pageList);
        setSources(sourceList);
        setThemes(themeList);
        setStatus(environment);
        setScreenshotReport(latestReport);
        setScreenshotReports(recentReports);
        setSelectedComponentId(componentList[0]?.id ?? "button");
        setSelectedGroupId(groupList[0]?.id ?? "settings-row");
        setSelectedVariantId(variantList[0]?.id ?? "project-feature-card");
        setSelectedPageId(pageList[0]?.id ?? "workbench-home");
        setSelectedSourceId(sourceList[0]?.id ?? "local-toml");
        setSelectedThemeId(themeList.find((item) => item.id === "blue-slate")?.id ?? themeList[0]?.id ?? "light");
      } catch (caught) {
        setError(String(caught));
      } finally {
        setIsLoading(false);
      }
    }

    boot();
  }, []);

  async function refreshGroups() {
    const groupList = await invoke<GroupSummary[]>("list_groups");
    const loaded = await Promise.all(groupList.map((item) => invoke<GroupFile>("load_group", { groupId: item.id })));
    setGroups(groupList);
    setGroupFiles(Object.fromEntries(loaded.map((item) => [item.group.id, item])));
    return { groupList, loaded };
  }

  async function refreshVariants() {
    const variantList = await invoke<VariantSummary[]>("list_variants");
    const loaded = await Promise.all(variantList.map((item) => invoke<VariantFile>("load_variant", { variantId: item.id })));
    setVariants(variantList);
    setVariantFiles(Object.fromEntries(loaded.map((item) => [item.variant.id, item])));
    return { variantList, loaded };
  }

  async function refreshPages() {
    const pageList = await invoke<PageSummary[]>("list_pages");
    const loaded = await Promise.all(pageList.map((item) => invoke<PageFile>("load_page", { pageId: item.id })));
    setPages(pageList);
    setPageFiles(Object.fromEntries(loaded.map((item) => [item.page.id, item])));
    return { pageList, loaded };
  }

  useEffect(() => {
    if (!themes.length) return;

    Promise.all(themes.map((item) => invoke<ThemeFile>("load_theme", { themeId: item.id })))
      .then((loaded) => {
        setThemeFiles(loaded);
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [themes]);

  useEffect(() => {
    window.localStorage.setItem(duplicateBoardFilterStorageKey(), String(showDuplicateGroupsOnly));
  }, [showDuplicateGroupsOnly]);

  useEffect(() => {
    if (!highlightedBoardGroupId) return;

    const timeout = window.setTimeout(() => setHighlightedBoardGroupId(null), 1400);
    return () => window.clearTimeout(timeout);
  }, [highlightedBoardGroupId]);

  useEffect(() => {
    if (!selectedComponentId) return;

    invoke<ComponentFile>("load_component", { componentId: selectedComponentId })
      .then((loaded) => {
        setComponent(loaded);
        setSelectedStateId(loaded.states[0]?.id ?? null);
        setPropValues(defaultProps(loaded));
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [selectedComponentId]);

  useEffect(() => {
    if (!components.length) return;

    Promise.all(components.map((item) => invoke<ComponentFile>("load_component", { componentId: item.id })))
      .then((loaded) => {
        setComponentFiles(Object.fromEntries(loaded.map((item) => [item.component.id, item])));
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [components]);

  useEffect(() => {
    if (!groups.length) return;

    Promise.all(groups.map((item) => invoke<GroupFile>("load_group", { groupId: item.id })))
      .then((loaded) => {
        setGroupFiles(Object.fromEntries(loaded.map((item) => [item.group.id, item])));
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [groups]);

  useEffect(() => {
    if (!variants.length) return;

    Promise.all(variants.map((item) => invoke<VariantFile>("load_variant", { variantId: item.id })))
      .then((loaded) => {
        setVariantFiles(Object.fromEntries(loaded.map((item) => [item.variant.id, item])));
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [variants]);

  useEffect(() => {
    if (!pages.length) return;

    Promise.all(pages.map((item) => invoke<PageFile>("load_page", { pageId: item.id })))
      .then((loaded) => {
        setPageFiles(Object.fromEntries(loaded.map((item) => [item.page.id, item])));
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [pages]);

  useEffect(() => {
    if (!selectedGroupId) return;

    invoke<GroupFile>("load_group", { groupId: selectedGroupId })
      .then((loaded) => {
        setGroup(loaded);
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [selectedGroupId]);

  useEffect(() => {
    if (!selectedVariantId) return;

    invoke<VariantFile>("load_variant", { variantId: selectedVariantId })
      .then((loaded) => {
        setVariant(loaded);
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [selectedVariantId]);

  useEffect(() => {
    if (!selectedPageId) return;

    invoke<PageFile>("load_page", { pageId: selectedPageId })
      .then((loaded) => {
        setPageRecord(loaded);
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [selectedPageId]);

  useEffect(() => {
    if (!selectedSourceId) return;

    invoke<SourceCatalog>("load_source_catalog", { sourceId: selectedSourceId })
      .then((loaded) => {
        setSourceCatalog(loaded);
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [selectedSourceId]);

  useEffect(() => {
    if (!group) return;

    invoke<GroupValidation>("validate_group", { group })
      .then((validation) => {
        setGroupValidation(validation);
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [group]);

  useEffect(() => {
    if (!variant) return;

    invoke<GroupValidation>("validate_variant", { variant })
      .then((validation) => {
        setVariantValidation(validation);
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [variant]);

  useEffect(() => {
    if (!pageRecord) return;

    invoke<GroupValidation>("validate_page", { page: pageRecord })
      .then((validation) => {
        setPageValidation(validation);
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [pageRecord]);

  useEffect(() => {
    if (!isGroupComposerOpen) return;

    const timeout = window.setTimeout(() => {
      invoke<GroupValidation>("validate_group", { group: groupDraft })
        .then((validation) => setDraftValidation(addDraftNameConflict(validation, groupDraft, groups, editingGroupId)))
        .catch(() =>
          setDraftValidation({
            status: "error",
            issueCount: 1,
            issues: [
              {
                severity: "error",
                title: "Validation unavailable",
                detail: "The draft could not be checked against current metadata.",
              },
            ],
          }),
        );
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [editingGroupId, groupDraft, groups, isGroupComposerOpen]);

  useEffect(() => {
    if (!isVariantComposerOpen) return;

    const timeout = window.setTimeout(() => {
      invoke<GroupValidation>("validate_variant", { variant: variantDraft })
        .then((validation) => setDraftVariantValidation(addVariantDraftNameConflict(validation, variantDraft, variants, editingVariantId)))
        .catch(() =>
          setDraftVariantValidation({
            status: "error",
            issueCount: 1,
            issues: [
              {
                severity: "error",
                title: "Validation unavailable",
                detail: "The draft could not be checked against current metadata.",
              },
            ],
          }),
        );
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [editingVariantId, isVariantComposerOpen, variantDraft, variants]);

  useEffect(() => {
    if (!isPageComposerOpen) return;

    const timeout = window.setTimeout(() => {
      invoke<GroupValidation>("validate_page", { page: pageDraft })
        .then((validation) => setDraftPageValidation(addPageDraftNameConflict(validation, pageDraft, pages, editingPageId)))
        .catch(() =>
          setDraftPageValidation({
            status: "error",
            issueCount: 1,
            issues: [
              {
                severity: "error",
                title: "Validation unavailable",
                detail: "The draft could not be checked against current metadata.",
              },
            ],
          }),
        );
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [editingPageId, isPageComposerOpen, pageDraft, pages]);

  useEffect(() => {
    setHasReviewedDraftWarnings(false);
    setSaveMessage(null);
  }, [groupDraft, pageDraft, variantDraft]);

  useEffect(() => {
    if (!selectedThemeId) return;

    invoke<ThemeFile>("load_theme", { themeId: selectedThemeId })
      .then((loaded) => {
        setTheme(loaded);
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [selectedThemeId]);

  useEffect(() => {
    if (!component || !theme) return;

    invoke("save_preview_selection", {
      selection: {
        componentId: component.component.id,
        themeId: theme.theme.id,
        props: propValues,
      },
    }).catch(() => undefined);
  }, [component, theme, propValues]);

  useEffect(() => {
    if (!isCatalogOpen || !status?.indexInitialized) return;

    const timeout = window.setTimeout(() => {
      invoke<CatalogResult[]>("search_index", {
        query: catalogQuery,
        recordType: catalogType,
      })
        .then((results) => {
          setCatalogResults(results);
          setCatalogError(null);
        })
        .catch((caught) => {
          setCatalogResults([]);
          setCatalogError(String(caught));
        });
    }, 140);

    return () => window.clearTimeout(timeout);
  }, [catalogQuery, catalogType, isCatalogOpen, status?.indexInitialized]);

  const themeVars = useMemo(() => (theme ? themeStyle(theme) : {}), [theme]);
  const filteredComponents = useMemo(
    () => filterLibraryItems(components, libraryQuery, (item) => `${item.name} ${item.description}`),
    [components, libraryQuery],
  );
  const filteredGroups = useMemo(
    () => filterLibraryItems(groups, libraryQuery, (item) => `${item.name} ${item.description} ${item.layout}`),
    [groups, libraryQuery],
  );
  const filteredVariants = useMemo(
    () => filterLibraryItems(variants, libraryQuery, (item) => `${item.name} ${item.description} ${item.component} ${item.state}`),
    [variants, libraryQuery],
  );
  const filteredPages = useMemo(
    () => filterLibraryItems(pages, libraryQuery, (item) => `${item.name} ${item.description} ${item.theme}`),
    [pages, libraryQuery],
  );
  const filteredSources = useMemo(
    () => filterLibraryItems(sources, libraryQuery, (item) => `${item.name} ${item.description} ${item.adapter} ${item.location}`),
    [sources, libraryQuery],
  );
  const visualChecks = useMemo(
    () =>
      buildVisualChecks({
        component: activeLibrary === "components" ? component : null,
        group: activeLibrary === "groups" && !isGroupBoardOpen ? group : null,
        groupValidation,
        variant: activeLibrary === "variants" ? variant : null,
        variantValidation,
        page: activeLibrary === "pages" ? pageRecord : null,
        pageValidation,
        props: propValues,
        theme,
      }),
    [activeLibrary, component, group, groupValidation, isGroupBoardOpen, pageRecord, pageValidation, propValues, theme, variant, variantValidation],
  );
  const duplicateGroups = useMemo(() => findDuplicateGroups(groupFiles), [groupFiles]);

  function applyState(state: ComponentState) {
    setSelectedStateId(state.id);
    setPropValues({ ...defaultProps(component), ...state.props });
  }

  function updateProp(id: string, value: string) {
    setSelectedStateId(null);
    setPropValues((current) => ({ ...current, [id]: value }));
  }

  function openCatalogResult(result: CatalogResult) {
    const [kind, ...idParts] = result.id.split(":");
    const id = idParts.join(":");

    if (result.recordType === "component") {
      setActiveLibrary("components");
      setSelectedComponentId(id);
      setIsGroupBoardOpen(false);
      setIsReportOpen(false);
    }

    if (result.recordType === "group") {
      setActiveLibrary("groups");
      setSelectedGroupId(id);
      setIsGroupBoardOpen(false);
      setIsReportOpen(false);
    }

    if (result.recordType === "variant") {
      setActiveLibrary("variants");
      setSelectedVariantId(id);
      setIsGroupBoardOpen(false);
      setIsReportOpen(false);
    }

    if (result.recordType === "page") {
      setActiveLibrary("pages");
      setSelectedPageId(id);
      setIsGroupBoardOpen(false);
      setIsReportOpen(false);
    }

    if (result.recordType === "theme") {
      setSelectedThemeId(id);
    }

    if (result.recordType === "source") {
      setActiveLibrary("sources");
      setSelectedSourceId(id);
      setIsGroupBoardOpen(false);
      setIsReportOpen(false);
    }

    if (result.recordType === "shadcn-component" || result.recordType === "source-item") {
      setActiveLibrary("sources");
      setSelectedSourceId(id.split(":")[0] || kind);
      setIsGroupBoardOpen(false);
      setIsReportOpen(false);
    }
  }

  function jumpToBoardGroup(groupId: string) {
    setHighlightedBoardGroupId(groupId);
    window.requestAnimationFrame(() => {
      document.getElementById(boardGroupCardDomId(groupId))?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    });
  }

  function startGroupComposer(mode: "new" | "copy" | "edit" = "new") {
    if ((mode === "copy" || mode === "edit") && group) {
      setGroupDraft({
        group: {
          ...group.group,
          name: mode === "copy" ? `${group.group.name} Copy` : group.group.name,
          id: mode === "edit" ? group.group.id : "",
        },
        items: group.items.map((item) => ({ ...item })),
      });
      setEditingGroupId(mode === "edit" ? group.group.id : null);
    } else {
      setGroupDraft(emptyGroupDraft());
      setEditingGroupId(null);
    }

    setActiveLibrary("groups");
    setIsGroupBoardOpen(false);
    setIsCatalogOpen(false);
    setIsReportOpen(false);
    setIsGroupComposerOpen(true);
    setIsVariantComposerOpen(false);
    setIsPageComposerOpen(false);
    setSaveMessage(null);
  }

  function startVariantComposer(mode: "new" | "copy" | "edit" = "new") {
    if ((mode === "copy" || mode === "edit") && variant) {
      setVariantDraft({
        ...clone(variant),
        variant: {
          ...variant.variant,
          name: mode === "copy" ? `${variant.variant.name} Copy` : variant.variant.name,
          id: mode === "edit" ? variant.variant.id : "",
        },
      });
      setEditingVariantId(mode === "edit" ? variant.variant.id : null);
    } else {
      const draft = emptyVariantDraft();
      const baseComponent = component ?? componentFiles[draft.variant.component];
      if (baseComponent) {
        draft.variant.component = baseComponent.component.id;
        draft.variant.state = baseComponent.states[0]?.id ?? "";
        draft.source.path = `metadata/components/${baseComponent.component.id}.toml`;
        draft.props = { ...defaultProps(baseComponent), ...(baseComponent.states[0]?.props ?? {}) };
      }
      setVariantDraft(draft);
      setEditingVariantId(null);
    }

    setActiveLibrary("variants");
    setIsGroupBoardOpen(false);
    setIsCatalogOpen(false);
    setIsReportOpen(false);
    setIsGroupComposerOpen(false);
    setIsPageComposerOpen(false);
    setIsVariantComposerOpen(true);
    setSaveMessage(null);
  }

  function startPageComposer(mode: "new" | "copy" | "edit" = "new") {
    if ((mode === "copy" || mode === "edit") && pageRecord) {
      setPageDraft({
        ...clone(pageRecord),
        page: {
          ...pageRecord.page,
          name: mode === "copy" ? `${pageRecord.page.name} Copy` : pageRecord.page.name,
          id: mode === "edit" ? pageRecord.page.id : "",
        },
      });
      setEditingPageId(mode === "edit" ? pageRecord.page.id : null);
    } else {
      setPageDraft(emptyPageDraft());
      setEditingPageId(null);
    }

    setActiveLibrary("pages");
    setIsGroupBoardOpen(false);
    setIsCatalogOpen(false);
    setIsReportOpen(false);
    setIsGroupComposerOpen(false);
    setIsVariantComposerOpen(false);
    setIsPageComposerOpen(true);
    setSaveMessage(null);
  }

  async function toggleReportPanel() {
    const nextIsOpen = !isReportOpen;
    setIsReportOpen(nextIsOpen);
    if (!nextIsOpen) return;

    setIsCatalogOpen(false);
    setIsGroupComposerOpen(false);
    setIsVariantComposerOpen(false);
    setIsPageComposerOpen(false);

    try {
      const [latestReport, recentReports] = await Promise.all([
        invoke<ScreenshotReportSummary | null>("latest_screenshot_report"),
        invoke<ScreenshotReportSummary[]>("recent_screenshot_reports", { limit: 5 }),
      ]);
      setScreenshotReport(latestReport);
      setScreenshotReports(recentReports);
      setScreenshotReportError(null);
    } catch (caught) {
      setScreenshotReport(null);
      setScreenshotReports([]);
      setScreenshotReportError(String(caught));
    }
  }

  async function saveGroupDraft() {
    if (draftValidation?.status === "error") {
      setSaveMessage("Resolve blocking issues before saving this group.");
      return;
    }

    if (draftValidation?.status === "warning" && !hasReviewedDraftWarnings) {
      setHasReviewedDraftWarnings(true);
      setSaveMessage("Warnings reviewed. Save again to keep them and continue.");
      return;
    }

    try {
      const saved = editingGroupId
        ? await invoke<GroupFile>("update_group", { originalGroupId: editingGroupId, group: groupDraft })
        : await invoke<GroupFile>("save_group", { group: groupDraft });
      await refreshGroups();
      setSelectedGroupId(saved.group.id);
      setGroup(saved);
      setIsGroupComposerOpen(false);
      setEditingGroupId(null);
      setSaveMessage(`Saved ${saved.group.name}`);
      const environment = await invoke<EnvironmentStatus>("initialize_local_index");
      setStatus(environment);
    } catch (caught) {
      setSaveMessage(String(caught));
    }
  }

  async function saveVariantDraft() {
    if (draftVariantValidation?.status === "error") {
      setSaveMessage("Resolve blocking issues before saving this variant.");
      return;
    }

    if (draftVariantValidation?.status === "warning" && !hasReviewedDraftWarnings) {
      setHasReviewedDraftWarnings(true);
      setSaveMessage("Warnings reviewed. Save again to keep them and continue.");
      return;
    }

    try {
      const saved = editingVariantId
        ? await invoke<VariantFile>("update_variant", { originalVariantId: editingVariantId, variant: variantDraft })
        : await invoke<VariantFile>("save_variant", { variant: variantDraft });
      await refreshVariants();
      setSelectedVariantId(saved.variant.id);
      setVariant(saved);
      setIsVariantComposerOpen(false);
      setEditingVariantId(null);
      setSaveMessage(`Saved ${saved.variant.name}`);
      const environment = await invoke<EnvironmentStatus>("initialize_local_index");
      setStatus(environment);
    } catch (caught) {
      setSaveMessage(String(caught));
    }
  }

  async function savePageDraft() {
    if (draftPageValidation?.status === "error") {
      setSaveMessage("Resolve blocking issues before saving this page.");
      return;
    }

    if (draftPageValidation?.status === "warning" && !hasReviewedDraftWarnings) {
      setHasReviewedDraftWarnings(true);
      setSaveMessage("Warnings reviewed. Save again to keep them and continue.");
      return;
    }

    try {
      const saved = editingPageId
        ? await invoke<PageFile>("update_page", { originalPageId: editingPageId, page: pageDraft })
        : await invoke<PageFile>("save_page", { page: pageDraft });
      await refreshPages();
      setSelectedPageId(saved.page.id);
      setPageRecord(saved);
      setIsPageComposerOpen(false);
      setEditingPageId(null);
      setSaveMessage(`Saved ${saved.page.name}`);
      const environment = await invoke<EnvironmentStatus>("initialize_local_index");
      setStatus(environment);
    } catch (caught) {
      setSaveMessage(String(caught));
    }
  }

  async function importSourceItem(item: SourceCatalogItem) {
    if (!sourceCatalog) return;

    setImportingSourceItemId(item.id);
    setSourceActionMessage(null);
    try {
      const result = await invoke<SourceItemImportResult>("import_source_item_as_component", {
        request: {
          sourceId: sourceCatalog.source.id,
          itemId: item.id,
        },
      });
      const [componentList, loadedCatalog, environment] = await Promise.all([
        invoke<ComponentSummary[]>("list_components"),
        invoke<SourceCatalog>("load_source_catalog", { sourceId: sourceCatalog.source.id }),
        invoke<EnvironmentStatus>("initialize_local_index"),
      ]);
      setComponents(componentList);
      setSourceCatalog(loadedCatalog);
      setStatus(environment);
      setSelectedComponentId(result.componentId);
      setActiveLibrary("components");
      setIsCatalogOpen(false);
      setIsReportOpen(false);
      setSourceActionMessage(`Imported ${item.name} to ${result.path}; materialized ${result.materializedFiles.length} source file(s).`);
    } catch (caught) {
      setSourceActionMessage(String(caught));
    } finally {
      setImportingSourceItemId(null);
    }
  }

  const activeTitle =
    isVariantComposerOpen
      ? editingVariantId
        ? "Edit Variant"
        : "New Variant"
      : isPageComposerOpen
      ? editingPageId
        ? "Edit Page"
        : "New Page"
      : isGroupComposerOpen
      ? editingGroupId
        ? "Edit Group"
        : "New Group"
      : activeLibrary === "groups" && isGroupBoardOpen
      ? "Group Board"
      : activeLibrary === "groups"
      ? group?.group.name ?? "Loading"
      : activeLibrary === "variants"
      ? variant?.variant.name ?? "Loading"
      : activeLibrary === "pages"
      ? pageRecord?.page.name ?? "Loading"
      : activeLibrary === "sources"
      ? sourceCatalog?.source.name ?? "Loading"
      : component?.component.name ?? "Loading";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Aptlantis Component Lab</p>
          <h1>Theme Preview</h1>
        </div>
        <div className="toolbar" aria-label="Theme and index status">
          {themes.map((item) => (
            <button
              className={`icon-button theme-dot ${item.id === selectedThemeId ? "active" : ""}`}
              key={item.id}
              onClick={() => setSelectedThemeId(item.id)}
              title={item.name}
              type="button"
            >
              {item.id === "dark" ? <Moon size={18} /> : item.id === "light" ? <Sun size={18} /> : <Palette size={18} />}
            </button>
          ))}
          <button
            className={`icon-button ${isComparingThemes ? "active" : ""}`}
            onClick={() => setIsComparingThemes((current) => !current)}
            title="Compare themes"
            type="button"
          >
            <Columns3 size={18} />
          </button>
          <button
            className={`icon-button ${activeLibrary === "groups" && isGroupBoardOpen ? "active" : ""}`}
            onClick={() => {
              setActiveLibrary("groups");
              setIsGroupBoardOpen((current) => !current);
              setIsComparingThemes(false);
              setIsReportOpen(false);
              setIsGroupComposerOpen(false);
              setIsVariantComposerOpen(false);
              setIsPageComposerOpen(false);
            }}
            title="Group board"
            type="button"
          >
            <LayoutDashboard size={18} />
          </button>
          <button
            className={`icon-button ${isCatalogOpen ? "active" : ""}`}
            onClick={() => {
              setIsCatalogOpen((current) => !current);
              setIsReportOpen(false);
              setIsGroupComposerOpen(false);
              setIsVariantComposerOpen(false);
              setIsPageComposerOpen(false);
            }}
            title="Catalog search"
            type="button"
          >
            <Search size={18} />
          </button>
          <button className={`icon-button ${isReportOpen ? "active" : ""}`} onClick={toggleReportPanel} title="Screenshot report" type="button">
            <FileCode2 size={18} />
          </button>
          <button
            className={`icon-button ${isGroupComposerOpen || isVariantComposerOpen || isPageComposerOpen ? "active" : ""}`}
            onClick={() => {
              if (activeLibrary === "variants" || activeLibrary === "components") {
                startVariantComposer();
              } else if (activeLibrary === "pages") {
                startPageComposer();
              } else {
                startGroupComposer();
              }
            }}
            title={activeLibrary === "pages" ? "New page" : activeLibrary === "variants" || activeLibrary === "components" ? "New variant" : "New group"}
            type="button"
          >
            <Plus size={18} />
          </button>
          <StatusPill status={status} />
        </div>
      </header>

      {error && (
        <section className="error-banner" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </section>
      )}

      <section className="workspace">
        <aside className="sidebar" aria-label="Components">
          <div className="panel-heading">
            {activeLibrary === "components" ? <Search size={17} /> : activeLibrary === "groups" || activeLibrary === "variants" || activeLibrary === "pages" ? <GalleryHorizontalEnd size={17} /> : <Database size={17} />}
            <span>{libraryLabel(activeLibrary)}</span>
          </div>
          <div className="library-tabs" aria-label="Library mode">
            <button
              className={activeLibrary === "components" ? "active" : ""}
              onClick={() => {
                setActiveLibrary("components");
                setIsGroupBoardOpen(false);
              }}
              type="button"
            >
              Components
            </button>
            <button className={activeLibrary === "variants" ? "active" : ""} onClick={() => {
              setActiveLibrary("variants");
              setIsGroupBoardOpen(false);
            }} type="button">
              Variants
            </button>
            <button className={activeLibrary === "groups" ? "active" : ""} onClick={() => setActiveLibrary("groups")} type="button">
              Groups
            </button>
            <button className={activeLibrary === "pages" ? "active" : ""} onClick={() => {
              setActiveLibrary("pages");
              setIsGroupBoardOpen(false);
            }} type="button">
              Pages
            </button>
            <button className={activeLibrary === "sources" ? "active" : ""} onClick={() => setActiveLibrary("sources")} type="button">
              Sources
            </button>
          </div>
          <label className="library-filter">
            <Search size={16} />
            <input
              aria-label={`Filter ${activeLibrary}`}
              onChange={(event) => setLibraryQuery(event.currentTarget.value)}
              placeholder={`Filter ${activeLibrary}`}
              type="search"
              value={libraryQuery}
            />
          </label>
          <div className="component-list">
            {activeLibrary === "components" ? (
              filteredComponents.map((item) => (
                  <button
                    className={`component-row ${item.id === selectedComponentId ? "selected" : ""}`}
                    key={item.id}
                    onClick={() => {
                      setSelectedComponentId(item.id);
                      setIsReportOpen(false);
                    }}
                    type="button"
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </span>
                    <em>{item.stateCount}</em>
                  </button>
                ))
            ) : activeLibrary === "variants" ? (
              filteredVariants.map((item) => (
                <button
                  className={`component-row ${item.id === selectedVariantId ? "selected" : ""}`}
                  key={item.id}
                  onClick={() => {
                    setSelectedVariantId(item.id);
                    setIsGroupBoardOpen(false);
                    setIsReportOpen(false);
                  }}
                  type="button"
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                  <em>{item.slotCount}</em>
                </button>
              ))
            ) : activeLibrary === "groups" ? (
              filteredGroups.map((item) => (
                  <button
                    className={`component-row ${item.id === selectedGroupId && !isGroupBoardOpen ? "selected" : ""}`}
                    key={item.id}
                    onClick={() => {
                      setSelectedGroupId(item.id);
                      setIsGroupBoardOpen(false);
                      setIsReportOpen(false);
                    }}
                    type="button"
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </span>
                    <em>{item.itemCount}</em>
                  </button>
                ))
            ) : activeLibrary === "pages" ? (
              filteredPages.map((item) => (
                <button
                  className={`component-row ${item.id === selectedPageId ? "selected" : ""}`}
                  key={item.id}
                  onClick={() => {
                    setSelectedPageId(item.id);
                    setIsGroupBoardOpen(false);
                    setIsReportOpen(false);
                  }}
                  type="button"
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                  <em>{item.blockCount}</em>
                </button>
              ))
            ) : (
              filteredSources.map((item) => (
                <button
                  className={`component-row ${item.id === selectedSourceId ? "selected" : ""}`}
                  key={item.id}
                  onClick={() => {
                    setSelectedSourceId(item.id);
                    setIsGroupBoardOpen(false);
                    setIsReportOpen(false);
                  }}
                  type="button"
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.adapter} · {item.location}</small>
                  </span>
                  <em>{item.itemCount}</em>
                </button>
              ))
            )}
            {!isLoading && activeLibrary === "components" && !filteredComponents.length && <p className="catalog-note">No matching components.</p>}
            {!isLoading && activeLibrary === "variants" && !filteredVariants.length && <p className="catalog-note">No matching variants.</p>}
            {!isLoading && activeLibrary === "groups" && !filteredGroups.length && <p className="catalog-note">No matching groups.</p>}
            {!isLoading && activeLibrary === "pages" && !filteredPages.length && <p className="catalog-note">No matching pages.</p>}
            {!isLoading && activeLibrary === "sources" && !filteredSources.length && <p className="catalog-note">No matching sources.</p>}
            {isLoading && <LoadingRows />}
          </div>
        </aside>

        <section className="preview-pane" style={themeVars} aria-label="Live preview">
          <div className="preview-header">
            <div>
              <p className="eyebrow">{isComparingThemes ? "Theme Compare" : theme?.theme.name ?? "Theme"}</p>
              <h2>{activeTitle}</h2>
            </div>
            <div className="framework-flags">
              <span className={component?.framework.react ? "ready" : ""}>React</span>
              <span className={component?.framework.svelte ? "ready" : ""}>Svelte</span>
            </div>
          </div>

          <div className="canvas">
            {activeLibrary === "sources" && sourceCatalog ? (
              <SourcePreview catalog={sourceCatalog} />
            ) : activeLibrary === "groups" && isGroupBoardOpen ? (
              <GroupBoard
                duplicateGroups={duplicateGroups}
                groups={groups}
                groupFiles={groupFiles}
                componentFiles={componentFiles}
                variantFiles={variantFiles}
                highlightedGroupId={highlightedBoardGroupId}
                showDuplicatesOnly={showDuplicateGroupsOnly}
                onShowDuplicatesOnlyChange={setShowDuplicateGroupsOnly}
                onSelect={(groupId) => {
                  setSelectedGroupId(groupId);
                  setIsGroupBoardOpen(false);
                }}
              />
            ) : activeLibrary === "groups" && group && isComparingThemes ? (
              <div className="theme-compare-grid">
                {themeFiles.map((item) => (
                  <section className="compare-tile group-compare-tile" key={item.theme.id} style={themeStyle(item)}>
                    <header>
                      <span>{item.theme.name}</span>
                      <button
                        className={item.theme.id === selectedThemeId ? "mini-theme active" : "mini-theme"}
                        onClick={() => setSelectedThemeId(item.theme.id)}
                        type="button"
                      >
                        Use
                      </button>
                    </header>
                    <div className="compare-preview">
                      <GroupPreview group={group} componentFiles={componentFiles} variantFiles={variantFiles} compact />
                    </div>
                  </section>
                ))}
              </div>
            ) : activeLibrary === "groups" && group ? (
              <GroupPreview group={group} componentFiles={componentFiles} variantFiles={variantFiles} />
            ) : activeLibrary === "variants" && variant && isComparingThemes ? (
              <div className="theme-compare-grid">
                {themeFiles.map((item) => (
                  <section className="compare-tile" key={item.theme.id} style={themeStyle(item)}>
                    <header>
                      <span>{item.theme.name}</span>
                      <button
                        className={item.theme.id === selectedThemeId ? "mini-theme active" : "mini-theme"}
                        onClick={() => setSelectedThemeId(item.theme.id)}
                        type="button"
                      >
                        Use
                      </button>
                    </header>
                    <div className="compare-preview">
                      <VariantPreview variant={variant} componentFiles={componentFiles} compact />
                    </div>
                  </section>
                ))}
              </div>
            ) : activeLibrary === "variants" && variant ? (
              <VariantPreview variant={variant} componentFiles={componentFiles} />
            ) : activeLibrary === "pages" && pageRecord ? (
              <PagePreview page={pageRecord} groupFiles={groupFiles} variantFiles={variantFiles} componentFiles={componentFiles} />
            ) : component && isComparingThemes ? (
              <div className="theme-compare-grid">
                {themeFiles.map((item) => (
                  <section className="compare-tile" key={item.theme.id} style={themeStyle(item)}>
                    <header>
                      <span>{item.theme.name}</span>
                      <button
                        className={item.theme.id === selectedThemeId ? "mini-theme active" : "mini-theme"}
                        onClick={() => setSelectedThemeId(item.theme.id)}
                        type="button"
                      >
                        Use
                      </button>
                    </header>
                    <div className="compare-preview">
                      <PreviewRenderer component={component.component.id} props={propValues} />
                    </div>
                  </section>
                ))}
              </div>
            ) : component ? (
              <PreviewRenderer component={component.component.id} props={propValues} />
            ) : (
              <Loader2 className="spin" size={28} />
            )}
          </div>

          <div className="state-strip" aria-label="Preview states">
            {activeLibrary === "sources" && sourceCatalog
              ? sourceCatalog.items.map((item) => (
                  <button className="state-chip" key={item.id} type="button">
                    <Circle size={12} />
                    {item.name}
                  </button>
                ))
              : activeLibrary === "groups" && isGroupBoardOpen
              ? groups.map((item) => (
                  <button
                    className="state-chip"
                    key={item.id}
                    onClick={() => {
                      setSelectedGroupId(item.id);
                      setIsGroupBoardOpen(false);
                    }}
                    type="button"
                  >
                    <Circle size={12} />
                    {item.name}
                  </button>
                ))
              : activeLibrary === "groups" && group
              ? group.items.map((item) => (
                  <button
                    className="state-chip"
                    key={`${item.component}-${item.state}`}
                    onClick={() => {
                      setActiveLibrary("components");
                      setSelectedComponentId(item.component);
                    }}
                    type="button"
                  >
                    <Circle size={12} />
                    {item.role}
                  </button>
                ))
              : activeLibrary === "variants" && variant
              ? variant.slots.map((slot) => (
                  <button className="state-chip" key={`${slot.name}-${slot.kind}`} type="button">
                    <Circle size={12} />
                    {slot.name}
                  </button>
                ))
              : activeLibrary === "pages" && pageRecord
              ? pageRecord.regions.map((region) => (
                  <button className="state-chip" key={region.id} type="button">
                    <Circle size={12} />
                    {region.label}
                  </button>
                ))
              : component?.states.map((state) => (
                  <button
                    className={state.id === selectedStateId ? "state-chip active" : "state-chip"}
                    key={state.id}
                    onClick={() => applyState(state)}
                    type="button"
                  >
                    {state.id === selectedStateId ? <Check size={15} /> : <Circle size={12} />}
                    {state.label}
                  </button>
                ))}
          </div>
        </section>

        <aside className="inspector" aria-label="Props">
          <div className="panel-heading">
            <Zap size={17} />
            <span>Props</span>
          </div>
          {isVariantComposerOpen ? (
            <VariantComposer
              componentFiles={componentFiles}
              draft={variantDraft}
              hasReviewedWarnings={hasReviewedDraftWarnings}
              isEditing={Boolean(editingVariantId)}
              message={saveMessage}
              validation={draftVariantValidation}
              onCancel={() => {
                setIsVariantComposerOpen(false);
                setEditingVariantId(null);
              }}
              onChange={setVariantDraft}
              onSave={saveVariantDraft}
            />
          ) : isPageComposerOpen ? (
            <PageComposer
              draft={pageDraft}
              groups={groups}
              variants={variants}
              hasReviewedWarnings={hasReviewedDraftWarnings}
              isEditing={Boolean(editingPageId)}
              message={saveMessage}
              validation={draftPageValidation}
              onCancel={() => {
                setIsPageComposerOpen(false);
                setEditingPageId(null);
              }}
              onChange={setPageDraft}
              onSave={savePageDraft}
            />
          ) : isGroupComposerOpen ? (
            <GroupComposer
              componentFiles={componentFiles}
              variants={variants}
              draft={groupDraft}
              hasReviewedWarnings={hasReviewedDraftWarnings}
              isEditing={Boolean(editingGroupId)}
              message={saveMessage}
              validation={draftValidation}
              onCancel={() => {
                setIsGroupComposerOpen(false);
                setEditingGroupId(null);
              }}
              onChange={setGroupDraft}
              onSave={saveGroupDraft}
            />
          ) : isCatalogOpen ? (
            <CatalogPanel
              error={catalogError}
              indexReady={Boolean(status?.indexInitialized)}
              query={catalogQuery}
              results={catalogResults}
              type={catalogType}
              onOpen={openCatalogResult}
              onQueryChange={setCatalogQuery}
              onTypeChange={setCatalogType}
            />
          ) : isReportOpen ? (
            <ScreenshotReportPanel
              error={screenshotReportError}
              report={screenshotReport}
              reports={screenshotReports}
              onSelectReport={setScreenshotReport}
            />
          ) : activeLibrary === "sources" && sourceCatalog ? (
            <SourceInspector
              actionMessage={sourceActionMessage}
              catalog={sourceCatalog}
              importingItemId={importingSourceItemId}
              onImport={importSourceItem}
            />
          ) : activeLibrary === "groups" && isGroupBoardOpen ? (
            <BoardInspector
              duplicateGroups={duplicateGroups}
              groups={groups}
              onJumpToGroup={jumpToBoardGroup}
              onShowDuplicatesOnlyChange={setShowDuplicateGroupsOnly}
              showDuplicatesOnly={showDuplicateGroupsOnly}
            />
          ) : activeLibrary === "groups" && group ? (
            <GroupInspector
              duplicateGroups={duplicateGroups.filter((finding) => finding.groupIds.includes(group.group.id))}
              group={group}
              componentFiles={componentFiles}
              variantFiles={variantFiles}
              validation={groupValidation}
              visualChecks={visualChecks}
              onCopy={() => startGroupComposer("copy")}
              onEdit={() => startGroupComposer("edit")}
            />
          ) : activeLibrary === "variants" && variant ? (
            <VariantInspector
              componentFiles={componentFiles}
              variant={variant}
              validation={variantValidation}
              visualChecks={visualChecks}
              onCopy={() => startVariantComposer("copy")}
              onEdit={() => startVariantComposer("edit")}
            />
          ) : activeLibrary === "pages" && pageRecord ? (
            <PageInspector
              page={pageRecord}
              groups={groups}
              variants={variants}
              validation={pageValidation}
              visualChecks={visualChecks}
              onCopy={() => startPageComposer("copy")}
              onEdit={() => startPageComposer("edit")}
            />
          ) : (
            <div className="controls">
              <VisualCheckPanel checks={visualChecks} />
              {component?.props.map((prop) => (
                <PropControl
                  key={prop.id}
                  prop={prop}
                  value={propValues[prop.id] ?? prop.default}
                  onChange={(value) => updateProp(prop.id, value)}
                />
              ))}
            </div>
          )}
          {theme && <ThemeTokens theme={theme} />}
        </aside>
      </section>
    </main>
  );
}

function defaultProps(component: ComponentFile | null) {
  if (!component) return {};

  return Object.fromEntries(component.props.map((prop) => [prop.id, prop.default]));
}

function filterLibraryItems<T>(items: T[], query: string, getSearchText: (item: T) => string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return items;

  return items.filter((item) => getSearchText(item).toLowerCase().includes(normalizedQuery));
}

function addDraftNameConflict(
  validation: GroupValidation,
  draft: GroupFile,
  groups: GroupSummary[],
  editingGroupId: string | null,
): GroupValidation {
  const draftId = slugify(draft.group.name);
  const conflict = draftId && groups.some((group) => group.id === draftId && group.id !== editingGroupId);
  if (!conflict) return validation;

  const issues = [
    ...validation.issues,
    {
      severity: "error" as const,
      title: "Duplicate group name",
      detail: `${draft.group.name} would use the same metadata id as an existing group.`,
    },
  ];

  return {
    status: "error",
    issueCount: issues.length,
    issues,
  };
}

function addVariantDraftNameConflict(
  validation: GroupValidation,
  draft: VariantFile,
  variants: VariantSummary[],
  editingVariantId: string | null,
): GroupValidation {
  const draftId = slugify(draft.variant.name);
  const conflict = draftId && variants.some((variant) => variant.id === draftId && variant.id !== editingVariantId);
  if (!conflict) return validation;

  const issues = [
    ...validation.issues,
    {
      severity: "error" as const,
      title: "Duplicate variant name",
      detail: `${draft.variant.name} would use the same metadata id as an existing variant.`,
    },
  ];

  return {
    status: "error",
    issueCount: issues.length,
    issues,
  };
}

function addPageDraftNameConflict(
  validation: GroupValidation,
  draft: PageFile,
  pages: PageSummary[],
  editingPageId: string | null,
): GroupValidation {
  const draftId = slugify(draft.page.name);
  const conflict = draftId && pages.some((page) => page.id === draftId && page.id !== editingPageId);
  if (!conflict) return validation;

  const issues = [
    ...validation.issues,
    {
      severity: "error" as const,
      title: "Duplicate page name",
      detail: `${draft.page.name} would use the same metadata id as an existing page.`,
    },
  ];

  return {
    status: "error",
    issueCount: issues.length,
    issues,
  };
}

function libraryLabel(mode: LibraryMode) {
  return mode === "components"
    ? "Components"
    : mode === "variants"
    ? "Variants"
    : mode === "groups"
    ? "Groups"
    : mode === "pages"
    ? "Pages"
    : "Sources";
}

function themeStyle(theme: ThemeFile) {
  return {
    "--preview-bg": theme.colors.background,
    "--preview-surface": theme.colors.surface,
    "--preview-surface-muted": theme.colors.surfaceMuted,
    "--preview-text": theme.colors.text,
    "--preview-muted": theme.colors.muted,
    "--preview-border": theme.colors.border,
    "--preview-primary": theme.colors.primary,
    "--preview-secondary": theme.colors.secondary,
    "--preview-danger": theme.colors.danger,
    "--preview-success": theme.colors.success,
    "--preview-warning": theme.colors.warning,
    "--preview-focus": theme.colors.focus,
    "--preview-radius": `${theme.radius.medium}px`,
    "--preview-font": theme.typography.font,
  } as React.CSSProperties;
}

function StatusPill({ status }: { status: EnvironmentStatus | null }) {
  if (!status) {
    return (
      <div className="status-pill muted">
        <Loader2 className="spin" size={16} />
        Index
      </div>
    );
  }

  return (
    <div className={status.indexInitialized ? "status-pill ready" : "status-pill muted"} title={runtimeTitle(status)}>
      {status.indexInitialized ? <Database size={16} /> : <FileCode2 size={16} />}
      <span>{status.indexInitialized ? `${status.indexedRecordCount} indexed` : "Files"}</span>
      <small>{status.ollamaAvailable ? "Embeddings ready" : "No embeddings"}</small>
    </div>
  );
}

function ThemeTokens({ theme }: { theme: ThemeFile }) {
  const tokens = [
    ["Surface", theme.colors.surface],
    ["Muted", theme.colors.surfaceMuted],
    ["Text", theme.colors.text],
    ["Primary", theme.colors.primary],
    ["Danger", theme.colors.danger],
    ["Focus", theme.colors.focus],
  ];

  return (
    <section className="token-panel" aria-label="Theme tokens">
      <div className="token-heading">
        <SwatchBook size={16} />
        <span>{theme.theme.name} Tokens</span>
      </div>
      <div className="token-grid">
        {tokens.map(([label, value]) => (
          <div className="token-cell" key={label}>
            <i style={{ background: value }} />
            <span>{label}</span>
            <code>{value}</code>
          </div>
        ))}
      </div>
    </section>
  );
}

function GroupInspector({
  duplicateGroups,
  group,
  componentFiles,
  variantFiles,
  validation,
  visualChecks,
  onCopy,
  onEdit,
}: {
  duplicateGroups: DuplicateGroupFinding[];
  group: GroupFile;
  componentFiles: Record<string, ComponentFile>;
  variantFiles: Record<string, VariantFile>;
  validation: GroupValidation | null;
  visualChecks: VisualCheck[];
  onCopy: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="controls">
      <section className="group-summary">
        <strong>{group.group.layout}</strong>
        <p>{group.group.description}</p>
        <button className="secondary-command" onClick={onEdit} type="button">
          <Pencil size={15} />
          Edit Group
        </button>
        <button className="secondary-command" onClick={onCopy} type="button">
          <Plus size={15} />
          Copy to New Group
        </button>
      </section>
      <DuplicateGroupPanel findings={duplicateGroups} mode="selected" />
      <ValidationPanel validation={validation} />
      <VisualCheckPanel checks={visualChecks} />
      {group.items.map((item) => {
        if (groupItemKind(item) === "variant") {
          const variant = item.variant ? variantFiles[item.variant] : null;
          return (
            <section className="group-item-card" key={`variant-${item.variant}-${item.role}`}>
              <span>{item.role}</span>
              <strong>{variant?.variant.name ?? item.variant}</strong>
              <small>variant</small>
            </section>
          );
        }

        const component = componentFiles[item.component];
        const state = component?.states.find((candidate) => candidate.id === item.state);

        return (
          <section className="group-item-card" key={`${item.component}-${item.state}`}>
            <span>{item.role}</span>
            <strong>{component?.component.name ?? item.component}</strong>
            <small>{state?.label ?? item.state}</small>
          </section>
        );
      })}
    </div>
  );
}

function VariantInspector({
  componentFiles,
  variant,
  validation,
  visualChecks,
  onCopy,
  onEdit,
}: {
  componentFiles: Record<string, ComponentFile>;
  variant: VariantFile;
  validation: GroupValidation | null;
  visualChecks: VisualCheck[];
  onCopy: () => void;
  onEdit: () => void;
}) {
  const component = componentFiles[variant.variant.component];

  return (
    <div className="controls">
      <section className="group-summary">
        <strong>{component?.component.name ?? variant.variant.component}</strong>
        <p>{variant.variant.description}</p>
        <button className="secondary-command" onClick={onEdit} type="button">
          <Pencil size={15} />
          Edit Variant
        </button>
        <button className="secondary-command" onClick={onCopy} type="button">
          <Plus size={15} />
          Copy to New Variant
        </button>
      </section>
      <ValidationPanel validation={validation} />
      <VisualCheckPanel checks={visualChecks} />
      {variant.slots.map((slot) => (
        <section className="group-item-card" key={`${slot.name}-${slot.kind}`}>
          <span>{slot.kind}</span>
          <strong>{slot.name}</strong>
          <small>{slot.value}</small>
        </section>
      ))}
    </div>
  );
}

function VariantComposer({
  componentFiles,
  draft,
  hasReviewedWarnings,
  isEditing,
  message,
  validation,
  onCancel,
  onChange,
  onSave,
}: {
  componentFiles: Record<string, ComponentFile>;
  draft: VariantFile;
  hasReviewedWarnings: boolean;
  isEditing: boolean;
  message: string | null;
  validation: GroupValidation | null;
  onCancel: () => void;
  onChange: (draft: VariantFile) => void;
  onSave: () => void;
}) {
  const componentOptions = Object.values(componentFiles);
  const component = componentFiles[draft.variant.component];
  const hasBlockingIssues = validation?.status === "error";
  const needsWarningReview = validation?.status === "warning" && !hasReviewedWarnings;
  const saveLabel = needsWarningReview ? "Review Warnings" : isEditing ? "Update Variant" : "Save Variant";

  function updateVariant(updates: Partial<VariantFile["variant"]>) {
    const next = { ...draft, variant: { ...draft.variant, ...updates } };
    if (updates.component) {
      const selected = componentFiles[updates.component];
      next.variant.state = selected?.states[0]?.id ?? "";
      next.source.path = `metadata/components/${updates.component}.toml`;
      next.props = { ...(selected ? defaultProps(selected) : {}) };
    }
    if (updates.state && component) {
      const state = component.states.find((candidate) => candidate.id === updates.state);
      next.props = { ...defaultProps(component), ...(state?.props ?? {}) };
    }
    onChange(next);
  }

  function updateProp(id: string, value: string) {
    onChange({ ...draft, props: { ...draft.props, [id]: value } });
  }

  function updateSlot(index: number, updates: Partial<VariantSlot>) {
    onChange({
      ...draft,
      slots: draft.slots.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...updates } : slot)),
    });
  }

  function addSlot() {
    onChange({ ...draft, slots: [...draft.slots, { name: "slot", kind: "text", value: "New content" }] });
  }

  function removeSlot(index: number) {
    onChange({ ...draft, slots: draft.slots.filter((_, slotIndex) => slotIndex !== index) });
  }

  return (
    <div className="composer-panel">
      <label className="field-control">
        <span>Name</span>
        <input onChange={(event) => updateVariant({ name: event.currentTarget.value })} type="text" value={draft.variant.name} />
      </label>
      <label className="field-control">
        <span>Description</span>
        <input onChange={(event) => updateVariant({ description: event.currentTarget.value })} type="text" value={draft.variant.description} />
      </label>
      <label className="field-control">
        <span>Component</span>
        <select onChange={(event) => updateVariant({ component: event.currentTarget.value })} value={draft.variant.component}>
          {componentOptions.map((option) => (
            <option key={option.component.id} value={option.component.id}>
              {option.component.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field-control">
        <span>State</span>
        <select onChange={(event) => updateVariant({ state: event.currentTarget.value })} value={draft.variant.state}>
          {component?.states.map((state) => (
            <option key={state.id} value={state.id}>
              {state.label}
            </option>
          ))}
        </select>
      </label>

      {component?.props.map((prop) => (
        <PropControl key={prop.id} prop={prop} value={draft.props[prop.id] ?? prop.default} onChange={(value) => updateProp(prop.id, value)} />
      ))}

      <div className="composer-items">
        {draft.slots.map((slot, index) => (
          <section className="composer-item" key={`${index}-${slot.name}-${slot.kind}`}>
            <label className="field-control">
              <span>Slot</span>
              <input onChange={(event) => updateSlot(index, { name: event.currentTarget.value })} type="text" value={slot.name} />
            </label>
            <label className="field-control">
              <span>Kind</span>
              <select onChange={(event) => updateSlot(index, { kind: event.currentTarget.value })} value={slot.kind}>
                {variantSlotKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-control">
              <span>Value</span>
              <input onChange={(event) => updateSlot(index, { value: event.currentTarget.value })} type="text" value={slot.value} />
            </label>
            <button className="secondary-command" disabled={draft.slots.length <= 1} onClick={() => removeSlot(index)} type="button">
              Remove
            </button>
          </section>
        ))}
      </div>

      <ValidationPanel validation={validation} />
      <WarningReviewPanel hasReviewedWarnings={hasReviewedWarnings} validation={validation} />

      <div className="composer-actions">
        <button className="secondary-command" onClick={addSlot} type="button">
          Add Slot
        </button>
        <button className="secondary-command" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="primary-command" disabled={hasBlockingIssues} onClick={onSave} type="button">
          {saveLabel}
        </button>
      </div>
      {message && <p className={message.includes("Resolve") || message.includes("already exists") ? "catalog-error" : "catalog-note"}>{message}</p>}
    </div>
  );
}

function PageInspector({
  page,
  groups,
  variants,
  validation,
  visualChecks,
  onCopy,
  onEdit,
}: {
  page: PageFile;
  groups: GroupSummary[];
  variants: VariantSummary[];
  validation: GroupValidation | null;
  visualChecks: VisualCheck[];
  onCopy: () => void;
  onEdit: () => void;
}) {
  const blockCount = page.regions.reduce((total, region) => total + region.blocks.length, 0);

  return (
    <div className="controls">
      <section className="group-summary">
        <strong>{blockCount} blocks</strong>
        <p>{page.page.description}</p>
        <button className="secondary-command" onClick={onEdit} type="button">
          <Pencil size={15} />
          Edit Page
        </button>
        <button className="secondary-command" onClick={onCopy} type="button">
          <Plus size={15} />
          Copy to New Page
        </button>
      </section>
      <ValidationPanel validation={validation} />
      <VisualCheckPanel checks={visualChecks} />
      <section className="group-summary">
        <strong>Export Plan</strong>
        <p>Export will generate React page files, referenced group/variant files, and a manifest for handoff to WebStorm.</p>
      </section>
      {page.regions.map((region) => (
        <section className="group-item-card" key={region.id}>
          <span>{region.layout}</span>
          <strong>{region.label}</strong>
          <small>
            {region.blocks
              .map((block) =>
                block.kind === "group"
                  ? groups.find((group) => group.id === block.reference)?.name ?? block.reference
                  : variants.find((variant) => variant.id === block.reference)?.name ?? block.reference,
              )
              .join(", ")}
          </small>
        </section>
      ))}
    </div>
  );
}

function PageComposer({
  draft,
  groups,
  variants,
  hasReviewedWarnings,
  isEditing,
  message,
  validation,
  onCancel,
  onChange,
  onSave,
}: {
  draft: PageFile;
  groups: GroupSummary[];
  variants: VariantSummary[];
  hasReviewedWarnings: boolean;
  isEditing: boolean;
  message: string | null;
  validation: GroupValidation | null;
  onCancel: () => void;
  onChange: (draft: PageFile) => void;
  onSave: () => void;
}) {
  const hasBlockingIssues = validation?.status === "error";
  const needsWarningReview = validation?.status === "warning" && !hasReviewedWarnings;
  const saveLabel = needsWarningReview ? "Review Warnings" : isEditing ? "Update Page" : "Save Page";

  function updatePage(updates: Partial<PageFile["page"]>) {
    onChange({ ...draft, page: { ...draft.page, ...updates } });
  }

  function updateRegion(index: number, updates: Partial<PageRegion>) {
    onChange({ ...draft, regions: draft.regions.map((region, regionIndex) => (regionIndex === index ? { ...region, ...updates } : region)) });
  }

  function updateBlock(regionIndex: number, blockIndex: number, updates: Partial<PageBlock>) {
    onChange({
      ...draft,
      regions: draft.regions.map((region, currentRegionIndex) => {
        if (currentRegionIndex !== regionIndex) return region;
        return {
          ...region,
          blocks: region.blocks.map((block, currentBlockIndex) => {
            if (currentBlockIndex !== blockIndex) return block;
            const next = { ...block, ...updates };
            if (updates.kind === "group") next.reference = groups[0]?.id ?? "";
            if (updates.kind === "variant") next.reference = variants[0]?.id ?? "";
            return next;
          }),
        };
      }),
    });
  }

  function moveBlock(regionIndex: number, blockIndex: number, direction: -1 | 1) {
    const region = draft.regions[regionIndex];
    if (!region) return;
    onChange(reorderPageBlock(draft, region.id, blockIndex, direction));
  }

  function moveBlockToRegion(regionIndex: number, blockIndex: number, targetRegionId: string) {
    const sourceRegion = draft.regions[regionIndex];
    if (!sourceRegion) return;
    onChange(movePageBlockToRegion(draft, sourceRegion.id, blockIndex, targetRegionId));
  }

  function addBlock(regionIndex: number) {
    const region = draft.regions[regionIndex];
    if (!region) return;
    updateRegion(regionIndex, {
      blocks: [
        ...region.blocks,
        {
          kind: groups.length ? "group" : "variant",
          reference: groups[0]?.id ?? variants[0]?.id ?? "",
          role: "Page block",
          layout: "section",
        },
      ],
    });
  }

  function removeBlock(regionIndex: number, blockIndex: number) {
    const region = draft.regions[regionIndex];
    if (!region) return;
    updateRegion(regionIndex, { blocks: region.blocks.filter((_, index) => index !== blockIndex) });
  }

  return (
    <div className="composer-panel">
      <label className="field-control">
        <span>Name</span>
        <input onChange={(event) => updatePage({ name: event.currentTarget.value })} type="text" value={draft.page.name} />
      </label>
      <label className="field-control">
        <span>Description</span>
        <input onChange={(event) => updatePage({ description: event.currentTarget.value })} type="text" value={draft.page.description} />
      </label>
      <label className="field-control">
        <span>Route</span>
        <input onChange={(event) => updatePage({ route: event.currentTarget.value })} type="text" value={draft.page.route} />
      </label>

      <div className="composer-items">
        {draft.regions.map((region, regionIndex) => (
          <section className="composer-item page-region-editor" key={region.id}>
            <label className="field-control">
              <span>{region.label} Layout</span>
              <select onChange={(event) => updateRegion(regionIndex, { layout: event.currentTarget.value as PageLayout })} value={region.layout}>
                {pageLayouts.map((layout) => (
                  <option key={layout} value={layout}>
                    {layout}
                  </option>
                ))}
              </select>
            </label>
            {region.blocks.map((block, blockIndex) => (
              <section className="composer-item nested" key={`${region.id}-${blockIndex}-${block.reference}`}>
                <label className="field-control">
                  <span>Role</span>
                  <input onChange={(event) => updateBlock(regionIndex, blockIndex, { role: event.currentTarget.value })} type="text" value={block.role} />
                </label>
                <label className="field-control">
                  <span>Kind</span>
                  <select onChange={(event) => updateBlock(regionIndex, blockIndex, { kind: event.currentTarget.value as PageBlock["kind"] })} value={block.kind}>
                    <option value="group">group</option>
                    <option value="variant">variant</option>
                  </select>
                </label>
                <label className="field-control">
                  <span>Reference</span>
                  <select onChange={(event) => updateBlock(regionIndex, blockIndex, { reference: event.currentTarget.value })} value={block.reference}>
                    {(block.kind === "group" ? groups : variants).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-control">
                  <span>Move To</span>
                  <select onChange={(event) => moveBlockToRegion(regionIndex, blockIndex, event.currentTarget.value)} value={region.id}>
                    {draft.regions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="composer-item-actions">
                  <button className="icon-command" disabled={blockIndex === 0} onClick={() => moveBlock(regionIndex, blockIndex, -1)} title="Move up" type="button">
                    <ArrowUp size={15} />
                  </button>
                  <button className="icon-command" disabled={blockIndex === region.blocks.length - 1} onClick={() => moveBlock(regionIndex, blockIndex, 1)} title="Move down" type="button">
                    <ArrowDown size={15} />
                  </button>
                  <button className="secondary-command" disabled={region.blocks.length <= 1} onClick={() => removeBlock(regionIndex, blockIndex)} type="button">
                    Remove
                  </button>
                </div>
              </section>
            ))}
            <button className="secondary-command" onClick={() => addBlock(regionIndex)} type="button">
              Add Block
            </button>
          </section>
        ))}
      </div>

      <ValidationPanel validation={validation} />
      <WarningReviewPanel hasReviewedWarnings={hasReviewedWarnings} validation={validation} />

      <div className="composer-actions">
        <button className="secondary-command" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="primary-command" disabled={hasBlockingIssues} onClick={onSave} type="button">
          {saveLabel}
        </button>
      </div>
      {message && <p className={message.includes("Resolve") || message.includes("already exists") ? "catalog-error" : "catalog-note"}>{message}</p>}
    </div>
  );
}

function GroupComposer({
  componentFiles,
  variants,
  draft,
  hasReviewedWarnings,
  isEditing,
  message,
  validation,
  onCancel,
  onChange,
  onSave,
}: {
  componentFiles: Record<string, ComponentFile>;
  variants: VariantSummary[];
  draft: GroupFile;
  hasReviewedWarnings: boolean;
  isEditing: boolean;
  message: string | null;
  validation: GroupValidation | null;
  onCancel: () => void;
  onChange: (draft: GroupFile) => void;
  onSave: () => void;
}) {
  const componentOptions = Object.values(componentFiles);
  const variantOptions = variants;
  const hasBlockingIssues = validation?.status === "error";
  const needsWarningReview = validation?.status === "warning" && !hasReviewedWarnings;
  const saveLabel = needsWarningReview ? "Review Warnings" : isEditing ? "Update Group" : "Save Group";

  function updateGroup(updates: Partial<GroupFile["group"]>) {
    onChange({ ...draft, group: { ...draft.group, ...updates } });
  }

  function updateItem(index: number, updates: Partial<GroupItem>) {
    onChange({
      ...draft,
      items: draft.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const next = { ...item, ...updates };
        if (updates.component) {
          const component = componentFiles[updates.component];
          next.state = component?.states[0]?.id ?? "";
        }
        if (updates.kind === "variant") {
          next.variant = next.variant || variantOptions[0]?.id || "";
          next.component = "";
          next.state = "";
        }
        if (updates.kind === "component") {
          const component = componentOptions[0];
          next.component = next.component || component?.component.id || "";
          next.state = next.state || component?.states[0]?.id || "";
          next.variant = "";
        }
        return next;
      }),
    });
  }

  function addItem() {
    const component = componentOptions[0];
    if (!component) return;

    onChange({
      ...draft,
      items: [
        ...draft.items,
        {
          kind: "component",
          component: component.component.id,
          state: component.states[0]?.id ?? "",
          variant: "",
          role: "Area Item",
        },
      ],
    });
  }

  function removeItem(index: number) {
    onChange({
      ...draft,
      items: draft.items.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function duplicateItem(index: number) {
    const item = draft.items[index];
    if (!item) return;

    onChange({
      ...draft,
      items: [...draft.items.slice(0, index + 1), { ...item, role: `${item.role} Copy` }, ...draft.items.slice(index + 1)],
    });
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.items.length) return;

    const items = draft.items.map((item) => ({ ...item }));
    const [item] = items.splice(index, 1);
    items.splice(nextIndex, 0, item);
    onChange({ ...draft, items });
  }

  return (
    <div className="composer-panel">
      <label className="field-control">
        <span>Name</span>
        <input onChange={(event) => updateGroup({ name: event.currentTarget.value })} type="text" value={draft.group.name} />
      </label>
      <label className="field-control">
        <span>Description</span>
        <input onChange={(event) => updateGroup({ description: event.currentTarget.value })} type="text" value={draft.group.description} />
      </label>
      <label className="field-control">
        <span>Layout</span>
        <select onChange={(event) => updateGroup({ layout: event.currentTarget.value as GroupFile["group"]["layout"] })} value={draft.group.layout}>
          {groupLayouts.map((layout) => (
            <option key={layout} value={layout}>
              {layout}
            </option>
          ))}
        </select>
      </label>

      <div className="composer-items">
        {draft.items.map((item, index) => {
          const component = componentFiles[item.component];

          return (
            <section className="composer-item" key={`${index}-${item.component}-${item.state}`}>
              <label className="field-control">
                <span>Role</span>
                <input onChange={(event) => updateItem(index, { role: event.currentTarget.value })} type="text" value={item.role} />
              </label>
              <label className="field-control">
                <span>Kind</span>
                <select onChange={(event) => updateItem(index, { kind: event.currentTarget.value as GroupItem["kind"] })} value={groupItemKind(item)}>
                  <option value="component">component</option>
                  <option value="variant">variant</option>
                </select>
              </label>
              {groupItemKind(item) === "variant" ? (
                <label className="field-control">
                  <span>Variant</span>
                  <select onChange={(event) => updateItem(index, { variant: event.currentTarget.value })} value={item.variant ?? variantOptions[0]?.id ?? ""}>
                    {variantOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
              <label className="field-control">
                <span>Component</span>
                <select onChange={(event) => updateItem(index, { component: event.currentTarget.value })} value={item.component}>
                  {componentOptions.map((option) => (
                    <option key={option.component.id} value={option.component.id}>
                      {option.component.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>State</span>
                <select onChange={(event) => updateItem(index, { state: event.currentTarget.value })} value={item.state}>
                  {component?.states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </label>
                </>
              )}
              <div className="composer-item-actions">
                <button className="icon-command" disabled={index === 0} onClick={() => moveItem(index, -1)} title="Move up" type="button">
                  <ArrowUp size={15} />
                </button>
                <button
                  className="icon-command"
                  disabled={index === draft.items.length - 1}
                  onClick={() => moveItem(index, 1)}
                  title="Move down"
                  type="button"
                >
                  <ArrowDown size={15} />
                </button>
                <button className="icon-command" onClick={() => duplicateItem(index)} title="Duplicate item" type="button">
                  <Copy size={15} />
                </button>
                <button className="secondary-command" disabled={draft.items.length <= 1} onClick={() => removeItem(index)} type="button">
                  Remove
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <ValidationPanel validation={validation} />
      <WarningReviewPanel hasReviewedWarnings={hasReviewedWarnings} validation={validation} />

      <div className="composer-actions">
        <button className="secondary-command" onClick={addItem} type="button">
          Add Item
        </button>
        <button className="secondary-command" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="primary-command" disabled={hasBlockingIssues} onClick={onSave} type="button">
          {saveLabel}
        </button>
      </div>
      {message && <p className={message.includes("Resolve") || message.includes("already exists") ? "catalog-error" : "catalog-note"}>{message}</p>}
    </div>
  );
}

function WarningReviewPanel({ hasReviewedWarnings, validation }: { hasReviewedWarnings: boolean; validation: GroupValidation | null }) {
  const warningCount = validation?.issues.filter((issue) => issue.severity === "warning").length ?? 0;
  if (!warningCount) return null;

  return (
    <section className={`warning-review-panel ${hasReviewedWarnings ? "ready" : "warning"}`}>
      <strong>{hasReviewedWarnings ? "Warnings Accepted" : "Warning Review Required"}</strong>
      <p>
        {hasReviewedWarnings
          ? `${warningCount} ${warningCount === 1 ? "warning has" : "warnings have"} been accepted for this draft.`
          : `${warningCount} ${warningCount === 1 ? "warning needs" : "warnings need"} review before this draft can be saved.`}
      </p>
      {!hasReviewedWarnings && <small>Use Review Warnings to acknowledge them, then save again.</small>}
    </section>
  );
}

function ValidationPanel({ validation }: { validation: GroupValidation | null }) {
  if (!validation) {
    return <p className="catalog-note">Checking group structure...</p>;
  }

  return (
    <section className={`validation-panel ${validation.status}`}>
      <strong>{validationSummary(validation)}</strong>
      {validation.issueCount === 0 ? (
        <p>No structural issues found.</p>
      ) : (
        validation.issues.map((issue) => (
          <article className={`validation-issue ${issue.severity}`} key={`${issue.title}-${issue.detail}`}>
            <span>{issue.title}</span>
            <p>{issue.detail}</p>
          </article>
        ))
      )}
    </section>
  );
}

function validationSummary(validation: GroupValidation) {
  if (validation.issueCount === 0) return "Ready";

  const errorCount = validation.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = validation.issues.filter((issue) => issue.severity === "warning").length;
  const parts = [];
  if (errorCount) parts.push(`${errorCount} ${errorCount === 1 ? "error" : "errors"}`);
  if (warningCount) parts.push(`${warningCount} ${warningCount === 1 ? "warning" : "warnings"}`);
  return parts.join(", ");
}

function buildVisualChecks({
  component,
  group,
  groupValidation,
  variant,
  variantValidation,
  page,
  pageValidation,
  props,
  theme,
}: {
  component: ComponentFile | null;
  group: GroupFile | null;
  groupValidation: GroupValidation | null;
  variant: VariantFile | null;
  variantValidation: GroupValidation | null;
  page: PageFile | null;
  pageValidation: GroupValidation | null;
  props: Record<string, string>;
  theme: ThemeFile | null;
}): VisualCheck[] {
  const checks: VisualCheck[] = [];

  if (!theme) return checks;

  checks.push(contrastCheck("Surface text contrast", theme.colors.text, theme.colors.surface, 4.5));
  checks.push(contrastCheck("Muted text contrast", theme.colors.muted, theme.colors.surface, 3));

  if (component) {
    checks.push(...componentLabelChecks(component, props));

    if (component.component.id === "button") {
      const variant = props.variant ?? "primary";
      const background = theme.colors[variant === "danger" ? "danger" : variant === "secondary" ? "secondary" : "primary"];
      checks.push(contrastCheck("Button text contrast", "#071018", background, 4.5));

      if ((props.size ?? "medium") === "small") {
        checks.push({
          status: "ready",
          title: "Button target size",
          detail: "Small buttons render at 34px high, above the 24px minimum target baseline.",
        });
      }
    }
  }

  if (group) {
    if (!group.items.length) {
      checks.push({
        status: "error",
        title: "Empty group preview",
        detail: "This group has no component placements to render.",
      });
    } else {
      checks.push({
        status: "ready",
        title: "Group preview content",
        detail: `${group.items.length} component placements are available for this layout.`,
      });
    }

    groupValidation?.issues.forEach((issue) => {
      checks.push({
        status: issue.severity,
        title: issue.title,
        detail: issue.detail,
      });
    });
  }

  if (variant) {
    checks.push({
      status: variant.slots.length ? "ready" : "warning",
      title: "Variant slots",
      detail: `${variant.slots.length} structured ${variant.slots.length === 1 ? "slot" : "slots"} configured for this reusable item.`,
    });

    variantValidation?.issues.forEach((issue) => {
      checks.push({
        status: issue.severity,
        title: issue.title,
        detail: issue.detail,
      });
    });
  }

  if (page) {
    const blockCount = page.regions.reduce((total, region) => total + region.blocks.length, 0);
    checks.push({
      status: blockCount ? "ready" : "error",
      title: "Page blocks",
      detail: `${blockCount} arranged ${blockCount === 1 ? "block" : "blocks"} across ${page.regions.length} semantic regions.`,
    });

    pageValidation?.issues.forEach((issue) => {
      checks.push({
        status: issue.severity,
        title: issue.title,
        detail: issue.detail,
      });
    });
  }

  return checks;
}

function componentLabelChecks(component: ComponentFile, props: Record<string, string>): VisualCheck[] {
  const labelProps = component.props.filter((prop) => ["label", "title", "helper", "description", "placeholder"].includes(prop.id));
  const emptyLabels = labelProps.filter((prop) => !String(props[prop.id] ?? prop.default).trim());

  if (!emptyLabels.length) {
    return [
      {
        status: "ready",
        title: "Visible copy",
        detail: "Label-like props have non-empty preview text.",
      },
    ];
  }

  return emptyLabels.map((prop) => ({
    status: "warning",
    title: "Empty visible copy",
    detail: `${component.component.name} has no ${prop.label.toLowerCase()} text in this state.`,
  }));
}

function contrastCheck(title: string, foreground: string, background: string, threshold: number): VisualCheck {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) {
    return {
      status: "warning",
      title,
      detail: `Could not calculate contrast for ${foreground} on ${background}.`,
    };
  }

  return {
    status: ratio >= threshold ? "ready" : "warning",
    title,
    detail: `${ratio.toFixed(1)}:1 contrast against a ${threshold}:1 target.`,
  };
}

function contrastRatio(foreground: string, background: string) {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return null;

  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string) {
  const value = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  return [r, g, b]
    .map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    })
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function VisualCheckPanel({ checks }: { checks: VisualCheck[] }) {
  const errorCount = checks.filter((check) => check.status === "error").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const status = errorCount ? "error" : warningCount ? "warning" : "ready";
  const summary = errorCount
    ? `${errorCount} ${errorCount === 1 ? "issue" : "issues"}`
    : warningCount
    ? `${warningCount} ${warningCount === 1 ? "warning" : "warnings"}`
    : "Ready";

  return (
    <section className={`visual-check-panel ${status}`} aria-label="Visual checks">
      <header>
        <ShieldCheck size={16} />
        <strong>{summary}</strong>
      </header>
      {checks.length ? (
        checks.map((check) => (
          <article className={`visual-check ${check.status}`} key={`${check.title}-${check.detail}`}>
            <span>{check.title}</span>
            <p>{check.detail}</p>
          </article>
        ))
      ) : (
        <p>Visual checks are waiting for preview metadata.</p>
      )}
    </section>
  );
}

function BoardInspector({
  duplicateGroups,
  groups,
  onJumpToGroup,
  onShowDuplicatesOnlyChange,
  showDuplicatesOnly,
}: {
  duplicateGroups: DuplicateGroupFinding[];
  groups: GroupSummary[];
  onJumpToGroup: (groupId: string) => void;
  onShowDuplicatesOnlyChange: (showDuplicatesOnly: boolean) => void;
  showDuplicatesOnly: boolean;
}) {
  const itemCount = groups.reduce((total, group) => total + group.itemCount, 0);
  const layouts = Array.from(new Set(groups.map((group) => group.layout))).join(", ");
  const duplicateSummary = duplicateGroupBoardCountCopy(duplicateGroups);
  const filterSummary = duplicateGroupBoardFilterCopy(groups, duplicateGroups, showDuplicatesOnly);

  return (
    <div className="controls">
      <section className="group-summary">
        <strong>Board</strong>
        <p>All defined component areas are visible together under the active theme.</p>
      </section>
      <section className="group-item-card">
        <span>Groups</span>
        <strong>{groups.length}</strong>
        <small>{itemCount} component placements</small>
      </section>
      <section className={`group-item-card duplicate-count ${duplicateSummary.status}`}>
        <span>Duplicate Structures</span>
        <strong>{duplicateSummary.duplicateStructureCount}</strong>
        <small>{duplicateSummary.detail}</small>
      </section>
      <section className={`group-item-card duplicate-filter ${filterSummary.status}`}>
        <span>Board Filter</span>
        <strong>{filterSummary.title}</strong>
        <small>{filterSummary.detail}</small>
        {filterSummary.canReset && (
          <button className="secondary-command" onClick={() => onShowDuplicatesOnlyChange(false)} type="button">
            {filterSummary.resetLabel}
          </button>
        )}
      </section>
      <section className="group-item-card">
        <span>Layouts</span>
        <strong>{layouts}</strong>
        <small>Defined in TOML</small>
      </section>
      <DuplicateGroupPanel findings={duplicateGroups} mode="board" onJumpToGroup={onJumpToGroup} />
    </div>
  );
}

function DuplicateGroupPanel({
  findings,
  mode,
  onJumpToGroup,
}: {
  findings: DuplicateGroupFinding[];
  mode: DuplicateGroupPanelMode;
  onJumpToGroup?: (groupId: string) => void;
}) {
  const copy = duplicateGroupPanelCopy(findings, mode);

  return (
    <section className={`duplicate-panel ${copy.status}`}>
      <strong>{copy.title}</strong>
      {findings.length ? (
        findings.map((finding) => (
          <article className="duplicate-finding" key={finding.signature}>
            <span>{finding.names.join(", ")}</span>
            <p>{duplicateGroupFindingSummary(finding)}</p>
            {onJumpToGroup && (
              <div className="duplicate-jumps">
                {duplicateGroupJumpTargets(finding).map((target) => (
                  <button key={target.groupId} onClick={() => onJumpToGroup(target.groupId)} type="button">
                    {target.label}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))
      ) : (
        <p>{copy.emptyMessage}</p>
      )}
    </section>
  );
}

function SourcePreview({ catalog }: { catalog: SourceCatalog }) {
  const byType = catalog.items.reduce<Record<string, number>>((counts, item) => {
    counts[item.itemType] = (counts[item.itemType] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <section className="source-preview">
      <header>
        <span>{catalog.source.adapter}</span>
        <strong>{catalog.source.name}</strong>
      </header>
      <p>{catalog.source.description}</p>
      <dl>
        <div>
          <dt>Location</dt>
          <dd>{catalog.source.location}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{catalog.items.length}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{catalog.source.status}</dd>
        </div>
      </dl>
      <div className="source-type-row">
        {Object.entries(byType).map(([type, count]) => (
          <span key={type}>
            {type}: {count}
          </span>
        ))}
      </div>
    </section>
  );
}

function SourceInspector({
  actionMessage,
  catalog,
  importingItemId,
  onImport,
}: {
  actionMessage: string | null;
  catalog: SourceCatalog;
  importingItemId: string | null;
  onImport: (item: SourceCatalogItem) => void;
}) {
  return (
    <section className="source-inspector">
      <div className="source-summary">
        <strong>{catalog.source.adapter}</strong>
        <span>{catalog.source.kind}</span>
        <small>{catalog.source.location}</small>
      </div>
      {actionMessage && <p className={actionMessage.includes("Imported") ? "catalog-note" : "catalog-error"}>{actionMessage}</p>}
      {catalog.warnings.map((warning) => (
        <p className="catalog-error" key={warning}>
          {warning}
        </p>
      ))}
      <div className="source-items">
        {catalog.items.map((item) => (
          <article className="source-item" key={item.id}>
            <header>
              <span>{item.itemType}</span>
              <strong>{item.name}</strong>
            </header>
            <p>{item.description}</p>
            <small>Preview: {item.previewStatus}</small>
            <small>Files: {item.files.length ? item.files.join(", ") : "none"}</small>
            <small>Dependencies: {item.dependencies.length ? item.dependencies.join(", ") : "none"}</small>
            {catalog.source.adapter === "shadcn" && (
              <button className="secondary-command" disabled={importingItemId === item.id} onClick={() => onImport(item)} type="button">
                {importingItemId === item.id ? "Importing..." : "Import as metadata"}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function CatalogPanel({
  error,
  indexReady,
  query,
  results,
  type,
  onOpen,
  onQueryChange,
  onTypeChange,
}: {
  error: string | null;
  indexReady: boolean;
  query: string;
  results: CatalogResult[];
  type: string;
  onOpen: (result: CatalogResult) => void;
  onQueryChange: (query: string) => void;
  onTypeChange: (type: string) => void;
}) {
  return (
    <div className="catalog-panel">
      <label className="field-control">
        <span>Search</span>
        <input
          disabled={!indexReady}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="button, danger, dashboard..."
          type="text"
          value={query}
        />
      </label>
      <label className="field-control">
        <span>Type</span>
        <select disabled={!indexReady} onChange={(event) => onTypeChange(event.currentTarget.value)} value={type}>
          <option value="all">all</option>
          <option value="component">components</option>
          <option value="variant">variants</option>
          <option value="group">groups</option>
          <option value="page">pages</option>
          <option value="theme">themes</option>
          <option value="source">sources</option>
          <option value="shadcn-component">shadcn components</option>
        </select>
      </label>
      {!indexReady && <p className="catalog-note">DuckDB is not ready, so the catalog is using file previews only.</p>}
      {error && <p className="catalog-error">{error}</p>}
      <div className="catalog-results">
        {results.map((result) => (
          <button className="catalog-result" key={result.id} onClick={() => onOpen(result)} type="button">
            <span>{result.recordType}</span>
            <strong>{result.title}</strong>
            <small>{result.body}</small>
          </button>
        ))}
        {indexReady && !results.length && !error && <p className="catalog-note">No matching catalog records.</p>}
      </div>
    </div>
  );
}

function ScreenshotReportPanel({
  error,
  report,
  reports,
  onSelectReport,
}: {
  error: string | null;
  report: ScreenshotReportSummary | null;
  reports: ScreenshotReportSummary[];
  onSelectReport: (report: ScreenshotReportSummary) => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, ReviewDecision>>({});
  const [localReviewDecisions, setLocalReviewDecisions] = useState<Record<string, ReviewDecision>>({});
  const [ignoredMalformedLocalDecisions, setIgnoredMalformedLocalDecisions] = useState(false);
  const [loadedDecisionSummary, setLoadedDecisionSummary] = useState({ current: 0, stale: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [themeFilter, setThemeFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");

  useEffect(() => {
    if (!report) {
      setReviewDecisions({});
      setLocalReviewDecisions({});
      setIgnoredMalformedLocalDecisions(false);
      setLoadedDecisionSummary({ current: 0, stale: 0, total: 0 });
      return;
    }

    const exported = Object.fromEntries(report.reviewDecisions.map((item) => [item.key, item.decision]));
    const stored = readStoredReviewDecisions(report);
    const local = stored.decisions;
    const merged = { ...exported, ...local };
    setReviewDecisions(merged);
    setLocalReviewDecisions(local);
    setIgnoredMalformedLocalDecisions(stored.ignoredMalformed);
    setLoadedDecisionSummary(loadedReviewDecisionSummary(report.reviewItems, report.reviewDecisions));
  }, [report?.reportPath]);

  useEffect(() => {
    if (!report) {
      setStatusFilter("all");
      setThemeFilter("all");
      setKindFilter("all");
      return;
    }

    const filters = normalizeReportFilters(readReportFilters(report), {
      statuses: uniqueReportValues(report.reviewItems, (item) => item.status),
      themes: uniqueReportValues(report.reviewItems, (item) => item.theme),
      kinds: uniqueReportValues(report.reviewItems, (item) => item.kind),
    });
    setStatusFilter(filters.status);
    setThemeFilter(filters.theme);
    setKindFilter(filters.kind);
  }, [report?.reportPath]);

  useEffect(() => {
    if (!report) return;

    window.localStorage.setItem(
      reportFilterStorageKey(report),
      JSON.stringify({
        status: statusFilter,
        theme: themeFilter,
        kind: kindFilter,
      } satisfies ReportFilterState),
    );
  }, [kindFilter, report?.reportPath, statusFilter, themeFilter]);

  async function runReportAction(action: () => Promise<void>) {
    if (!isTauriRuntime()) {
      setActionError("Open report actions are available in the desktop app.");
      return;
    }

    try {
      await action();
      setActionError(null);
    } catch (caught) {
      setActionError(String(caught));
    }
  }

  function setReviewDecision(item: ScreenshotReviewItem, decision: ReviewDecision | null) {
    if (!report) return;

    const key = reviewItemKey(item);
    const next = { ...reviewDecisions };
    const nextLocal = { ...localReviewDecisions };
    if (decision) {
      next[key] = decision;
      nextLocal[key] = decision;
    } else {
      delete next[key];
      delete nextLocal[key];
    }

    setReviewDecisions(next);
    setLocalReviewDecisions(nextLocal);
    window.localStorage.setItem(reportReviewStorageKey(report), JSON.stringify(nextLocal));
  }

  function clearStaleReviewDecisions() {
    if (!report) return;

    const next = pruneReviewDecisions(report.reviewItems, reviewDecisions);
    const nextLocal = pruneReviewDecisions(report.reviewItems, localReviewDecisions);
    setReviewDecisions(next);
    setLocalReviewDecisions(nextLocal);
    window.localStorage.setItem(reportReviewStorageKey(report), JSON.stringify(nextLocal));
  }

  async function exportReviewDecisions() {
    if (!report) return;

    const payload = reviewDecisionExportPayload(report, reviewDecisions);

    if (!isTauriRuntime()) {
      downloadJson(`review-decisions-${report.baselineSnapshotId}-to-${report.latestSnapshotId}.json`, payload);
      setExportMessage(`Downloaded ${payload.decisions.length} review decisions.`);
      setActionError(null);
      return;
    }

    try {
      const result = await invoke<ScreenshotReviewExportResult>("export_screenshot_review_decisions", { export: payload });
      setExportMessage(`Exported ${result.decisionCount} review decisions to ${result.path}`);
      setActionError(null);
    } catch (caught) {
      setExportMessage(null);
      setActionError(String(caught));
    }
  }

  function resetReportFilters() {
    setStatusFilter("all");
    setThemeFilter("all");
    setKindFilter("all");
  }

  if (error) {
    return (
      <div className="report-panel">
        <p className="catalog-error">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="report-panel">
        <p className="catalog-note">No screenshot comparison report is available yet.</p>
      </div>
    );
  }

  const counts: ReportCountCard[] = [
    { label: "Added", status: "added", value: report.summary.added },
    { label: "Removed", status: "removed", value: report.summary.removed },
    { label: "Changed", status: "changed", value: report.summary.changed },
    { label: "Tolerated", status: "tolerated", value: report.summary.tolerated },
    { label: "Unchanged", value: report.summary.unchanged },
    { label: "Total", value: report.summary.totalCompared },
  ];
  const currentDecisions = report.reviewItems.map((item) => reviewDecisions[reviewItemKey(item)] ?? null);
  const currentReviewItemKeys = new Set(report.reviewItems.map(reviewItemKey));
  const staleLocalDecisionCount = Object.keys(localReviewDecisions).filter((key) => !currentReviewItemKeys.has(key)).length;
  const acceptedCount = currentDecisions.filter((decision) => decision === "accepted").length;
  const dismissedCount = currentDecisions.filter((decision) => decision === "dismissed").length;
  const reviewedCount = acceptedCount + dismissedCount;
  const reportReviewStatus = reviewedReportStatus({
    acceptedCount,
    dismissedCount,
    fallbackDetail: report.statusDetail,
    fallbackStatus: report.status,
    fallbackTitle: report.statusTitle,
    total: report.reviewItems.length,
  });
  const statusOptions = uniqueReportValues(report.reviewItems, (item) => item.status);
  const themeOptions = uniqueReportValues(report.reviewItems, (item) => item.theme);
  const kindOptions = uniqueReportValues(report.reviewItems, (item) => item.kind);
  const themeTotals = reportReviewTotals(report.reviewItems, (item) => item.theme);
  const kindTotals = reportReviewTotals(report.reviewItems, (item) => item.kind);
  const filteredReviewItems = filterReportReviewItems(report.reviewItems, {
    kind: kindFilter,
    status: statusFilter,
    theme: themeFilter,
  });
  const hasActiveReportFilters = statusFilter !== "all" || themeFilter !== "all" || kindFilter !== "all";
  const reviewItemCountLabel = hasActiveReportFilters
    ? `${filteredReviewItems.length} of ${report.reviewItems.length} shown`
    : `${report.reviewItems.length} total`;
  const loadedDecisionMessage = loadedReviewDecisionMessage(loadedDecisionSummary);
  const reviewSourceMessage = reviewDecisionSourceMessage(
    reviewDecisionSourceSummary(report.reviewItems, report.reviewDecisions, localReviewDecisions),
  );
  const localDecisionWarningMessage = storedReviewDecisionWarningMessage(ignoredMalformedLocalDecisions);
  const emptyProgressCopy = emptyReviewProgressCopy();
  const staleLocalActionLabel = staleLocalDecisionActionLabel(staleLocalDecisionCount);

  return (
    <div className="report-panel">
      <section className={`report-status ${reportReviewStatus.status}`}>
        <span>Screenshot report</span>
        <strong>{reportReviewStatus.title}</strong>
        <p>{reportReviewStatus.detail}</p>
      </section>
      <section className="report-snapshot">
        <span>Snapshot</span>
        <strong>
          {report.baselineSnapshotId} to {report.latestSnapshotId}
        </strong>
        <small>{new Date(report.comparedAt).toLocaleString()}</small>
      </section>
      {reports.length > 1 && (
        <section className="report-history">
          <span>Recent reports</span>
          <div className="report-history-list">
            {reports.map((item) => (
              <button
                className={item.reportPath === report.reportPath ? "report-history-item active" : "report-history-item"}
                key={item.reportPath}
                onClick={() => onSelectReport(item)}
                type="button"
              >
                <strong>
                  {item.baselineSnapshotId} to {item.latestSnapshotId}
                </strong>
                <small>
                  {new Date(item.comparedAt).toLocaleString()} · {reportDeltaSummary(item)}
                </small>
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="report-count-grid">
        {counts.map((item) => {
          if (!item.status) {
            return (
            <section className="report-count" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </section>
            );
          }

          const status = item.status;
          return (
            <button
              className={statusFilter === status ? "report-count active" : "report-count"}
              key={item.label}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
              type="button"
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </button>
          );
        })}
      </div>
      {themeTotals.length > 0 && (
        <section className="report-breakdown">
          <span>Theme totals</span>
          <div className="report-breakdown-list">
            {themeTotals.map((item) => (
              <button
                className={themeFilter === item.label ? "report-breakdown-item active" : "report-breakdown-item"}
                key={item.label}
                onClick={() => setThemeFilter(themeFilter === item.label ? "all" : item.label)}
                type="button"
              >
                <strong>{item.label}</strong>
                <small>
                  {item.total} total · {item.changed} changed · {item.added} added · {item.removed} removed · {item.tolerated} tolerated
                </small>
              </button>
            ))}
          </div>
        </section>
      )}
      {kindTotals.length > 0 && (
        <section className="report-breakdown">
          <span>Kind totals</span>
          <div className="report-breakdown-list">
            {kindTotals.map((item) => (
              <button
                className={kindFilter === item.label ? "report-breakdown-item active" : "report-breakdown-item"}
                key={item.label}
                onClick={() => setKindFilter(kindFilter === item.label ? "all" : item.label)}
                type="button"
              >
                <strong>{item.label}</strong>
                <small>
                  {item.total} total · {item.changed} changed · {item.added} added · {item.removed} removed · {item.tolerated} tolerated
                </small>
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="report-snapshot">
        <span>Thresholds</span>
        <strong>{formatPercent(report.thresholds.pixelDiffRatio)}</strong>
        <small>Color distance {report.thresholds.pixelColorDistance}</small>
      </section>
      <section className="report-review-progress">
        <span>Review progress</span>
        {report.reviewItems.length > 0 ? (
          <>
            <strong>
              {reviewedCount} of {report.reviewItems.length}
            </strong>
            <small>
              {acceptedCount} accepted · {dismissedCount} dismissed
            </small>
            {reviewSourceMessage && <p className="report-review-source">{reviewSourceMessage}</p>}
            {localDecisionWarningMessage && <p className="report-review-storage-warning">{localDecisionWarningMessage}</p>}
            {loadedDecisionMessage && <p className="report-loaded-decisions">{loadedDecisionMessage}</p>}
            {staleLocalDecisionCount > 0 && (
              <button className="secondary-command" onClick={clearStaleReviewDecisions} type="button">
                {staleLocalActionLabel}
              </button>
            )}
            <button className="primary-command" disabled={reviewedCount === 0} onClick={exportReviewDecisions} type="button">
              Export Decisions
            </button>
            {exportMessage && <p>{exportMessage}</p>}
          </>
        ) : (
          <>
            <strong>{emptyProgressCopy.title}</strong>
            <small>{emptyProgressCopy.detail}</small>
          </>
        )}
      </section>
      <section className="report-items">
        <div className="report-items-header">
          <div>
            <span>Review items</span>
            {report.reviewItems.length > 0 && <small>{reviewItemCountLabel}</small>}
          </div>
          {report.reviewItems.length > 0 && (
            <button
              aria-label="Reset report filters"
              className="icon-command"
              disabled={!hasActiveReportFilters}
              onClick={resetReportFilters}
              title="Reset filters"
              type="button"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
        {report.reviewItems.length > 0 && (
          <div className="report-filters">
            <label>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Theme
              <select value={themeFilter} onChange={(event) => setThemeFilter(event.target.value)}>
                <option value="all">All</option>
                {themeOptions.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kind
              <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>
                <option value="all">All</option>
                {kindOptions.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {report.reviewItems.length ? (
          filteredReviewItems.length ? (
          filteredReviewItems.map((item) => {
            const decision = reviewDecisions[reviewItemKey(item)] ?? null;
            return (
            <article className={`report-item ${item.status} ${decision ?? ""}`} key={`${item.status}-${item.relativePath}`}>
              <div>
                <strong>{item.name}</strong>
                <small>
                  {item.status} · {item.theme} · {item.kind}
                  {item.changedRatio !== null ? ` · ${formatPercent(item.changedRatio)}` : ""}
                  {decision ? ` · ${decision}` : ""}
                </small>
              </div>
              <code>{item.relativePath}</code>
              <div className="report-decision-actions">
                <button
                  className={decision === "accepted" ? "secondary-command active" : "secondary-command"}
                  onClick={() => setReviewDecision(item, decision === "accepted" ? null : "accepted")}
                  type="button"
                >
                  Accept
                </button>
                <button
                  className={decision === "dismissed" ? "secondary-command active" : "secondary-command"}
                  onClick={() => setReviewDecision(item, decision === "dismissed" ? null : "dismissed")}
                  type="button"
                >
                  Dismiss
                </button>
              </div>
              <div className="report-item-actions">
                {item.previewPath && (
                  <button className="secondary-command" onClick={() => runReportAction(() => openPath(item.previewPath as string))} type="button">
                    Preview
                  </button>
                )}
                {item.diffPath && (
                  <button className="secondary-command" onClick={() => runReportAction(() => openPath(item.diffPath as string))} type="button">
                    Diff
                  </button>
                )}
                {item.baselinePath && (
                  <button className="secondary-command" onClick={() => runReportAction(() => openPath(item.baselinePath as string))} type="button">
                    Baseline
                  </button>
                )}
                {item.latestPath && item.latestPath !== item.previewPath && (
                  <button className="secondary-command" onClick={() => runReportAction(() => openPath(item.latestPath as string))} type="button">
                    Latest
                  </button>
                )}
              </div>
            </article>
            );
          })
          ) : (
            <p>No review items match the selected filters.</p>
          )
        ) : (
          <p>No changed, added, removed, or tolerated previews.</p>
        )}
      </section>
      <section className="report-links">
        <span>Files</span>
        <div className="report-actions">
          <button className="secondary-command" onClick={() => runReportAction(() => openPath(report.htmlReportPath))} type="button">
            <FileCode2 size={15} />
            HTML
          </button>
          <button className="secondary-command" onClick={() => runReportAction(() => openPath(report.markdownReportPath))} type="button">
            <FileCode2 size={15} />
            Markdown
          </button>
          <button className="secondary-command" onClick={() => runReportAction(() => openPath(report.reportPath))} type="button">
            <FileCode2 size={15} />
            JSON
          </button>
          <button className="secondary-command" onClick={() => runReportAction(() => revealItemInDir(report.htmlReportPath))} type="button">
            <FolderOpen size={15} />
            Folder
          </button>
        </div>
        {actionError && <p className="catalog-error">{actionError}</p>}
        <code>{report.htmlReportPath}</code>
        <code>{report.markdownReportPath}</code>
        <code>{report.reportPath}</code>
      </section>
    </div>
  );
}

type ReportCountCard = {
  label: string;
  value: number;
  status?: ScreenshotReviewItem["status"];
};

type ReportFilterState = ReportReviewFilters;

function boardGroupCardDomId(groupId: string) {
  return `group-board-card-${groupId}`;
}

function duplicateBoardFilterStorageKey() {
  return "theme-preview-duplicate-board-filter";
}

function readDuplicateBoardFilter() {
  return parseDuplicateBoardFilter(window.localStorage.getItem(duplicateBoardFilterStorageKey()));
}

function reportReviewStorageKey(report: ScreenshotReportSummary) {
  return `theme-preview-report-review:${report.reportPath}`;
}

function reportFilterStorageKey(report: ScreenshotReportSummary) {
  return `theme-preview-report-filters:${report.reportPath}`;
}

function readReportFilters(report: ScreenshotReportSummary): ReportFilterState {
  return parseReportFilters(window.localStorage.getItem(reportFilterStorageKey(report)));
}

function readStoredReviewDecisions(report: ScreenshotReportSummary) {
  return parseStoredReviewDecisionResult(window.localStorage.getItem(reportReviewStorageKey(report)));
}

function reportDeltaSummary(report: ScreenshotReportSummary) {
  const changed = report.summary.added + report.summary.removed + report.summary.changed;
  if (changed > 0) return `${changed} need review`;
  if (report.summary.tolerated > 0) return `${report.summary.tolerated} tolerated`;
  return "all clear";
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function runtimeTitle(status: EnvironmentStatus) {
  const duckdb = status.duckdbVersion ?? "DuckDB unavailable";
  const ollama = status.ollamaVersion ?? "Ollama unavailable";

  return `${status.message}\n${duckdb}\n${ollama}\nModel: ${status.embeddingModel}`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(3)}%`;
}

function PropControl({
  prop,
  value,
  onChange,
}: {
  prop: ComponentProp;
  value: string;
  onChange: (value: string) => void;
}) {
  if (prop.kind === "boolean") {
    return (
      <label className="toggle-control">
        <span>{prop.label}</span>
        <input
          checked={booleanValue(value)}
          onChange={(event) => onChange(String(event.currentTarget.checked))}
          type="checkbox"
        />
      </label>
    );
  }

  if (prop.kind === "enum") {
    return (
      <label className="field-control">
        <span>{prop.label}</span>
        <select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
          {prop.values.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field-control">
      <span>{prop.label}</span>
      <input
        min={0}
        onChange={(event) => onChange(event.currentTarget.value)}
        type={prop.kind === "number" ? "number" : "text"}
        value={value}
      />
    </label>
  );
}

function PreviewRenderer({ component, props }: { component: string; props: Record<string, string> }) {
  if (component === "button") {
    return <PreviewButton props={props} />;
  }

  if (component === "card") {
    return <PreviewCard props={props} />;
  }

  if (component === "badge") {
    return <PreviewBadge props={props} />;
  }

  if (component === "input") {
    return <PreviewInput props={props} />;
  }

  if (component === "toggle") {
    return <PreviewToggle props={props} />;
  }

  if (component === "tabs") {
    return <PreviewTabs props={props} />;
  }

  if (component === "table-control") {
    return <PreviewTableControl props={props} />;
  }

  return <PreviewImportedComponent props={props} />;
}

function GroupPreview({
  group,
  componentFiles,
  variantFiles,
  compact = false,
}: {
  group: GroupFile;
  componentFiles: Record<string, ComponentFile>;
  variantFiles: Record<string, VariantFile>;
  compact?: boolean;
}) {
  return (
    <section className={`group-preview ${group.group.layout} ${compact ? "compact" : ""}`}>
      {group.items.map((item) => {
        if (groupItemKind(item) === "variant") {
          const variant = item.variant ? variantFiles[item.variant] : null;

          return (
            <article className="group-preview-item" key={`variant-${item.variant}-${item.role}`}>
              <header>
                <span>{item.role}</span>
                <strong>{variant?.variant.name ?? item.variant}</strong>
              </header>
              {variant ? (
                <VariantPreview variant={variant} componentFiles={componentFiles} compact />
              ) : (
                <Loader2 className="spin" size={20} />
              )}
            </article>
          );
        }

        const component = componentFiles[item.component];
        const state = component?.states.find((candidate) => candidate.id === item.state);
        const props = state ? { ...defaultProps(component), ...state.props } : {};

        return (
          <article className="group-preview-item" key={`${item.component}-${item.state}`}>
            <header>
              <span>{item.role}</span>
              <strong>{component?.component.name ?? item.component}</strong>
            </header>
            {component ? (
              <PreviewRenderer component={component.component.id} props={props} />
            ) : (
              <Loader2 className="spin" size={20} />
            )}
          </article>
        );
      })}
    </section>
  );
}

function VariantPreview({
  variant,
  componentFiles,
  compact = false,
}: {
  variant: VariantFile;
  componentFiles: Record<string, ComponentFile>;
  compact?: boolean;
}) {
  const component = componentFiles[variant.variant.component];
  const state = component?.states.find((candidate) => candidate.id === variant.variant.state);
  const props = { ...(component ? defaultProps(component) : {}), ...(state?.props ?? {}), ...variant.props };
  const slots = Object.fromEntries(variant.slots.map((slot) => [slot.name, slot]));

  if (variant.variant.component === "card") {
    return (
      <article className={`variant-card ${compact ? "compact" : ""}`}>
        {slots.media && <div className="variant-card-media">{slots.media.value}</div>}
        <div className="variant-card-body">
          <header>
            {slots.badge && <span className="sample-badge info soft">{slots.badge.value}</span>}
            <h3>{slots.header?.value ?? props.title ?? variant.variant.name}</h3>
          </header>
          {slots.divider && <span className="variant-divider" />}
          <p>{slots.body?.value ?? variant.variant.description}</p>
          {slots.metadata && <small>{slots.metadata.value}</small>}
          {slots.action && <button type="button">{slots.action.value}</button>}
        </div>
      </article>
    );
  }

  return (
    <section className={`variant-preview ${compact ? "compact" : ""}`}>
      <header>
        <span>{variant.variant.component}:{variant.variant.state}</span>
        <strong>{variant.variant.name}</strong>
      </header>
      {component ? <PreviewRenderer component={component.component.id} props={props} /> : <Loader2 className="spin" size={20} />}
      {variant.slots.length > 0 && (
        <div className="variant-slots">
          {variant.slots.map((slot) => (
            <span key={`${slot.name}-${slot.kind}`}>
              {slot.name}: {slot.value}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function PagePreview({
  page,
  groupFiles,
  variantFiles,
  componentFiles,
}: {
  page: PageFile;
  groupFiles: Record<string, GroupFile>;
  variantFiles: Record<string, VariantFile>;
  componentFiles: Record<string, ComponentFile>;
}) {
  return (
    <section className="page-preview">
      <header className="page-preview-title">
        <span>{page.page.route}</span>
        <h3>{page.page.name}</h3>
      </header>
      {page.regions.map((region) => (
        <section className={`page-region ${region.layout}`} key={region.id}>
          <header>
            <span>{region.label}</span>
            <small>{region.layout}</small>
          </header>
          <div className="page-region-blocks">
            {region.blocks.map((block) => {
              const key = `${region.id}-${block.kind}-${block.reference}-${block.role}`;
              if (block.kind === "variant") {
                const variant = variantFiles[block.reference];
                return (
                  <article className={`page-block ${block.layout}`} key={key}>
                    <span>{block.role}</span>
                    {variant ? <VariantPreview variant={variant} componentFiles={componentFiles} compact /> : <p>{block.reference} missing</p>}
                  </article>
                );
              }

              const group = groupFiles[block.reference];
              return (
                <article className={`page-block ${block.layout}`} key={key}>
                  <span>{block.role}</span>
                  {group ? <GroupPreview group={group} componentFiles={componentFiles} variantFiles={variantFiles} compact /> : <p>{block.reference} missing</p>}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}

function GroupBoard({
  duplicateGroups,
  groups,
  groupFiles,
  componentFiles,
  variantFiles,
  highlightedGroupId,
  showDuplicatesOnly,
  onShowDuplicatesOnlyChange,
  onSelect,
}: {
  duplicateGroups: DuplicateGroupFinding[];
  groups: GroupSummary[];
  groupFiles: Record<string, GroupFile>;
  componentFiles: Record<string, ComponentFile>;
  variantFiles: Record<string, VariantFile>;
  highlightedGroupId: string | null;
  showDuplicatesOnly: boolean;
  onShowDuplicatesOnlyChange: (showDuplicatesOnly: boolean) => void;
  onSelect: (groupId: string) => void;
}) {
  const visibleGroups = filterDuplicateGroupSummaries(groups, duplicateGroups, showDuplicatesOnly);

  return (
    <section className="group-board-shell">
      <header className="group-board-toolbar">
        <label>
          <input
            checked={showDuplicatesOnly}
            onChange={(event) => onShowDuplicatesOnlyChange(event.currentTarget.checked)}
            type="checkbox"
          />
          Duplicate structures only
        </label>
        <small>
          {visibleGroups.length} of {groups.length} groups shown
        </small>
      </header>
      <div className="group-board">
      {visibleGroups.map((summary) => {
        const group = groupFiles[summary.id];
        const duplicateFinding = duplicateGroups.find((finding) => finding.groupIds.includes(summary.id));
        const duplicateBadgeLabel = duplicateGroupBadgeLabel(duplicateFinding);

        return (
          <article
            className={summary.id === highlightedGroupId ? "board-card highlighted" : "board-card"}
            id={boardGroupCardDomId(summary.id)}
            key={summary.id}
          >
            <header>
              <div>
                <span>{summary.layout}</span>
                <h3>{summary.name}</h3>
                {duplicateBadgeLabel && <em className="duplicate-badge">{duplicateBadgeLabel}</em>}
              </div>
              <button onClick={() => onSelect(summary.id)} type="button">
                Open
              </button>
            </header>
            <p>{summary.description}</p>
            {group ? (
              <GroupPreview group={group} componentFiles={componentFiles} variantFiles={variantFiles} compact />
            ) : (
              <Loader2 className="spin" size={22} />
            )}
          </article>
        );
      })}
      {!visibleGroups.length && <p className="board-empty">No duplicate group structures found.</p>}
      </div>
    </section>
  );
}

function PreviewButton({ props }: { props: Record<string, string> }) {
  const loading = booleanValue(props.loading);

  return (
    <div className="preview-cluster">
      <button
        className={`sample-button ${props.variant ?? "primary"} ${props.size ?? "medium"}`}
        disabled={booleanValue(props.disabled)}
        type="button"
      >
        {loading && <Loader2 className="spin" size={17} />}
        <Save size={17} />
        {props.label}
      </button>
      <p className="preview-note">variant={props.variant} · size={props.size}</p>
    </div>
  );
}

function PreviewCard({ props }: { props: Record<string, string> }) {
  return (
    <article className={`sample-card ${props.density ?? "comfortable"} ${props.tone ?? "neutral"}`}>
      <header>
        <span>{props.tone}</span>
        <strong>{props.metric}%</strong>
      </header>
      <h3>{props.title}</h3>
      <p>Component state coverage is tracked from explicit metadata.</p>
      {booleanValue(props.showFooter) && (
        <footer>
          <span>3 checks</span>
          <button type="button">Review</button>
        </footer>
      )}
    </article>
  );
}

function PreviewBadge({ props }: { props: Record<string, string> }) {
  return (
    <div className="badge-stage">
      <span className={`sample-badge ${props.tone ?? "info"} ${props.emphasis ?? "soft"}`}>{props.label}</span>
      <span className="sample-badge info soft">React</span>
      <span className="sample-badge warning soft">Svelte later</span>
    </div>
  );
}

function PreviewInput({ props }: { props: Record<string, string> }) {
  const status = props.status ?? "default";

  return (
    <label className={`sample-input ${status} ${booleanValue(props.disabled) ? "disabled" : ""}`}>
      <span>{props.label}</span>
      <input
        disabled={booleanValue(props.disabled)}
        placeholder={props.placeholder}
        readOnly
        type="text"
        value={props.value ?? ""}
      />
      <small>{props.helper}</small>
    </label>
  );
}

function PreviewToggle({ props }: { props: Record<string, string> }) {
  const checked = booleanValue(props.checked);

  return (
    <button
      className={`sample-toggle ${props.tone ?? "default"} ${checked ? "checked" : ""}`}
      disabled={booleanValue(props.disabled)}
      type="button"
    >
      <span className="toggle-copy">
        <strong>{props.label}</strong>
        <small>{props.description}</small>
      </span>
      <span className="toggle-track" aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

function PreviewTabs({ props }: { props: Record<string, string> }) {
  const active = props.active ?? "overview";
  const disabled = booleanValue(props.disabled);
  const tabs = [
    { id: "overview", label: props.overviewLabel ?? "Overview" },
    { id: "tokens", label: props.tokensLabel ?? "Tokens" },
    { id: "groups", label: props.groupsLabel ?? "Groups" },
  ];

  return (
    <div className={`sample-tabs ${disabled ? "disabled" : ""}`} role="tablist" aria-label="Preview tabs">
      {tabs.map((tab) => (
        <button
          aria-selected={tab.id === active}
          className={tab.id === active ? "active" : ""}
          disabled={disabled}
          key={tab.id}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function PreviewTableControl({ props }: { props: Record<string, string> }) {
  return (
    <div className={`sample-table-control ${props.tone ?? "neutral"}`}>
      <header>
        <strong>{props.label}</strong>
        <span>{props.rows} rows</span>
      </header>
      <dl>
        <div>
          <dt>Page</dt>
          <dd>{props.page}</dd>
        </div>
        <div>
          <dt>Sort</dt>
          <dd>{props.sort}</dd>
        </div>
        <div>
          <dt>Selected</dt>
          <dd>{props.selected}</dd>
        </div>
      </dl>
    </div>
  );
}

function PreviewImportedComponent({ props }: { props: Record<string, string> }) {
  return (
    <article className="sample-imported-component">
      <header>
        <span>{props.adapter ?? "adapter"}</span>
        <strong>{props.label ?? "Imported Component"}</strong>
      </header>
      <p>{props.source ?? "External source"}</p>
      <dl>
        <div>
          <dt>Type</dt>
          <dd>{props.itemType ?? "component"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{props.previewStatus ?? "indexed"}</dd>
        </div>
      </dl>
      <small>{props.files ?? "No source files recorded"}</small>
      <small>{props.materializedFiles ?? "No local import files recorded"}</small>
      <small>{props.dependencies ?? "No dependencies recorded"}</small>
    </article>
  );
}

function LoadingRows() {
  return (
    <>
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </>
  );
}

export default App;
