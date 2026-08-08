import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertTriangle,
  Check,
  Circle,
  Columns3,
  Database,
  FileCode2,
  GalleryHorizontalEnd,
  LayoutDashboard,
  Loader2,
  Moon,
  Palette,
  Plus,
  Save,
  Search,
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
  layout: "row" | "grid" | "stack";
  itemCount: number;
};

type GroupFile = {
  group: {
    id: string;
    name: string;
    description: string;
    layout: "row" | "grid" | "stack";
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

function App() {
  const [components, setComponents] = useState<ComponentSummary[]>([]);
  const [componentFiles, setComponentFiles] = useState<Record<string, ComponentFile>>({});
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupFiles, setGroupFiles] = useState<Record<string, GroupFile>>({});
  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [activeLibrary, setActiveLibrary] = useState<"components" | "groups">("components");
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
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogType, setCatalogType] = useState("all");
  const [catalogResults, setCatalogResults] = useState<CatalogResult[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isGroupComposerOpen, setIsGroupComposerOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState<GroupFile>(() => emptyGroupDraft());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [groupValidation, setGroupValidation] = useState<GroupValidation | null>(null);
  const [draftValidation, setDraftValidation] = useState<GroupValidation | null>(null);

  useEffect(() => {
    async function boot() {
      try {
        const [componentList, groupList, themeList, environment] = await Promise.all([
          invoke<ComponentSummary[]>("list_components"),
          invoke<GroupSummary[]>("list_groups"),
          invoke<ThemeSummary[]>("list_themes"),
          invoke<EnvironmentStatus>("initialize_local_index"),
        ]);

        setComponents(componentList);
        setGroups(groupList);
        setThemes(themeList);
        setStatus(environment);
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
        .then((validation) => setDraftValidation(validation))
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
  }, [groupDraft, isGroupComposerOpen]);

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
    }

    if (result.recordType === "group") {
      setActiveLibrary("groups");
      setSelectedGroupId(id);
      setIsGroupBoardOpen(false);
    }

    if (result.recordType === "theme") {
      setSelectedThemeId(id);
    }
  }

  function startGroupComposer(fromCurrent = false) {
    if (fromCurrent && group) {
      setGroupDraft({
        group: {
          ...group.group,
          name: `${group.group.name} Copy`,
          id: "",
        },
        items: group.items.map((item) => ({ ...item })),
      });
    } else {
      setGroupDraft(emptyGroupDraft());
    }

    setActiveLibrary("groups");
    setIsGroupBoardOpen(false);
    setIsCatalogOpen(false);
    setIsGroupComposerOpen(true);
    setSaveMessage(null);
  }

  async function saveGroupDraft() {
    try {
      const saved = await invoke<GroupFile>("save_group", { group: groupDraft });
      await refreshGroups();
      setSelectedGroupId(saved.group.id);
      setGroup(saved);
      setIsGroupComposerOpen(false);
      setSaveMessage(`Saved ${saved.group.name}`);
      const environment = await invoke<EnvironmentStatus>("initialize_local_index");
      setStatus(environment);
    } catch (caught) {
      setSaveMessage(String(caught));
    }
  }

  const activeTitle =
    activeLibrary === "groups" && isGroupBoardOpen
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
            }}
            title="Group board"
            type="button"
          >
            <LayoutDashboard size={18} />
          </button>
          <button
            className={`icon-button ${isCatalogOpen ? "active" : ""}`}
            onClick={() => setIsCatalogOpen((current) => !current)}
            title="Catalog search"
            type="button"
          >
            <Search size={18} />
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
          <div className="component-list">
            {activeLibrary === "components"
              ? components.map((item) => (
                  <button
                    className={`component-row ${item.id === selectedComponentId ? "selected" : ""}`}
                    key={item.id}
                    onClick={() => setSelectedComponentId(item.id)}
                    type="button"
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </span>
                    <em>{item.stateCount}</em>
                  </button>
                ))
              : groups.map((item) => (
                  <button
                    className={`component-row ${item.id === selectedGroupId && !isGroupBoardOpen ? "selected" : ""}`}
                    key={item.id}
                    onClick={() => {
                      setSelectedGroupId(item.id);
                      setIsGroupBoardOpen(false);
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
              message={saveMessage}
              validation={draftValidation}
              onCancel={() => setIsGroupComposerOpen(false)}
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
          ) : activeLibrary === "groups" && isGroupBoardOpen ? (
            <BoardInspector groups={groups} />
          ) : activeLibrary === "groups" && group ? (
            <GroupInspector group={group} componentFiles={componentFiles} validation={groupValidation} onCopy={() => startGroupComposer(true)} />
          ) : (
            <div className="controls">
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
  onCopy,
}: {
  group: GroupFile;
  componentFiles: Record<string, ComponentFile>;
  validation: GroupValidation | null;
  onCopy: () => void;
}) {
  return (
    <div className="controls">
      <section className="group-summary">
        <strong>{group.group.layout}</strong>
        <p>{group.group.description}</p>
        <button className="secondary-command" onClick={onCopy} type="button">
          Copy to New Group
        </button>
      </section>
      <ValidationPanel validation={validation} />
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
  message,
  validation,
  onCancel,
  onChange,
  onSave,
}: {
  componentFiles: Record<string, ComponentFile>;
  draft: GroupFile;
  message: string | null;
  validation: GroupValidation | null;
  onCancel: () => void;
  onChange: (draft: GroupFile) => void;
  onSave: () => void;
}) {
  const componentOptions = Object.values(componentFiles);

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
          <option value="row">row</option>
          <option value="grid">grid</option>
          <option value="stack">stack</option>
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
              <button className="secondary-command" disabled={draft.items.length <= 1} onClick={() => removeItem(index)} type="button">
                Remove
              </button>
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
        <button className="primary-command" onClick={onSave} type="button">
          Save Group
        </button>
      </div>
      {message && <p className="catalog-note">{message}</p>}
    </div>
  );
}

function ValidationPanel({ validation }: { validation: GroupValidation | null }) {
  if (!validation) {
    return <p className="catalog-note">Checking group structure...</p>;
  }

  return (
    <section className={`validation-panel ${validation.status}`}>
      <strong>{validation.status === "ready" ? "Ready" : validation.status}</strong>
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

function runtimeTitle(status: EnvironmentStatus) {
  const duckdb = status.duckdbVersion ?? "DuckDB unavailable";
  const ollama = status.ollamaVersion ?? "Ollama unavailable";

  return `${status.message}\n${duckdb}\n${ollama}\nModel: ${status.embeddingModel}`;
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
