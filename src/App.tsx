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
  Save,
  Search,
  ShieldCheck,
  Sun,
  SwatchBook,
  Zap,
} from "lucide-react";
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
  component: string;
  state: string;
  role: string;
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

type CatalogResult = {
  id: string;
  recordType: "component" | "theme" | "group";
  title: string;
  body: string;
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

const groupLayouts: GroupLayout[] = ["row", "grid", "stack", "toolbar", "form-row", "dialog-footer", "table-header"];
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
      return null as T;
    case "export_screenshot_review_decisions":
      throw new Error("Review decision export is available in the desktop app.");
    default:
      throw new Error(`Browser preview does not support command: ${command}`);
  }
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
  return readBrowserMetadata<ComponentFile>("components");
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

  const validation = validateGroupAgainstComponents(saved, listBrowserComponentFiles());
  if (validation.issues.some((issue) => issue.severity === "error")) {
    const details = validation.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.title)
      .join(", ");
    throw new Error(`Group has blocking validation issues: ${details}`);
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
  const recordCount = listBrowserComponents().length + listBrowserGroups().length + listBrowserThemes().length;

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
      .map((item) => `${item.role} uses ${item.component}:${item.state}`)
      .join(", ")}. Themes: ${group.group.themes.join(", ")}.`,
  }));

  return [...components, ...themes, ...groups].sort((left, right) => left.recordType.localeCompare(right.recordType) || left.title.localeCompare(right.title));
}

function validateGroupAgainstComponents(group: GroupFile, components: ComponentFile[]): GroupValidation {
  const issues: GroupValidationIssue[] = [];
  const componentMap = new Map(components.map((component) => [component.component.id, component]));
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
    if (!item.role.trim()) {
      issues.push({
        severity: "warning",
        title: "Missing role label",
        detail: `${item.component}:${item.state} does not describe what it does in the area.`,
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

function readBrowserMetadata<T>(kind: "components" | "groups" | "themes"): T[] {
  return Object.entries(metadataModules)
    .filter(([path]) => path.includes(`/metadata/${kind}/`) || path.includes(`\\metadata\\${kind}\\`))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, content]) => parseToml(content) as T);
}

function parseToml(content: string): TomlObject {
  const root: TomlObject = {};
  let target: TomlObject = root;

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const arrayMatch = trimmed.match(/^\[\[(.+)\]\]$/);
    if (arrayMatch) {
      const key = camelCase(arrayMatch[1]);
      const items = (root[key] as TomlObject[] | undefined) ?? [];
      target = {};
      items.push(target);
      root[key] = items;
      return;
    }

    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      const key = camelCase(sectionMatch[1]);
      target = {};
      root[key] = target;
      return;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) return;

    const key = camelCase(trimmed.slice(0, separator).trim());
    target[key] = parseTomlValue(trimmed.slice(separator + 1).trim());
  });

  return root;
}

function parseTomlValue(value: string): TomlValue {
  if (value.startsWith('"') && value.endsWith('"')) {
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

function clone<T>(value: T): T {
  return structuredClone(value);
}

function App() {
  const [components, setComponents] = useState<ComponentSummary[]>([]);
  const [componentFiles, setComponentFiles] = useState<Record<string, ComponentFile>>({});
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupFiles, setGroupFiles] = useState<Record<string, GroupFile>>({});
  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [activeLibrary, setActiveLibrary] = useState<"components" | "groups">("components");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState("button");
  const [selectedGroupId, setSelectedGroupId] = useState("settings-row");
  const [selectedThemeId, setSelectedThemeId] = useState("light");
  const [component, setComponent] = useState<ComponentFile | null>(null);
  const [group, setGroup] = useState<GroupFile | null>(null);
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
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogType, setCatalogType] = useState("all");
  const [catalogResults, setCatalogResults] = useState<CatalogResult[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [screenshotReport, setScreenshotReport] = useState<ScreenshotReportSummary | null>(null);
  const [screenshotReportError, setScreenshotReportError] = useState<string | null>(null);
  const [isGroupComposerOpen, setIsGroupComposerOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupFile>(() => emptyGroupDraft());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [groupValidation, setGroupValidation] = useState<GroupValidation | null>(null);
  const [draftValidation, setDraftValidation] = useState<GroupValidation | null>(null);
  const [hasReviewedDraftWarnings, setHasReviewedDraftWarnings] = useState(false);

  useEffect(() => {
    async function boot() {
      try {
        const [componentList, groupList, themeList, environment, latestReport] = await Promise.all([
          invoke<ComponentSummary[]>("list_components"),
          invoke<GroupSummary[]>("list_groups"),
          invoke<ThemeSummary[]>("list_themes"),
          invoke<EnvironmentStatus>("initialize_local_index"),
          invoke<ScreenshotReportSummary | null>("latest_screenshot_report"),
        ]);

        setComponents(componentList);
        setGroups(groupList);
        setThemes(themeList);
        setStatus(environment);
        setScreenshotReport(latestReport);
        setSelectedComponentId(componentList[0]?.id ?? "button");
        setSelectedGroupId(groupList[0]?.id ?? "settings-row");
        setSelectedThemeId(themeList[0]?.id ?? "light");
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
    if (!selectedGroupId) return;

    invoke<GroupFile>("load_group", { groupId: selectedGroupId })
      .then((loaded) => {
        setGroup(loaded);
        setError(null);
      })
      .catch((caught) => setError(String(caught)));
  }, [selectedGroupId]);

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
    setHasReviewedDraftWarnings(false);
    setSaveMessage(null);
  }, [groupDraft]);

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
  const visualChecks = useMemo(
    () =>
      buildVisualChecks({
        component: activeLibrary === "components" ? component : null,
        group: activeLibrary === "groups" && !isGroupBoardOpen ? group : null,
        groupValidation,
        props: propValues,
        theme,
      }),
    [activeLibrary, component, group, groupValidation, isGroupBoardOpen, propValues, theme],
  );

  function applyState(state: ComponentState) {
    setSelectedStateId(state.id);
    setPropValues({ ...defaultProps(component), ...state.props });
  }

  function updateProp(id: string, value: string) {
    setSelectedStateId(null);
    setPropValues((current) => ({ ...current, [id]: value }));
  }

  function openCatalogResult(result: CatalogResult) {
    const [, id] = result.id.split(":");

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

    if (result.recordType === "theme") {
      setSelectedThemeId(id);
    }
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
    setSaveMessage(null);
  }

  async function toggleReportPanel() {
    const nextIsOpen = !isReportOpen;
    setIsReportOpen(nextIsOpen);
    if (!nextIsOpen) return;

    setIsCatalogOpen(false);
    setIsGroupComposerOpen(false);

    try {
      const latestReport = await invoke<ScreenshotReportSummary | null>("latest_screenshot_report");
      setScreenshotReport(latestReport);
      setScreenshotReportError(null);
    } catch (caught) {
      setScreenshotReport(null);
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

  const activeTitle =
    isGroupComposerOpen
      ? editingGroupId
        ? "Edit Group"
        : "New Group"
      : activeLibrary === "groups" && isGroupBoardOpen
      ? "Group Board"
      : activeLibrary === "groups"
      ? group?.group.name ?? "Loading"
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
            }}
            title="Catalog search"
            type="button"
          >
            <Search size={18} />
          </button>
          <button className={`icon-button ${isReportOpen ? "active" : ""}`} onClick={toggleReportPanel} title="Screenshot report" type="button">
            <FileCode2 size={18} />
          </button>
          <button className={`icon-button ${isGroupComposerOpen ? "active" : ""}`} onClick={() => startGroupComposer()} title="New group" type="button">
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
            {activeLibrary === "components" ? <Search size={17} /> : <GalleryHorizontalEnd size={17} />}
            <span>{activeLibrary === "components" ? "Components" : "Groups"}</span>
          </div>
          <div className="library-tabs" aria-label="Library mode">
            <button
              className={activeLibrary === "components" ? "active" : ""}
              onClick={() => setActiveLibrary("components")}
              type="button"
            >
              Components
            </button>
            <button className={activeLibrary === "groups" ? "active" : ""} onClick={() => setActiveLibrary("groups")} type="button">
              Groups
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
            {activeLibrary === "components"
              ? filteredComponents.map((item) => (
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
              : filteredGroups.map((item) => (
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
                ))}
            {!isLoading && activeLibrary === "components" && !filteredComponents.length && <p className="catalog-note">No matching components.</p>}
            {!isLoading && activeLibrary === "groups" && !filteredGroups.length && <p className="catalog-note">No matching groups.</p>}
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
            {activeLibrary === "groups" && isGroupBoardOpen ? (
              <GroupBoard
                groups={groups}
                groupFiles={groupFiles}
                componentFiles={componentFiles}
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
                      <GroupPreview group={group} componentFiles={componentFiles} compact />
                    </div>
                  </section>
                ))}
              </div>
            ) : activeLibrary === "groups" && group ? (
              <GroupPreview group={group} componentFiles={componentFiles} />
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
            {activeLibrary === "groups" && isGroupBoardOpen
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
          {isGroupComposerOpen ? (
            <GroupComposer
              componentFiles={componentFiles}
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
            <ScreenshotReportPanel error={screenshotReportError} report={screenshotReport} />
          ) : activeLibrary === "groups" && isGroupBoardOpen ? (
            <BoardInspector groups={groups} />
          ) : activeLibrary === "groups" && group ? (
            <GroupInspector
              group={group}
              componentFiles={componentFiles}
              validation={groupValidation}
              visualChecks={visualChecks}
              onCopy={() => startGroupComposer("copy")}
              onEdit={() => startGroupComposer("edit")}
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
  group,
  componentFiles,
  validation,
  visualChecks,
  onCopy,
  onEdit,
}: {
  group: GroupFile;
  componentFiles: Record<string, ComponentFile>;
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
      <ValidationPanel validation={validation} />
      <VisualCheckPanel checks={visualChecks} />
      {group.items.map((item) => {
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

function GroupComposer({
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
          component: component.component.id,
          state: component.states[0]?.id ?? "",
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
  props,
  theme,
}: {
  component: ComponentFile | null;
  group: GroupFile | null;
  groupValidation: GroupValidation | null;
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
      checks.push(contrastCheck("Button text contrast", "#ffffff", background, 4.5));

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

function BoardInspector({ groups }: { groups: GroupSummary[] }) {
  const itemCount = groups.reduce((total, group) => total + group.itemCount, 0);
  const layouts = Array.from(new Set(groups.map((group) => group.layout))).join(", ");

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
      <section className="group-item-card">
        <span>Layouts</span>
        <strong>{layouts}</strong>
        <small>Defined in TOML</small>
      </section>
    </div>
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
          <option value="group">groups</option>
          <option value="theme">themes</option>
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

function ScreenshotReportPanel({ error, report }: { error: string | null; report: ScreenshotReportSummary | null }) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, ReviewDecision>>({});

  useEffect(() => {
    if (!report) {
      setReviewDecisions({});
      return;
    }

    const raw = window.localStorage.getItem(reportReviewStorageKey(report));
    const exported = Object.fromEntries(report.reviewDecisions.map((item) => [item.key, item.decision]));
    const local = raw ? JSON.parse(raw) : {};
    const merged = { ...exported, ...local };
    setReviewDecisions(merged);
    if (Object.keys(merged).length) {
      window.localStorage.setItem(reportReviewStorageKey(report), JSON.stringify(merged));
    }
  }, [report?.reportPath]);

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
    if (decision) {
      next[key] = decision;
    } else {
      delete next[key];
    }

    setReviewDecisions(next);
    window.localStorage.setItem(reportReviewStorageKey(report), JSON.stringify(next));
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

  const counts: Array<[string, number]> = [
    ["Added", report.summary.added],
    ["Removed", report.summary.removed],
    ["Changed", report.summary.changed],
    ["Tolerated", report.summary.tolerated],
    ["Unchanged", report.summary.unchanged],
    ["Total", report.summary.totalCompared],
  ];
  const acceptedCount = Object.values(reviewDecisions).filter((decision) => decision === "accepted").length;
  const dismissedCount = Object.values(reviewDecisions).filter((decision) => decision === "dismissed").length;
  const reviewedCount = acceptedCount + dismissedCount;

  return (
    <div className="report-panel">
      <section className={`report-status ${report.status}`}>
        <span>Screenshot report</span>
        <strong>{report.statusTitle}</strong>
        <p>{report.statusDetail}</p>
      </section>
      <section className="report-snapshot">
        <span>Snapshot</span>
        <strong>
          {report.baselineSnapshotId} to {report.latestSnapshotId}
        </strong>
        <small>{new Date(report.comparedAt).toLocaleString()}</small>
      </section>
      <div className="report-count-grid">
        {counts.map(([label, value]) => (
          <section className="report-count" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </section>
        ))}
      </div>
      <section className="report-snapshot">
        <span>Thresholds</span>
        <strong>{formatPercent(report.thresholds.pixelDiffRatio)}</strong>
        <small>Color distance {report.thresholds.pixelColorDistance}</small>
      </section>
      {report.reviewItems.length > 0 && (
        <section className="report-review-progress">
          <span>Review progress</span>
          <strong>
            {reviewedCount} of {report.reviewItems.length}
          </strong>
          <small>
            {acceptedCount} accepted · {dismissedCount} dismissed
          </small>
          <button className="primary-command" disabled={reviewedCount === 0} onClick={exportReviewDecisions} type="button">
            Export Decisions
          </button>
          {exportMessage && <p>{exportMessage}</p>}
        </section>
      )}
      <section className="report-items">
        <span>Review items</span>
        {report.reviewItems.length ? (
          report.reviewItems.map((item) => {
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

type ReviewDecision = "accepted" | "dismissed";

function reportReviewStorageKey(report: ScreenshotReportSummary) {
  return `theme-preview-report-review:${report.reportPath}`;
}

function reviewItemKey(item: ScreenshotReviewItem) {
  return `${item.status}:${item.relativePath}`;
}

function reviewDecisionExportPayload(report: ScreenshotReportSummary, decisions: Record<string, ReviewDecision>) {
  const entries = Object.entries(decisions)
    .map(([key, decision]) => ({ key, decision }))
    .sort((left, right) => left.key.localeCompare(right.key));

  return {
    reportPath: report.reportPath,
    baselineSnapshotId: report.baselineSnapshotId,
    latestSnapshotId: report.latestSnapshotId,
    exportedAt: new Date().toISOString(),
    accepted: entries.filter((entry) => entry.decision === "accepted").length,
    dismissed: entries.filter((entry) => entry.decision === "dismissed").length,
    decisions: entries,
  };
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

  return <PreviewButton props={props} />;
}

function GroupPreview({
  group,
  componentFiles,
  compact = false,
}: {
  group: GroupFile;
  componentFiles: Record<string, ComponentFile>;
  compact?: boolean;
}) {
  return (
    <section className={`group-preview ${group.group.layout} ${compact ? "compact" : ""}`}>
      {group.items.map((item) => {
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

function GroupBoard({
  groups,
  groupFiles,
  componentFiles,
  onSelect,
}: {
  groups: GroupSummary[];
  groupFiles: Record<string, GroupFile>;
  componentFiles: Record<string, ComponentFile>;
  onSelect: (groupId: string) => void;
}) {
  return (
    <section className="group-board">
      {groups.map((summary) => {
        const group = groupFiles[summary.id];

        return (
          <article className="board-card" key={summary.id}>
            <header>
              <div>
                <span>{summary.layout}</span>
                <h3>{summary.name}</h3>
              </div>
              <button onClick={() => onSelect(summary.id)} type="button">
                Open
              </button>
            </header>
            <p>{summary.description}</p>
            {group ? (
              <GroupPreview group={group} componentFiles={componentFiles} compact />
            ) : (
              <Loader2 className="spin" size={22} />
            )}
          </article>
        );
      })}
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
