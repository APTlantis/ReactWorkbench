use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::Command,
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

struct IndexRecord {
    id: String,
    record_type: String,
    title: String,
    body: String,
}

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
    let path = metadata_dir(&app).join("components").join(format!("{component_id}.toml"));
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
    let path = metadata_dir(&app).join("groups").join(format!("{group_id}.toml"));
    read_toml(&path)
}

#[tauri::command]
fn save_group(app: AppHandle, group: GroupFile) -> Result<GroupFile, String> {
    let mut group = group;
    group.group.id = slugify(&group.group.name);
    if group.group.id.is_empty() {
        return Err("Group name must contain at least one letter or number.".to_string());
    }
    let validation = validate_group_file(&app, &group)?;
    if validation.issues.iter().any(|issue| issue.severity == "error") {
        let details = validation
            .issues
            .iter()
            .filter(|issue| issue.severity == "error")
            .map(|issue| issue.title.as_str())
            .collect::<Vec<_>>()
            .join(", ");
        return Err(format!("Group has blocking validation issues: {details}"));
    }

    let dir = writable_metadata_dir(&app).join("groups");
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Could not create group metadata directory {}: {error}", dir.display()))?;
    let path = dir.join(format!("{}.toml", group.group.id));
    let toml = toml::to_string_pretty(&group)
        .map_err(|error| format!("Could not serialize group metadata: {error}"))?;
    fs::write(&path, toml)
        .map_err(|error| format!("Could not save group metadata {}: {error}", path.display()))?;

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
    let path = metadata_dir(&app).join("themes").join(format!("{theme_id}.toml"));
    read_toml(&path)
}

#[tauri::command]
fn save_preview_selection(app: AppHandle, selection: PreviewSelection) -> Result<(), String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {error}"))?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Could not create app data directory {}: {error}", dir.display()))?;
    let path = dir.join("last-preview.json");
    let json = serde_json::to_string_pretty(&selection)
        .map_err(|error| format!("Could not serialize preview selection: {error}"))?;
    fs::write(&path, json)
        .map_err(|error| format!("Could not save preview selection {}: {error}", path.display()))
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
        let output = Command::new("duckdb").arg(&database).arg("-f").arg(&sql_path).output();
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
        return Err("DuckDB is not available, so the local catalog cannot be searched.".to_string());
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
        sql.push_str(&format!(" AND record_type = '{}'", sql_escape(&type_filter)));
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

    if !["row", "grid", "stack"].contains(&group.group.layout.as_str()) {
        issues.push(GroupValidationIssue {
            severity: "error".to_string(),
            title: "Unsupported layout".to_string(),
            detail: format!("{} is not one of row, grid, or stack.", group.group.layout),
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
                detail: format!("{}:{} does not describe what it does in the area.", item.component, item.state),
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

fn read_all_toml<T>(dir: &Path) -> Result<Vec<T>, String>
where
    T: for<'de> Deserialize<'de>,
{
    let mut files: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|error| format!("Could not read metadata directory {}: {error}", dir.display()))?
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
    toml::from_str(&content)
        .map_err(|error| format!("Could not parse {}: {error}", path.display()))
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

    candidates.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("metadata"));

    candidates
        .into_iter()
        .find(|candidate| candidate.join("components").is_dir() && candidate.join("themes").is_dir())
        .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("metadata"))
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_components,
            load_component,
            list_groups,
            load_group,
            save_group,
            validate_group,
            list_themes,
            load_theme,
            save_preview_selection,
            initialize_local_index,
            search_index
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

        assert_eq!(components.len(), 3);
        assert!(components.iter().all(|component| component.framework.react));
        assert!(components.iter().all(|component| !component.props.is_empty()));
        assert!(components.iter().all(|component| !component.states.is_empty()));
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
        assert!(themes.iter().all(|theme| !theme.colors.surface_muted.is_empty()));
    }

    #[test]
    fn seeded_group_metadata_parses() {
        let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("metadata")
            .join("groups");
        let groups: Vec<GroupFile> = read_all_toml(&dir).expect("groups should parse");

        assert_eq!(groups.len(), 3);
        assert!(groups.iter().all(|group| !group.items.is_empty()));
        assert!(groups.iter().all(|group| !group.group.layout.is_empty()));
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
