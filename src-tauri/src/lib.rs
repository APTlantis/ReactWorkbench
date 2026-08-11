use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::Command,
    time::SystemTime,
};
use tauri::{AppHandle, Manager};

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ComponentFile {
    component: ComponentInfo,
    framework: FrameworkTargets,
    props: Vec<ComponentProp>,
    states: Vec<ComponentState>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ComponentInfo {
    id: String,
    name: String,
    description: String,
    themes: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct FrameworkTargets {
    react: bool,
    svelte: bool,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ComponentProp {
    id: String,
    label: String,
    kind: String,
    default: String,
    #[serde(default)]
    values: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ComponentState {
    id: String,
    label: String,
    props: BTreeMap<String, String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct GroupFile {
    group: GroupInfo,
    items: Vec<GroupItem>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct GroupInfo {
    id: String,
    name: String,
    description: String,
    layout: String,
    themes: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct GroupItem {
    component: String,
    state: String,
    role: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ThemeFile {
    theme: ThemeInfo,
    colors: ThemeColors,
    spacing: ThemeSpacing,
    radius: ThemeRadius,
    typography: ThemeTypography,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ThemeInfo {
    id: String,
    name: String,
    description: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ThemeColors {
    background: String,
    surface: String,
    surface_muted: String,
    text: String,
    muted: String,
    border: String,
    primary: String,
    secondary: String,
    danger: String,
    success: String,
    warning: String,
    focus: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ThemeSpacing {
    unit: u16,
    density: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ThemeRadius {
    small: u16,
    medium: u16,
    large: u16,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ThemeTypography {
    font: String,
    scale: f32,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SourceFile {
    source: SourceInfo,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SourceInfo {
    id: String,
    name: String,
    description: String,
    adapter: String,
    kind: String,
    location: String,
    enabled: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ComponentSummary {
    id: String,
    name: String,
    description: String,
    state_count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ThemeSummary {
    id: String,
    name: String,
    description: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GroupSummary {
    id: String,
    name: String,
    description: String,
    layout: String,
    item_count: usize,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SourceSummary {
    id: String,
    name: String,
    description: String,
    adapter: String,
    kind: String,
    location: String,
    enabled: bool,
    item_count: usize,
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SourceCatalog {
    source: SourceSummary,
    items: Vec<SourceCatalogItem>,
    warnings: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SourceCatalogItem {
    id: String,
    name: String,
    item_type: String,
    description: String,
    files: Vec<String>,
    dependencies: Vec<String>,
    source_path: String,
    preview_status: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct GroupValidation {
    status: String,
    issue_count: usize,
    issues: Vec<GroupValidationIssue>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct GroupValidationIssue {
    severity: String,
    title: String,
    detail: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PreviewSelection {
    component_id: String,
    theme_id: String,
    props: BTreeMap<String, String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvironmentStatus {
    duckdb_available: bool,
    duckdb_version: Option<String>,
    ollama_available: bool,
    ollama_version: Option<String>,
    embedding_model: String,
    index_initialized: bool,
    indexed_record_count: usize,
    message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotReportFile {
    compared_at: String,
    baseline: ScreenshotReportEndpoint,
    latest: ScreenshotReportEndpoint,
    thresholds: ScreenshotReportThresholds,
    summary: ScreenshotReportCounts,
    #[serde(default)]
    added: Vec<ScreenshotImageRecord>,
    #[serde(default)]
    removed: Vec<ScreenshotImageRecord>,
    #[serde(default)]
    tolerated: Vec<ScreenshotChangedRecord>,
    #[serde(default)]
    changed: Vec<ScreenshotChangedRecord>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotReportEndpoint {
    snapshot_id: String,
    dir: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotReportThresholds {
    pixel_color_distance: f64,
    pixel_diff_ratio: f64,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotReportCounts {
    added: usize,
    removed: usize,
    changed: usize,
    tolerated: usize,
    unchanged: usize,
    total_compared: usize,
    changed_pixels: usize,
    tolerated_pixels: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotImageRecord {
    kind: String,
    name: String,
    path: String,
    relative_path: String,
    theme: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotChangedRecord {
    baseline: ScreenshotImageRecord,
    latest: ScreenshotImageRecord,
    diff: ScreenshotDiffRecord,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotDiffRecord {
    path: String,
    changed_pixels: usize,
    changed_ratio: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotReviewItem {
    status: String,
    theme: String,
    kind: String,
    name: String,
    relative_path: String,
    preview_path: Option<String>,
    baseline_path: Option<String>,
    latest_path: Option<String>,
    diff_path: Option<String>,
    changed_pixels: Option<usize>,
    changed_ratio: Option<f64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotReportSummary {
    report_path: String,
    html_report_path: String,
    markdown_report_path: String,
    compared_at: String,
    baseline_snapshot_id: String,
    latest_snapshot_id: String,
    baseline_dir: String,
    latest_dir: String,
    status: String,
    status_title: String,
    status_detail: String,
    thresholds: ScreenshotReportThresholds,
    summary: ScreenshotReportCounts,
    review_items: Vec<ScreenshotReviewItem>,
    review_decisions: Vec<ScreenshotReviewDecision>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotReviewDecision {
    key: String,
    decision: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotReviewExport {
    report_path: String,
    baseline_snapshot_id: String,
    latest_snapshot_id: String,
    exported_at: String,
    accepted: usize,
    dismissed: usize,
    decisions: Vec<ScreenshotReviewDecision>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotReviewExportResult {
    path: String,
    accepted: usize,
    dismissed: usize,
    decision_count: usize,
}

struct IndexRecord {
    id: String,
    record_type: String,
    title: String,
    body: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShadcnRegistry {
    #[serde(default)]
    items: Vec<ShadcnRegistryItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShadcnRegistryItem {
    name: String,
    #[serde(default, rename = "type")]
    item_type: String,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    files: Vec<ShadcnRegistryFile>,
    #[serde(default)]
    dependencies: Vec<String>,
    #[serde(default)]
    registry_dependencies: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShadcnRegistryFile {
    path: String,
}

const SUPPORTED_GROUP_LAYOUTS: &[&str] = &[
    "row",
    "grid",
    "stack",
    "toolbar",
    "form-row",
    "dialog-footer",
    "table-header",
];

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct IndexSearchResult {
    id: String,
    record_type: String,
    title: String,
    body: String,
}

#[tauri::command]
fn list_components(app: AppHandle) -> Result<Vec<ComponentSummary>, String> {
    let components = read_all_components(&app)?;
    Ok(components
        .into_iter()
        .map(|component| ComponentSummary {
            id: component.component.id,
            name: component.component.name,
            description: component.component.description,
            state_count: component.states.len(),
        })
        .collect())
}

#[tauri::command]
fn load_component(app: AppHandle, component_id: String) -> Result<ComponentFile, String> {
    let path = metadata_dir(&app)
        .join("components")
        .join(format!("{component_id}.toml"));
    read_toml(&path)
}

#[tauri::command]
fn list_groups(app: AppHandle) -> Result<Vec<GroupSummary>, String> {
    let groups = read_all_groups(&app)?;
    Ok(groups
        .into_iter()
        .map(|group| GroupSummary {
            id: group.group.id,
            name: group.group.name,
            description: group.group.description,
            layout: group.group.layout,
            item_count: group.items.len(),
        })
        .collect())
}

#[tauri::command]
fn load_group(app: AppHandle, group_id: String) -> Result<GroupFile, String> {
    let path = metadata_dir(&app)
        .join("groups")
        .join(format!("{group_id}.toml"));
    read_toml(&path)
}

#[tauri::command]
fn list_sources(app: AppHandle) -> Result<Vec<SourceSummary>, String> {
    read_all_sources(&app)?
        .into_iter()
        .map(|source| summarize_source(&app, &source))
        .collect()
}

#[tauri::command]
fn load_source_catalog(app: AppHandle, source_id: String) -> Result<SourceCatalog, String> {
    let source = read_all_sources(&app)?
        .into_iter()
        .find(|candidate| candidate.source.id == source_id)
        .ok_or_else(|| format!("Source {source_id} was not found in metadata/sources."))?;
    build_source_catalog(&app, &source)
}

#[tauri::command]
fn save_group(app: AppHandle, group: GroupFile) -> Result<GroupFile, String> {
    write_group_file(&app, group, None)
}

#[tauri::command]
fn update_group(
    app: AppHandle,
    original_group_id: String,
    group: GroupFile,
) -> Result<GroupFile, String> {
    if original_group_id != slugify(&original_group_id) {
        return Err("Original group id is not a valid metadata id.".to_string());
    }

    write_group_file(&app, group, Some(original_group_id))
}

fn write_group_file(
    app: &AppHandle,
    group: GroupFile,
    original_group_id: Option<String>,
) -> Result<GroupFile, String> {
    let mut group = group;
    group.group.id = slugify(&group.group.name);
    if group.group.id.is_empty() {
        return Err("Group name must contain at least one letter or number.".to_string());
    }
    let validation = validate_group_file(app, &group)?;
    if validation
        .issues
        .iter()
        .any(|issue| issue.severity == "error")
    {
        let details = validation
            .issues
            .iter()
            .filter(|issue| issue.severity == "error")
            .map(|issue| issue.title.as_str())
            .collect::<Vec<_>>()
            .join(", ");
        return Err(format!("Group has blocking validation issues: {details}"));
    }

    let dir = writable_metadata_dir(app).join("groups");
    fs::create_dir_all(&dir).map_err(|error| {
        format!(
            "Could not create group metadata directory {}: {error}",
            dir.display()
        )
    })?;
    let path = dir.join(format!("{}.toml", group.group.id));

    if original_group_id.as_deref() != Some(group.group.id.as_str()) && path.exists() {
        return Err(format!(
            "A group named {} already exists. Choose a different name before saving.",
            group.group.name
        ));
    }

    let toml = toml::to_string_pretty(&group)
        .map_err(|error| format!("Could not serialize group metadata: {error}"))?;
    fs::write(&path, toml)
        .map_err(|error| format!("Could not save group metadata {}: {error}", path.display()))?;

    if let Some(original_group_id) = original_group_id {
        let original_path = dir.join(format!("{original_group_id}.toml"));
        if original_path != path && original_path.exists() {
            fs::remove_file(&original_path).map_err(|error| {
                format!(
                    "Saved {}, but could not remove renamed group file {}: {error}",
                    group.group.name,
                    original_path.display()
                )
            })?;
        }
    }

    Ok(group)
}

#[tauri::command]
fn validate_group(app: AppHandle, group: GroupFile) -> Result<GroupValidation, String> {
    validate_group_file(&app, &group)
}

#[tauri::command]
fn list_themes(app: AppHandle) -> Result<Vec<ThemeSummary>, String> {
    let themes = read_all_themes(&app)?;
    Ok(themes
        .into_iter()
        .map(|theme| ThemeSummary {
            id: theme.theme.id,
            name: theme.theme.name,
            description: theme.theme.description,
        })
        .collect())
}

#[tauri::command]
fn load_theme(app: AppHandle, theme_id: String) -> Result<ThemeFile, String> {
    let path = metadata_dir(&app)
        .join("themes")
        .join(format!("{theme_id}.toml"));
    read_toml(&path)
}

#[tauri::command]
fn save_preview_selection(app: AppHandle, selection: PreviewSelection) -> Result<(), String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {error}"))?;
    fs::create_dir_all(&dir).map_err(|error| {
        format!(
            "Could not create app data directory {}: {error}",
            dir.display()
        )
    })?;
    let path = dir.join("last-preview.json");
    let json = serde_json::to_string_pretty(&selection)
        .map_err(|error| format!("Could not serialize preview selection: {error}"))?;
    fs::write(&path, json).map_err(|error| {
        format!(
            "Could not save preview selection {}: {error}",
            path.display()
        )
    })
}

#[tauri::command]
fn initialize_local_index(app: AppHandle) -> Result<EnvironmentStatus, String> {
    let duckdb = command_version("duckdb", "-version");
    let ollama = command_version("ollama", "-v");
    let mut index_initialized = false;
    let mut indexed_record_count = 0;
    let mut message = String::from("File metadata is available.");

    if duckdb.available {
        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("Could not resolve app data directory: {error}"))?;
        fs::create_dir_all(&app_data).map_err(|error| {
            format!(
                "Could not create app data directory {}: {error}",
                app_data.display()
            )
        })?;
        let database = app_data.join("theme-preview.duckdb");
        let records = build_index_records(&app)?;
        indexed_record_count = records.len();
        let sql_path = app_data.join("rebuild-index.sql");
        write_index_sql(&sql_path, &records)?;
        let output = Command::new("duckdb")
            .arg(&database)
            .arg("-f")
            .arg(&sql_path)
            .output();
        match output {
            Ok(result) if result.status.success() => {
                index_initialized = true;
                message = format!(
                    "DuckDB indexed {indexed_record_count} records at {}.",
                    database.display()
                );
            }
            Ok(result) => {
                message = String::from_utf8_lossy(&result.stderr).trim().to_string();
                if message.is_empty() {
                    message = "DuckDB was found, but index initialization failed.".to_string();
                }
            }
            Err(error) => {
                message = format!("DuckDB was found, but could not be started: {error}");
            }
        }
    }

    Ok(EnvironmentStatus {
        duckdb_available: duckdb.available,
        duckdb_version: duckdb.version,
        ollama_available: ollama.available,
        ollama_version: ollama.version,
        embedding_model: "snowflake-arctic-embed:latest".to_string(),
        index_initialized,
        indexed_record_count,
        message,
    })
}

#[tauri::command]
fn search_index(
    app: AppHandle,
    query: String,
    record_type: Option<String>,
) -> Result<Vec<IndexSearchResult>, String> {
    let duckdb = command_version("duckdb", "-version");
    if !duckdb.available {
        return Err(
            "DuckDB is not available, so the local catalog cannot be searched.".to_string(),
        );
    }

    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {error}"))?;
    let database = app_data.join("theme-preview.duckdb");

    if !database.exists() {
        return Err("The local catalog has not been initialized yet.".to_string());
    }

    let query = query.trim().to_lowercase();
    let type_filter = record_type.unwrap_or_else(|| "all".to_string());
    let mut sql = String::from(
        "SELECT id, record_type AS recordType, title, body FROM indexed_records WHERE 1 = 1",
    );

    if !query.is_empty() {
        sql.push_str(&format!(
            " AND lower(title || ' ' || body) LIKE '%{}%'",
            sql_escape(&query)
        ));
    }

    if type_filter != "all" {
        sql.push_str(&format!(
            " AND record_type = '{}'",
            sql_escape(&type_filter)
        ));
    }

    sql.push_str(" ORDER BY record_type, title LIMIT 50;");

    let output = Command::new("duckdb")
        .arg(&database)
        .arg("-json")
        .arg("-c")
        .arg(sql)
        .output()
        .map_err(|error| format!("Could not search DuckDB catalog: {error}"))?;

    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if message.is_empty() {
            "DuckDB catalog search failed.".to_string()
        } else {
            message
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str::<Vec<IndexSearchResult>>(&stdout)
        .map_err(|error| format!("Could not parse DuckDB catalog results: {error}"))
}

#[tauri::command]
fn latest_screenshot_report(app: AppHandle) -> Result<Option<ScreenshotReportSummary>, String> {
    Ok(recent_screenshot_reports(app, Some(1))?.into_iter().next())
}

#[tauri::command]
fn recent_screenshot_reports(
    app: AppHandle,
    limit: Option<usize>,
) -> Result<Vec<ScreenshotReportSummary>, String> {
    let reports_dir = artifacts_dir(&app).join("previews").join("reports");
    if !reports_dir.is_dir() {
        return Ok(Vec::new());
    }

    let mut reports = fs::read_dir(&reports_dir)
        .map_err(|error| {
            format!(
                "Could not read screenshot reports {}: {error}",
                reports_dir.display()
            )
        })?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().and_then(|ext| ext.to_str()) == Some("json"))
        .filter(|path| !is_review_decision_export(path))
        .filter_map(|path| {
            let modified = fs::metadata(&path)
                .and_then(|metadata| metadata.modified())
                .unwrap_or(SystemTime::UNIX_EPOCH);
            Some((modified, path))
        })
        .collect::<Vec<_>>();
    reports.sort_by_key(|(modified, _)| *modified);
    reports.reverse();

    reports
        .into_iter()
        .take(limit.unwrap_or(8))
        .map(|(_, report_path)| read_screenshot_report_summary(report_path))
        .collect()
}

fn read_screenshot_report_summary(report_path: PathBuf) -> Result<ScreenshotReportSummary, String> {
    let content = fs::read_to_string(&report_path).map_err(|error| {
        format!(
            "Could not read screenshot report {}: {error}",
            report_path.display()
        )
    })?;
    let report = serde_json::from_str::<ScreenshotReportFile>(&content).map_err(|error| {
        format!(
            "Could not parse screenshot report {}: {error}",
            report_path.display()
        )
    })?;
    let (status, status_title, status_detail) = screenshot_report_status(&report.summary);
    let html_report_path = report_path.with_extension("html");
    let markdown_report_path = report_path.with_extension("md");

    let review_items = screenshot_review_items(&report);
    let review_decisions = read_screenshot_review_decisions(&report_path)?;

    Ok(ScreenshotReportSummary {
        report_path: report_path.display().to_string(),
        html_report_path: html_report_path.display().to_string(),
        markdown_report_path: markdown_report_path.display().to_string(),
        compared_at: report.compared_at,
        baseline_snapshot_id: report.baseline.snapshot_id,
        latest_snapshot_id: report.latest.snapshot_id,
        baseline_dir: report.baseline.dir,
        latest_dir: report.latest.dir,
        status,
        status_title,
        status_detail,
        thresholds: ScreenshotReportThresholds {
            pixel_color_distance: report.thresholds.pixel_color_distance,
            pixel_diff_ratio: report.thresholds.pixel_diff_ratio,
        },
        summary: report.summary,
        review_items,
        review_decisions,
    })
}

#[tauri::command]
fn export_screenshot_review_decisions(
    app: AppHandle,
    export: ScreenshotReviewExport,
) -> Result<ScreenshotReviewExportResult, String> {
    let reports_dir = artifacts_dir(&app).join("previews").join("reports");
    let report_path = PathBuf::from(&export.report_path);
    let canonical_reports_dir = reports_dir.canonicalize().map_err(|error| {
        format!(
            "Could not resolve screenshot reports directory {}: {error}",
            reports_dir.display()
        )
    })?;
    let canonical_report_path = report_path.canonicalize().map_err(|error| {
        format!(
            "Could not resolve screenshot report {}: {error}",
            report_path.display()
        )
    })?;

    if !canonical_report_path.starts_with(&canonical_reports_dir) {
        return Err("Review decisions can only be exported beside screenshot reports.".to_string());
    }

    if canonical_report_path
        .extension()
        .and_then(|ext| ext.to_str())
        != Some("json")
    {
        return Err("Review decisions must be exported for a JSON screenshot report.".to_string());
    }

    let output_path = review_decision_export_path(&canonical_report_path)?;

    let accepted = export
        .decisions
        .iter()
        .filter(|item| item.decision == "accepted")
        .count();
    let dismissed = export
        .decisions
        .iter()
        .filter(|item| item.decision == "dismissed")
        .count();
    let json = serde_json::to_string_pretty(&export)
        .map_err(|error| format!("Could not serialize review decisions: {error}"))?;
    fs::write(&output_path, format!("{json}\n")).map_err(|error| {
        format!(
            "Could not export review decisions {}: {error}",
            output_path.display()
        )
    })?;

    Ok(ScreenshotReviewExportResult {
        path: output_path.display().to_string(),
        accepted,
        dismissed,
        decision_count: export.decisions.len(),
    })
}

fn read_screenshot_review_decisions(
    report_path: &Path,
) -> Result<Vec<ScreenshotReviewDecision>, String> {
    let path = review_decision_export_path(report_path)?;
    if !path.is_file() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path).map_err(|error| {
        format!(
            "Could not read review decisions {}: {error}",
            path.display()
        )
    })?;
    let export = serde_json::from_str::<ScreenshotReviewExport>(&content).map_err(|error| {
        format!(
            "Could not parse review decisions {}: {error}",
            path.display()
        )
    })?;

    Ok(export
        .decisions
        .into_iter()
        .filter(|item| item.decision == "accepted" || item.decision == "dismissed")
        .collect())
}

fn review_decision_export_path(report_path: &Path) -> Result<PathBuf, String> {
    let mut output_path = report_path.to_path_buf();
    let stem = output_path
        .file_stem()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Screenshot report has no usable file name.".to_string())?;
    output_path.set_file_name(format!("{stem}.review.json"));
    Ok(output_path)
}

fn is_review_decision_export(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.ends_with(".review.json"))
}

fn screenshot_review_items(report: &ScreenshotReportFile) -> Vec<ScreenshotReviewItem> {
    let mut items = Vec::new();

    items.extend(report.changed.iter().map(|item| ScreenshotReviewItem {
        status: "changed".to_string(),
        theme: item.latest.theme.clone(),
        kind: item.latest.kind.clone(),
        name: item.latest.name.clone(),
        relative_path: item.latest.relative_path.clone(),
        preview_path: Some(item.latest.path.clone()),
        baseline_path: Some(item.baseline.path.clone()),
        latest_path: Some(item.latest.path.clone()),
        diff_path: Some(item.diff.path.clone()),
        changed_pixels: Some(item.diff.changed_pixels),
        changed_ratio: Some(item.diff.changed_ratio),
    }));

    items.extend(report.tolerated.iter().map(|item| ScreenshotReviewItem {
        status: "tolerated".to_string(),
        theme: item.latest.theme.clone(),
        kind: item.latest.kind.clone(),
        name: item.latest.name.clone(),
        relative_path: item.latest.relative_path.clone(),
        preview_path: Some(item.latest.path.clone()),
        baseline_path: Some(item.baseline.path.clone()),
        latest_path: Some(item.latest.path.clone()),
        diff_path: Some(item.diff.path.clone()),
        changed_pixels: Some(item.diff.changed_pixels),
        changed_ratio: Some(item.diff.changed_ratio),
    }));

    items.extend(report.added.iter().map(|item| ScreenshotReviewItem {
        status: "added".to_string(),
        theme: item.theme.clone(),
        kind: item.kind.clone(),
        name: item.name.clone(),
        relative_path: item.relative_path.clone(),
        preview_path: Some(item.path.clone()),
        baseline_path: None,
        latest_path: Some(item.path.clone()),
        diff_path: None,
        changed_pixels: None,
        changed_ratio: None,
    }));

    items.extend(report.removed.iter().map(|item| ScreenshotReviewItem {
        status: "removed".to_string(),
        theme: item.theme.clone(),
        kind: item.kind.clone(),
        name: item.name.clone(),
        relative_path: item.relative_path.clone(),
        preview_path: Some(item.path.clone()),
        baseline_path: Some(item.path.clone()),
        latest_path: None,
        diff_path: None,
        changed_pixels: None,
        changed_ratio: None,
    }));

    items.sort_by(|left, right| {
        review_item_rank(&left.status)
            .cmp(&review_item_rank(&right.status))
            .then(left.theme.cmp(&right.theme))
            .then(left.kind.cmp(&right.kind))
            .then(left.name.cmp(&right.name))
    });

    items
}

fn review_item_rank(status: &str) -> u8 {
    match status {
        "changed" => 0,
        "added" => 1,
        "removed" => 2,
        "tolerated" => 3,
        _ => 4,
    }
}

fn screenshot_report_status(summary: &ScreenshotReportCounts) -> (String, String, String) {
    let blocking = summary.added + summary.removed + summary.changed;
    if blocking > 0 {
        return (
            "review".to_string(),
            "Needs review".to_string(),
            format!(
                "{blocking} preview {} review before accepting this snapshot.",
                if blocking == 1 {
                    "item needs"
                } else {
                    "items need"
                }
            ),
        );
    }

    if summary.tolerated > 0 {
        return (
            "tolerated".to_string(),
            "Review tolerated drift".to_string(),
            format!(
                "{} preview {} within the configured threshold.",
                summary.tolerated,
                if summary.tolerated == 1 {
                    "difference is"
                } else {
                    "differences are"
                }
            ),
        );
    }

    (
        "ready".to_string(),
        "All clear".to_string(),
        "No preview additions, removals, or image differences were found.".to_string(),
    )
}

fn validate_group_file(app: &AppHandle, group: &GroupFile) -> Result<GroupValidation, String> {
    let components = read_all_components(app)?;
    Ok(validate_group_against_components(group, &components))
}

fn validate_group_against_components(
    group: &GroupFile,
    components: &[ComponentFile],
) -> GroupValidation {
    let mut issues = Vec::new();
    let component_map = components
        .iter()
        .map(|component| (component.component.id.as_str(), component))
        .collect::<BTreeMap<_, _>>();

    if !SUPPORTED_GROUP_LAYOUTS.contains(&group.group.layout.as_str()) {
        issues.push(GroupValidationIssue {
            severity: "error".to_string(),
            title: "Unsupported layout".to_string(),
            detail: format!(
                "{} is not one of {}.",
                group.group.layout,
                SUPPORTED_GROUP_LAYOUTS.join(", ")
            ),
        });
    }

    if group.items.is_empty() {
        issues.push(GroupValidationIssue {
            severity: "error".to_string(),
            title: "No group items".to_string(),
            detail: "A group needs at least one component placement.".to_string(),
        });
    }

    let mut roles = BTreeSet::new();
    for item in &group.items {
        if item.role.trim().is_empty() {
            issues.push(GroupValidationIssue {
                severity: "warning".to_string(),
                title: "Missing role label".to_string(),
                detail: format!(
                    "{}:{} does not describe what it does in the area.",
                    item.component, item.state
                ),
            });
        } else if !roles.insert(item.role.to_lowercase()) {
            issues.push(GroupValidationIssue {
                severity: "warning".to_string(),
                title: "Duplicate role".to_string(),
                detail: format!("{} appears more than once in this group.", item.role),
            });
        }

        let Some(component) = component_map.get(item.component.as_str()) else {
            issues.push(GroupValidationIssue {
                severity: "error".to_string(),
                title: "Missing component".to_string(),
                detail: format!("{} is not defined in metadata/components.", item.component),
            });
            continue;
        };

        if !component.states.iter().any(|state| state.id == item.state) {
            issues.push(GroupValidationIssue {
                severity: "error".to_string(),
                title: "Missing state".to_string(),
                detail: format!("{} does not define state {}.", item.component, item.state),
            });
        }
    }

    let status = if issues.iter().any(|issue| issue.severity == "error") {
        "error"
    } else if issues.iter().any(|issue| issue.severity == "warning") {
        "warning"
    } else {
        "ready"
    };

    GroupValidation {
        status: status.to_string(),
        issue_count: issues.len(),
        issues,
    }
}

fn summarize_source(app: &AppHandle, source: &SourceFile) -> Result<SourceSummary, String> {
    let catalog = build_source_catalog(app, source)?;
    Ok(SourceSummary {
        id: source.source.id.clone(),
        name: source.source.name.clone(),
        description: source.source.description.clone(),
        adapter: source.source.adapter.clone(),
        kind: source.source.kind.clone(),
        location: source.source.location.clone(),
        enabled: source.source.enabled,
        item_count: catalog.items.len(),
        status: if catalog.warnings.is_empty() {
            "ready".to_string()
        } else {
            "warning".to_string()
        },
    })
}

fn build_source_catalog(app: &AppHandle, source: &SourceFile) -> Result<SourceCatalog, String> {
    let (items, warnings) = match source.source.adapter.as_str() {
        "local-toml" => index_local_toml_source(app)?,
        "shadcn" => index_shadcn_source(app, source)?,
        adapter => (
            Vec::new(),
            vec![format!("Adapter {adapter} is not supported yet.")],
        ),
    };

    Ok(SourceCatalog {
        source: SourceSummary {
            id: source.source.id.clone(),
            name: source.source.name.clone(),
            description: source.source.description.clone(),
            adapter: source.source.adapter.clone(),
            kind: source.source.kind.clone(),
            location: source.source.location.clone(),
            enabled: source.source.enabled,
            item_count: items.len(),
            status: if warnings.is_empty() {
                "ready".to_string()
            } else {
                "warning".to_string()
            },
        },
        items,
        warnings,
    })
}

fn index_local_toml_source(app: &AppHandle) -> Result<(Vec<SourceCatalogItem>, Vec<String>), String> {
    let mut items = Vec::new();

    items.extend(read_all_components(app)?.into_iter().map(|component| SourceCatalogItem {
        id: format!("local-toml:component:{}", component.component.id),
        name: component.component.name,
        item_type: "component".to_string(),
        description: component.component.description,
        files: vec![format!("metadata/components/{}.toml", component.component.id)],
        dependencies: Vec::new(),
        source_path: "metadata/components".to_string(),
        preview_status: "native".to_string(),
    }));

    items.extend(read_all_groups(app)?.into_iter().map(|group| SourceCatalogItem {
        id: format!("local-toml:group:{}", group.group.id),
        name: group.group.name,
        item_type: "group".to_string(),
        description: group.group.description,
        files: vec![format!("metadata/groups/{}.toml", group.group.id)],
        dependencies: Vec::new(),
        source_path: "metadata/groups".to_string(),
        preview_status: "native".to_string(),
    }));

    items.extend(read_all_themes(app)?.into_iter().map(|theme| SourceCatalogItem {
        id: format!("local-toml:theme:{}", theme.theme.id),
        name: theme.theme.name,
        item_type: "theme".to_string(),
        description: theme.theme.description,
        files: vec![format!("metadata/themes/{}.toml", theme.theme.id)],
        dependencies: Vec::new(),
        source_path: "metadata/themes".to_string(),
        preview_status: "native".to_string(),
    }));

    items.sort_by(|left, right| {
        left.item_type
            .cmp(&right.item_type)
            .then(left.name.cmp(&right.name))
    });
    Ok((items, Vec::new()))
}

fn index_shadcn_source(
    app: &AppHandle,
    source: &SourceFile,
) -> Result<(Vec<SourceCatalogItem>, Vec<String>), String> {
    let source_root = resolve_source_location(app, &source.source.location);
    index_shadcn_source_root(&source.source.id, &source_root)
}

fn index_shadcn_source_root(
    source_id: &str,
    source_root: &Path,
) -> Result<(Vec<SourceCatalogItem>, Vec<String>), String> {
    let mut warnings = Vec::new();

    if !source_root.is_dir() {
        return Ok((
            Vec::new(),
            vec![format!(
                "Source directory {} does not exist.",
                source_root.display()
            )],
        ));
    }

    let registry_path = source_root.join("registry.json");
    if registry_path.is_file() {
        let content = fs::read_to_string(&registry_path).map_err(|error| {
            format!(
                "Could not read shadcn registry {}: {error}",
                registry_path.display()
            )
        })?;
        let registry = serde_json::from_str::<ShadcnRegistry>(&content).map_err(|error| {
            format!(
                "Could not parse shadcn registry {}: {error}",
                registry_path.display()
            )
        })?;
        let mut items = registry
            .items
            .into_iter()
            .map(|item| {
                let files = item
                    .files
                    .iter()
                    .map(|file| file.path.clone())
                    .collect::<Vec<_>>();
                let missing_files = files
                    .iter()
                    .filter(|file| !source_root.join(file).is_file())
                    .cloned()
                    .collect::<Vec<_>>();
                if !missing_files.is_empty() {
                    warnings.push(format!(
                        "{} references missing files: {}.",
                        item.name,
                        missing_files.join(", ")
                    ));
                }

                let mut dependencies = item.dependencies;
                dependencies.extend(item.registry_dependencies);
                dependencies.sort();
                dependencies.dedup();

                SourceCatalogItem {
                    id: format!("{}:{}", source_id, item.name),
                    name: item.title.unwrap_or_else(|| title_case(&item.name)),
                    item_type: if item.item_type.is_empty() {
                        "registry:ui".to_string()
                    } else {
                        item.item_type
                    },
                    description: item.description.unwrap_or_else(|| {
                        "shadcn registry item imported into the source catalog.".to_string()
                    }),
                    files,
                    dependencies,
                    source_path: registry_path.display().to_string(),
                    preview_status: "indexed".to_string(),
                }
            })
            .collect::<Vec<_>>();
        items.sort_by(|left, right| left.name.cmp(&right.name));
        return Ok((items, warnings));
    }

    warnings.push("No registry.json found; scanned component files directly.".to_string());
    let component_dir = source_root.join("components").join("ui");
    let mut files = Vec::new();
    collect_files_with_extension(&component_dir, "tsx", &mut files)?;
    let mut items = files
        .into_iter()
        .map(|path| {
            let name = path
                .file_stem()
                .and_then(|stem| stem.to_str())
                .unwrap_or("component")
                .to_string();
            let relative = path
                .strip_prefix(&source_root)
                .unwrap_or(&path)
                .display()
                .to_string();
            SourceCatalogItem {
                id: format!("{}:{}", source_id, name),
                name: title_case(&name),
                item_type: "registry:ui".to_string(),
                description: "shadcn-style component file discovered from local directory.".to_string(),
                files: vec![relative],
                dependencies: Vec::new(),
                source_path: component_dir.display().to_string(),
                preview_status: "indexed".to_string(),
            }
        })
        .collect::<Vec<_>>();
    items.sort_by(|left, right| left.name.cmp(&right.name));
    Ok((items, warnings))
}

fn build_index_records(app: &AppHandle) -> Result<Vec<IndexRecord>, String> {
    let mut records = Vec::new();

    for component in read_all_components(app)? {
        let prop_names = component
            .props
            .iter()
            .map(|prop| format!("{}:{}", prop.id, prop.kind))
            .collect::<Vec<_>>()
            .join(", ");
        let state_names = component
            .states
            .iter()
            .map(|state| state.label.as_str())
            .collect::<Vec<_>>()
            .join(", ");

        records.push(IndexRecord {
            id: format!("component:{}", component.component.id),
            record_type: "component".to_string(),
            title: component.component.name,
            body: format!(
                "{} Props: {prop_names}. States: {state_names}. Themes: {}.",
                component.component.description,
                component.component.themes.join(", ")
            ),
        });
    }

    for theme in read_all_themes(app)? {
        records.push(IndexRecord {
            id: format!("theme:{}", theme.theme.id),
            record_type: "theme".to_string(),
            title: theme.theme.name,
            body: format!(
                "{} Primary {} surface {} text {} density {}.",
                theme.theme.description,
                theme.colors.primary,
                theme.colors.surface,
                theme.colors.text,
                theme.spacing.density
            ),
        });
    }

    for group in read_all_groups(app)? {
        let items = group
            .items
            .iter()
            .map(|item| format!("{} uses {}:{}", item.role, item.component, item.state))
            .collect::<Vec<_>>()
            .join(", ");

        records.push(IndexRecord {
            id: format!("group:{}", group.group.id),
            record_type: "group".to_string(),
            title: group.group.name,
            body: format!(
                "{} Layout: {}. Items: {items}. Themes: {}.",
                group.group.description,
                group.group.layout,
                group.group.themes.join(", ")
            ),
        });
    }

    for source in read_all_sources(app)? {
        let catalog = build_source_catalog(app, &source)?;
        records.push(IndexRecord {
            id: format!("source:{}", source.source.id),
            record_type: "source".to_string(),
            title: source.source.name.clone(),
            body: format!(
                "{} Adapter: {}. Kind: {}. Location: {}. Items: {}. Status: {}.",
                source.source.description,
                source.source.adapter,
                source.source.kind,
                source.source.location,
                catalog.items.len(),
                catalog.source.status
            ),
        });

        for item in catalog.items {
            records.push(IndexRecord {
                id: format!("shadcn-component:{}", item.id),
                record_type: if source.source.adapter == "shadcn" {
                    "shadcn-component".to_string()
                } else {
                    "source-item".to_string()
                },
                title: item.name,
                body: format!(
                    "{} Source: {}. Type: {}. Files: {}. Dependencies: {}. Preview: {}.",
                    item.description,
                    source.source.name,
                    item.item_type,
                    item.files.join(", "),
                    if item.dependencies.is_empty() {
                        "none".to_string()
                    } else {
                        item.dependencies.join(", ")
                    },
                    item.preview_status
                ),
            });
        }
    }

    Ok(records)
}

fn write_index_sql(path: &Path, records: &[IndexRecord]) -> Result<(), String> {
    let mut file = fs::File::create(path)
        .map_err(|error| format!("Could not create index SQL {}: {error}", path.display()))?;

    writeln!(
        file,
        "CREATE TABLE IF NOT EXISTS indexed_records (id VARCHAR PRIMARY KEY, record_type VARCHAR, title VARCHAR, body VARCHAR, embedding_model VARCHAR, updated_at TIMESTAMP DEFAULT current_timestamp);"
    )
    .map_err(|error| format!("Could not write index SQL {}: {error}", path.display()))?;
    writeln!(file, "DELETE FROM indexed_records;")
        .map_err(|error| format!("Could not write index SQL {}: {error}", path.display()))?;

    for record in records {
        writeln!(
            file,
            "INSERT INTO indexed_records (id, record_type, title, body, embedding_model) VALUES ('{}', '{}', '{}', '{}', 'snowflake-arctic-embed:latest');",
            sql_escape(&record.id),
            sql_escape(&record.record_type),
            sql_escape(&record.title),
            sql_escape(&record.body)
        )
        .map_err(|error| format!("Could not write index SQL {}: {error}", path.display()))?;
    }

    Ok(())
}

fn sql_escape(value: &str) -> String {
    value.replace('\'', "''")
}

fn read_all_components(app: &AppHandle) -> Result<Vec<ComponentFile>, String> {
    read_all_toml(&metadata_dir(app).join("components"))
}

fn read_all_themes(app: &AppHandle) -> Result<Vec<ThemeFile>, String> {
    read_all_toml(&metadata_dir(app).join("themes"))
}

fn read_all_groups(app: &AppHandle) -> Result<Vec<GroupFile>, String> {
    read_all_toml(&metadata_dir(app).join("groups"))
}

fn read_all_sources(app: &AppHandle) -> Result<Vec<SourceFile>, String> {
    let dir = metadata_dir(app).join("sources");
    if !dir.is_dir() {
        return Ok(Vec::new());
    }

    read_all_toml(&dir)
}

fn read_all_toml<T>(dir: &Path) -> Result<Vec<T>, String>
where
    T: for<'de> Deserialize<'de>,
{
    let mut files: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|error| {
            format!(
                "Could not read metadata directory {}: {error}",
                dir.display()
            )
        })?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().and_then(|ext| ext.to_str()) == Some("toml"))
        .collect();
    files.sort();

    files.into_iter().map(|path| read_toml(&path)).collect()
}

fn read_toml<T>(path: &Path) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    let content = fs::read_to_string(path)
        .map_err(|error| format!("Could not read {}: {error}", path.display()))?;
    toml::from_str(&content).map_err(|error| format!("Could not parse {}: {error}", path.display()))
}

fn metadata_dir(app: &AppHandle) -> PathBuf {
    let mut candidates = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("metadata"));
    }

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("metadata"));
        candidates.push(current_dir.join("..").join("metadata"));
    }

    candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("metadata"),
    );

    candidates
        .into_iter()
        .find(|candidate| {
            candidate.join("components").is_dir() && candidate.join("themes").is_dir()
        })
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("..")
                .join("metadata")
        })
}

fn project_root(app: &AppHandle) -> PathBuf {
    if let Ok(current_dir) = std::env::current_dir() {
        if current_dir.join("metadata").is_dir() {
            return current_dir;
        }

        let parent = current_dir.join("..");
        if parent.join("metadata").is_dir() {
            return parent;
        }
    }

    metadata_dir(app)
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("..")
        })
}

fn resolve_source_location(app: &AppHandle, location: &str) -> PathBuf {
    let path = PathBuf::from(location);
    if path.is_absolute() {
        path
    } else {
        project_root(app).join(path)
    }
}

fn writable_metadata_dir(app: &AppHandle) -> PathBuf {
    if let Ok(current_dir) = std::env::current_dir() {
        let candidate = current_dir.join("metadata");
        if candidate.is_dir() {
            return candidate;
        }

        let candidate = current_dir.join("..").join("metadata");
        if candidate.is_dir() {
            return candidate;
        }
    }

    metadata_dir(app)
}

fn artifacts_dir(app: &AppHandle) -> PathBuf {
    if let Ok(current_dir) = std::env::current_dir() {
        let candidate = current_dir.join("artifacts");
        if candidate.is_dir() {
            return candidate;
        }

        let candidate = current_dir.join("..").join("artifacts");
        if candidate.is_dir() {
            return candidate;
        }
    }

    app.path()
        .app_data_dir()
        .map(|dir| dir.join("artifacts"))
        .unwrap_or_else(|_| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("..")
                .join("artifacts")
        })
}

fn slugify(value: &str) -> String {
    let mut output = String::new();
    let mut last_was_dash = false;

    for character in value.chars().flat_map(char::to_lowercase) {
        if character.is_ascii_alphanumeric() {
            output.push(character);
            last_was_dash = false;
        } else if !last_was_dash && !output.is_empty() {
            output.push('-');
            last_was_dash = true;
        }
    }

    output.trim_end_matches('-').to_string()
}

struct CommandStatus {
    available: bool,
    version: Option<String>,
}

fn command_version(program: &str, version_arg: &str) -> CommandStatus {
    match Command::new(program).arg(version_arg).output() {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let version = if stdout.is_empty() { stderr } else { stdout };
            CommandStatus {
                available: true,
                version: Some(version),
            }
        }
        _ => CommandStatus {
            available: false,
            version: None,
        },
    }
}

fn collect_files_with_extension(
    dir: &Path,
    extension: &str,
    output: &mut Vec<PathBuf>,
) -> Result<(), String> {
    if !dir.is_dir() {
        return Ok(());
    }

    for entry in fs::read_dir(dir)
        .map_err(|error| format!("Could not read directory {}: {error}", dir.display()))?
    {
        let path = entry
            .map_err(|error| format!("Could not read directory entry {}: {error}", dir.display()))?
            .path();
        if path.is_dir() {
            collect_files_with_extension(&path, extension, output)?;
        } else if path.extension().and_then(|ext| ext.to_str()) == Some(extension) {
            output.push(path);
        }
    }

    output.sort();
    Ok(())
}

fn title_case(value: &str) -> String {
    value
        .split(['-', '_', ' '])
        .filter(|part| !part.is_empty())
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_components,
            load_component,
            list_groups,
            load_group,
            list_sources,
            load_source_catalog,
            save_group,
            update_group,
            validate_group,
            list_themes,
            load_theme,
            save_preview_selection,
            initialize_local_index,
            search_index,
            latest_screenshot_report,
            recent_screenshot_reports,
            export_screenshot_review_decisions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seeded_component_metadata_parses() {
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("metadata")
            .join("components");
        let components: Vec<ComponentFile> = read_all_toml(&dir).expect("components should parse");

        assert_eq!(components.len(), 7);
        assert!(components
            .iter()
            .any(|component| component.component.id == "tabs"));
        assert!(components
            .iter()
            .any(|component| component.component.id == "table-control"));
        assert!(components.iter().all(|component| component.framework.react));
        assert!(components
            .iter()
            .all(|component| !component.props.is_empty()));
        assert!(components
            .iter()
            .all(|component| !component.states.is_empty()));
    }

    #[test]
    fn seeded_theme_metadata_parses() {
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("metadata")
            .join("themes");
        let themes: Vec<ThemeFile> = read_all_toml(&dir).expect("themes should parse");

        assert_eq!(themes.len(), 3);
        assert!(themes.iter().all(|theme| theme.spacing.unit > 0));
        assert!(themes
            .iter()
            .all(|theme| !theme.colors.surface_muted.is_empty()));
    }

    #[test]
    fn seeded_group_metadata_parses() {
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("metadata")
            .join("groups");
        let groups: Vec<GroupFile> = read_all_toml(&dir).expect("groups should parse");

        assert_eq!(groups.len(), 11);
        assert!(groups
            .iter()
            .any(|group| group.group.id == "catalog-tabs"));
        assert!(groups
            .iter()
            .any(|group| group.group.id == "table-controls"));
        assert!(groups.iter().all(|group| !group.items.is_empty()));
        assert!(groups.iter().all(|group| !group.group.layout.is_empty()));
    }

    #[test]
    fn seeded_source_metadata_parses() {
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("metadata")
            .join("sources");
        let sources: Vec<SourceFile> = read_all_toml(&dir).expect("sources should parse");

        assert_eq!(sources.len(), 2);
        assert!(sources
            .iter()
            .any(|source| source.source.adapter == "local-toml"));
        assert!(sources
            .iter()
            .any(|source| source.source.adapter == "shadcn"));
    }

    #[test]
    fn shadcn_registry_fixture_indexes_items() {
        let source_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("examples")
            .join("shadcn-registry");
        let (items, warnings) =
            index_shadcn_source_root("fixture", &source_root).expect("fixture should index");

        assert_eq!(items.len(), 2);
        assert!(warnings.is_empty());
        assert!(items.iter().any(|item| item.name == "Button"));
        assert!(items
            .iter()
            .any(|item| item.dependencies.contains(&"class-variance-authority".to_string())));
    }

    #[test]
    fn index_sql_escapes_quotes() {
        assert_eq!(sql_escape("Button's state"), "Button''s state");
    }

    #[test]
    fn group_names_slugify_to_file_ids() {
        assert_eq!(slugify("Settings Row!"), "settings-row");
        assert_eq!(slugify("  Danger   Zone  "), "danger-zone");
    }

    #[test]
    fn review_decision_exports_are_not_screenshot_reports() {
        assert!(is_review_decision_export(Path::new(
            "baseline-to-latest.review.json"
        )));
        assert!(!is_review_decision_export(Path::new(
            "baseline-to-latest.json"
        )));
    }

    #[test]
    fn group_validation_catches_missing_component_state_and_duplicate_roles() {
        let components: Vec<ComponentFile> = read_all_toml(
            &PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("..")
                .join("metadata")
                .join("components"),
        )
        .expect("components should parse");
        let group = GroupFile {
            group: GroupInfo {
                id: "broken".to_string(),
                name: "Broken".to_string(),
                description: "Broken group".to_string(),
                layout: "circle".to_string(),
                themes: vec!["light".to_string()],
            },
            items: vec![
                GroupItem {
                    component: "button".to_string(),
                    state: "missing".to_string(),
                    role: "Action".to_string(),
                },
                GroupItem {
                    component: "unknown".to_string(),
                    state: "primary".to_string(),
                    role: "Action".to_string(),
                },
            ],
        };
        let validation = validate_group_against_components(&group, &components);

        assert_eq!(validation.status, "error");
        assert!(validation.issue_count >= 4);
    }

    #[test]
    fn invalid_toml_returns_readable_error() {
        let error = toml::from_str::<ComponentFile>("[component")
            .expect_err("broken TOML should fail")
            .to_string();

        assert!(error.contains("expected"));
    }
}
