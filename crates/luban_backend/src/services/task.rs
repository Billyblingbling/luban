use crate::services::GitWorkspaceService;
use anyhow::{Context as _, anyhow};
use luban_domain::{
    TaskDraft, TaskIntentKind, TaskIssueInfo, TaskProjectSpec, TaskPullRequestInfo, TaskRepoInfo,
};
use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;

#[derive(Clone, Debug, Eq, PartialEq)]
enum ParsedTaskInput {
    LocalPath(PathBuf),
    GitHubRepo { full_name: String },
    GitHubIssue { full_name: String, number: u64 },
    GitHubPullRequest { full_name: String, number: u64 },
}

fn extract_first_github_url(input: &str) -> Option<String> {
    let needle = "https://github.com/";
    let start = input.find(needle)?;
    let rest = &input[start..];
    let end = rest
        .find(|c: char| {
            c.is_whitespace() || c == '"' || c == '\'' || c == ')' || c == ']' || c == '>'
        })
        .unwrap_or(rest.len());
    let url = rest[..end].trim_end_matches('/').to_owned();
    Some(url)
}

fn parse_github_url(url: &str) -> Option<ParsedTaskInput> {
    let url = url.trim_end_matches('/');
    let prefix = "https://github.com/";
    if !url.starts_with(prefix) {
        return None;
    }
    let path = &url[prefix.len()..];
    let parts: Vec<&str> = path.split('/').filter(|p| !p.is_empty()).collect();
    if parts.len() < 2 {
        return None;
    }
    let full_name = format!("{}/{}", parts[0], parts[1]);
    if parts.len() == 2 {
        return Some(ParsedTaskInput::GitHubRepo { full_name });
    }
    if parts.len() >= 4 && parts[2] == "issues" {
        let number = parts[3].parse::<u64>().ok()?;
        return Some(ParsedTaskInput::GitHubIssue { full_name, number });
    }
    if parts.len() >= 4 && parts[2] == "pull" {
        let number = parts[3].parse::<u64>().ok()?;
        return Some(ParsedTaskInput::GitHubPullRequest { full_name, number });
    }
    Some(ParsedTaskInput::GitHubRepo { full_name })
}

fn looks_like_local_path(token: &str) -> bool {
    let t = token.trim();
    if t.starts_with("~/") || t.starts_with('/') || t.starts_with("./") || t.starts_with("../") {
        return true;
    }
    if t.len() >= 3 {
        let bytes = t.as_bytes();
        if bytes[1] == b':'
            && (bytes[2] == b'\\' || bytes[2] == b'/')
            && bytes[0].is_ascii_alphabetic()
        {
            return true;
        }
    }
    false
}

fn expand_tilde(path: &str) -> anyhow::Result<PathBuf> {
    if let Some(rest) = path.strip_prefix("~/") {
        let home = std::env::var_os("HOME").ok_or_else(|| anyhow!("HOME is not set"))?;
        return Ok(PathBuf::from(home).join(rest));
    }
    Ok(PathBuf::from(path))
}

fn parse_task_input(input: &str) -> anyhow::Result<ParsedTaskInput> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err(anyhow!("task input is empty"));
    }

    if let Some(url) = extract_first_github_url(trimmed) {
        return parse_github_url(&url).ok_or_else(|| anyhow!("unsupported GitHub URL: {url}"));
    }

    let tokens = trimmed.split_whitespace().map(|s| {
        s.trim_matches(|c: char| {
            c == '"' || c == '\'' || c == '(' || c == ')' || c == ',' || c == ';'
        })
    });

    for token in tokens.clone() {
        if token.is_empty() {
            continue;
        }
        if looks_like_local_path(token) {
            let path = expand_tilde(token)?;
            return Ok(ParsedTaskInput::LocalPath(path));
        }
    }

    for token in tokens {
        if token.is_empty() {
            continue;
        }
        let parts: Vec<&str> = token.trim_end_matches('/').split('/').collect();
        if parts.len() == 2 && !parts[0].is_empty() && !parts[1].is_empty() {
            return Ok(ParsedTaskInput::GitHubRepo {
                full_name: token.trim_end_matches('/').to_owned(),
            });
        }
    }

    Err(anyhow!(
        "unsupported input: provide a GitHub URL, owner/repo, or a local path"
    ))
}

fn ensure_gh_cli() -> anyhow::Result<()> {
    let status = Command::new("gh")
        .arg("--version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map_err(|err| {
            if err.kind() == std::io::ErrorKind::NotFound {
                anyhow!("missing gh executable: install GitHub CLI (gh) and ensure it is available on PATH")
            } else {
                anyhow!(err).context("failed to spawn gh")
            }
        })?;
    if !status.success() {
        return Err(anyhow!("gh --version failed with status: {status}"));
    }
    Ok(())
}

fn run_gh_json<T: for<'de> Deserialize<'de>>(args: &[&str]) -> anyhow::Result<T> {
    let out = Command::new("gh").args(args).output().map_err(|err| {
        if err.kind() == std::io::ErrorKind::NotFound {
            anyhow!(
                "missing gh executable: install GitHub CLI (gh) and ensure it is available on PATH"
            )
        } else {
            anyhow!(err).context("failed to spawn gh")
        }
    })?;
    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        return Err(anyhow!("gh failed ({}): {}", out.status, stderr.trim()));
    }
    let stdout = String::from_utf8_lossy(&out.stdout);
    let parsed = serde_json::from_str::<T>(stdout.trim())
        .with_context(|| format!("failed to parse gh json for args: {}", args.join(" ")))?;
    Ok(parsed)
}

#[derive(Deserialize)]
struct GhDefaultBranchRef {
    #[serde(default)]
    name: Option<String>,
}

#[derive(Deserialize)]
struct GhRepoView {
    #[serde(rename = "nameWithOwner")]
    name_with_owner: String,
    url: String,
    #[serde(rename = "defaultBranchRef")]
    default_branch_ref: Option<GhDefaultBranchRef>,
}

#[derive(Deserialize)]
struct GhIssueView {
    title: String,
    url: String,
}

#[derive(Deserialize)]
struct GhPrView {
    title: String,
    url: String,
    #[serde(rename = "headRefName")]
    head_ref_name: Option<String>,
    #[serde(rename = "baseRefName")]
    base_ref_name: Option<String>,
    mergeable: Option<String>,
}

#[derive(Deserialize)]
struct TaskIntentModelOutput {
    intent_kind: String,
    summary: String,
    prompt: String,
}

fn model_prompt_for_task_intent(input: &str, context_json: &str) -> String {
    format!(
        r#"You are generating a task draft for a local, single-user developer tool.

Rules:
- Do NOT run commands.
- Do NOT modify files.
- Output ONLY a single JSON object, no markdown, no extra text.
- If the context is insufficient to decide, set intent_kind="other" and explain what is missing in summary, but still produce a safe prompt that asks for the missing info.

Allowed intent_kind values:
- fix_issue
- implement_feature
- review_pull_request
- resolve_pull_request_conflicts
- add_project
- other

Input:
{input}

Retrieved context (JSON):
{context_json}

Output JSON schema:
{{
  "intent_kind": "<one of the allowed values>",
  "summary": "<2-6 sentences, concrete and actionable>",
  "prompt": "<a runnable first user message for the coding agent>"
}}
"#
    )
}

fn parse_intent_kind(raw: &str) -> TaskIntentKind {
    match raw.trim().to_ascii_lowercase().as_str() {
        "fix_issue" => TaskIntentKind::FixIssue,
        "implement_feature" => TaskIntentKind::ImplementFeature,
        "review_pull_request" => TaskIntentKind::ReviewPullRequest,
        "resolve_pull_request_conflicts" => TaskIntentKind::ResolvePullRequestConflicts,
        "add_project" => TaskIntentKind::AddProject,
        _ => TaskIntentKind::Other,
    }
}

fn parse_local_repo_root(path: &Path) -> anyhow::Result<PathBuf> {
    let out = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(path)
        .output()
        .context("failed to run git rev-parse")?;
    if !out.status.success() {
        return Err(anyhow!("path is not a git repository: {}", path.display()));
    }
    let raw = String::from_utf8_lossy(&out.stdout);
    let root = raw.trim();
    if root.is_empty() {
        return Err(anyhow!("git rev-parse returned empty path"));
    }
    Ok(PathBuf::from(root))
}

pub(super) fn task_preview(
    service: &GitWorkspaceService,
    input: String,
) -> anyhow::Result<TaskDraft> {
    ensure_gh_cli()?;

    let parsed = parse_task_input(&input)?;

    let mut repo: Option<TaskRepoInfo> = None;
    let mut issue: Option<TaskIssueInfo> = None;
    let mut pull_request: Option<TaskPullRequestInfo> = None;

    let project = match &parsed {
        ParsedTaskInput::LocalPath(path) => {
            let root = parse_local_repo_root(path)?;
            TaskProjectSpec::LocalPath { path: root }
        }
        ParsedTaskInput::GitHubRepo { full_name } => TaskProjectSpec::GitHubRepo {
            full_name: full_name.clone(),
        },
        ParsedTaskInput::GitHubIssue { full_name, .. } => TaskProjectSpec::GitHubRepo {
            full_name: full_name.clone(),
        },
        ParsedTaskInput::GitHubPullRequest { full_name, .. } => TaskProjectSpec::GitHubRepo {
            full_name: full_name.clone(),
        },
    };

    let context_json = match &parsed {
        ParsedTaskInput::LocalPath(path) => {
            let root = match &project {
                TaskProjectSpec::LocalPath { path } => path.clone(),
                _ => path.clone(),
            };
            serde_json::json!({
                "kind": "local_path",
                "path": root.to_string_lossy(),
            })
        }
        ParsedTaskInput::GitHubRepo { full_name } => {
            let view: GhRepoView = run_gh_json(&[
                "repo",
                "view",
                full_name,
                "--json",
                "nameWithOwner,url,defaultBranchRef",
            ])?;
            repo = Some(TaskRepoInfo {
                full_name: view.name_with_owner.clone(),
                url: view.url.clone(),
                default_branch: view
                    .default_branch_ref
                    .and_then(|r| r.name)
                    .filter(|s| !s.trim().is_empty()),
            });
            serde_json::json!({
                "kind": "repo",
                "repo": repo.as_ref().map(|r| {
                    serde_json::json!({
                        "full_name": r.full_name,
                        "url": r.url,
                        "default_branch": r.default_branch,
                    })
                }),
            })
        }
        ParsedTaskInput::GitHubIssue { full_name, number } => {
            let repo_view: GhRepoView = run_gh_json(&[
                "repo",
                "view",
                full_name,
                "--json",
                "nameWithOwner,url,defaultBranchRef",
            ])?;
            repo = Some(TaskRepoInfo {
                full_name: repo_view.name_with_owner.clone(),
                url: repo_view.url.clone(),
                default_branch: repo_view
                    .default_branch_ref
                    .and_then(|r| r.name)
                    .filter(|s| !s.trim().is_empty()),
            });
            let issue_view: GhIssueView = run_gh_json(&[
                "issue",
                "view",
                &number.to_string(),
                "-R",
                full_name,
                "--json",
                "title,url",
            ])?;
            issue = Some(TaskIssueInfo {
                number: *number,
                title: issue_view.title,
                url: issue_view.url,
            });
            serde_json::json!({
                "kind": "issue",
                "repo": repo.as_ref().map(|r| {
                    serde_json::json!({
                        "full_name": r.full_name,
                        "url": r.url,
                        "default_branch": r.default_branch,
                    })
                }),
                "issue": issue.as_ref().map(|i| {
                    serde_json::json!({
                        "number": i.number,
                        "title": i.title,
                        "url": i.url,
                    })
                }),
            })
        }
        ParsedTaskInput::GitHubPullRequest { full_name, number } => {
            let repo_view: GhRepoView = run_gh_json(&[
                "repo",
                "view",
                full_name,
                "--json",
                "nameWithOwner,url,defaultBranchRef",
            ])?;
            repo = Some(TaskRepoInfo {
                full_name: repo_view.name_with_owner.clone(),
                url: repo_view.url.clone(),
                default_branch: repo_view
                    .default_branch_ref
                    .and_then(|r| r.name)
                    .filter(|s| !s.trim().is_empty()),
            });
            let pr_view: GhPrView = run_gh_json(&[
                "pr",
                "view",
                &number.to_string(),
                "-R",
                full_name,
                "--json",
                "title,url,headRefName,baseRefName,mergeable",
            ])?;
            pull_request = Some(TaskPullRequestInfo {
                number: *number,
                title: pr_view.title,
                url: pr_view.url,
                head_ref: pr_view.head_ref_name,
                base_ref: pr_view.base_ref_name,
                mergeable: pr_view.mergeable,
            });
            serde_json::json!({
                "kind": "pull_request",
                "repo": repo.as_ref().map(|r| {
                    serde_json::json!({
                        "full_name": r.full_name,
                        "url": r.url,
                        "default_branch": r.default_branch,
                    })
                }),
                "pull_request": pull_request.as_ref().map(|pr| {
                    serde_json::json!({
                        "number": pr.number,
                        "title": pr.title,
                        "url": pr.url,
                        "head_ref": pr.head_ref,
                        "base_ref": pr.base_ref,
                        "mergeable": pr.mergeable,
                    })
                }),
            })
        }
    };

    let prompt = model_prompt_for_task_intent(&input, &context_json.to_string());

    let cancel = Arc::new(AtomicBool::new(false));
    let mut agent_messages: Vec<String> = Vec::new();
    service.run_codex_turn_streamed_via_cli(
        super::CodexTurnParams {
            thread_id: None,
            worktree_path: std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")),
            prompt,
            image_paths: Vec::new(),
            model: Some("gpt-5.2-codex".to_owned()),
            model_reasoning_effort: Some("low".to_owned()),
            sandbox_mode: Some("read-only".to_owned()),
        },
        cancel,
        |event| {
            if let luban_domain::CodexThreadEvent::ItemCompleted {
                item: luban_domain::CodexThreadItem::AgentMessage { text, .. },
            } = event
            {
                agent_messages.push(text);
            }
            Ok(())
        },
    )?;

    let raw = agent_messages
        .into_iter()
        .rev()
        .find(|s| !s.trim().is_empty())
        .ok_or_else(|| anyhow!("codex returned no agent_message output"))?;

    let output: TaskIntentModelOutput =
        serde_json::from_str(raw.trim()).context("failed to parse codex task intent json")?;

    Ok(TaskDraft {
        input,
        project,
        intent_kind: parse_intent_kind(&output.intent_kind),
        summary: output.summary,
        prompt: output.prompt,
        repo,
        issue,
        pull_request,
    })
}

pub(super) fn task_prepare_project(
    service: &GitWorkspaceService,
    spec: TaskProjectSpec,
) -> anyhow::Result<PathBuf> {
    ensure_gh_cli()?;

    match spec {
        TaskProjectSpec::LocalPath { path } => {
            if !path.exists() {
                return Err(anyhow!("path does not exist: {}", path.display()));
            }
            Ok(path)
        }
        TaskProjectSpec::GitHubRepo { full_name } => {
            let mut it = full_name.split('/');
            let owner = it
                .next()
                .ok_or_else(|| anyhow!("invalid repo: {full_name}"))?;
            let name = it
                .next()
                .ok_or_else(|| anyhow!("invalid repo: {full_name}"))?;
            if it.next().is_some() {
                return Err(anyhow!("invalid repo: {full_name}"));
            }

            let luban_root = service
                .worktrees_root
                .parent()
                .ok_or_else(|| {
                    anyhow!(
                        "invalid worktrees_root: {}",
                        service.worktrees_root.display()
                    )
                })?
                .to_path_buf();
            let projects_root = luban_domain::paths::projects_root(&luban_root);
            let dest = projects_root.join(owner).join(name);

            if dest.exists() {
                return Ok(dest);
            }

            std::fs::create_dir_all(dest.parent().unwrap_or(&projects_root))
                .with_context(|| format!("failed to create {}", projects_root.display()))?;

            let status = Command::new("gh")
                .args(["repo", "clone", &full_name])
                .arg(&dest)
                .status()
                .map_err(|err| {
                    if err.kind() == std::io::ErrorKind::NotFound {
                        anyhow!("missing gh executable: install GitHub CLI (gh) and ensure it is available on PATH")
                    } else {
                        anyhow!(err).context("failed to spawn gh")
                    }
                })?;

            if !status.success() {
                return Err(anyhow!("gh repo clone failed with status: {status}"));
            }

            Ok(dest)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_github_repo_url() {
        let parsed = parse_task_input("https://github.com/openai/openai-cookbook").unwrap();
        assert_eq!(
            parsed,
            ParsedTaskInput::GitHubRepo {
                full_name: "openai/openai-cookbook".to_owned()
            }
        );
    }

    #[test]
    fn parse_github_issue_url() {
        let parsed =
            parse_task_input("https://github.com/openai/openai-cookbook/issues/123").unwrap();
        assert_eq!(
            parsed,
            ParsedTaskInput::GitHubIssue {
                full_name: "openai/openai-cookbook".to_owned(),
                number: 123
            }
        );
    }

    #[test]
    fn parse_github_pr_url() {
        let parsed =
            parse_task_input("https://github.com/openai/openai-cookbook/pull/456").unwrap();
        assert_eq!(
            parsed,
            ParsedTaskInput::GitHubPullRequest {
                full_name: "openai/openai-cookbook".to_owned(),
                number: 456
            }
        );
    }

    #[test]
    fn parse_owner_repo_token() {
        let parsed = parse_task_input("openai/openai-cookbook").unwrap();
        assert_eq!(
            parsed,
            ParsedTaskInput::GitHubRepo {
                full_name: "openai/openai-cookbook".to_owned()
            }
        );
    }

    #[test]
    fn parse_local_path_token() {
        let parsed = parse_task_input("~/repo").unwrap();
        match parsed {
            ParsedTaskInput::LocalPath(path) => {
                assert!(path.to_string_lossy().contains("repo"));
            }
            other => panic!("unexpected: {other:?}"),
        }
    }
}
