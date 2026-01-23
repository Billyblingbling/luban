use std::fs;
use std::path::PathBuf;

fn read_repo_file(path: &str) -> String {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop(); // dev/
    root.push(path);
    fs::read_to_string(&root).expect("read repo file")
}

fn slice_between<'a>(haystack: &'a str, start: &str, end: &str) -> &'a str {
    let start_idx = haystack.find(start).expect("find start marker");
    let rest = &haystack[start_idx..];
    let end_idx = rest.find(end).expect("find end marker");
    &rest[..end_idx]
}

#[test]
fn mock_task_preview_selects_a_default_project() {
    let content = read_repo_file("web/lib/mock/mock-runtime.ts");
    let block = slice_between(&content, "if (action.type === \"task_preview\") {", "if (action.type === \"task_execute\") {");
    assert!(
        block.contains("project: { type: \"local_path\""),
        "task_preview should pick a default local_path project in mock mode"
    );
}

#[test]
fn mock_task_execute_create_mutates_state_with_new_workspace() {
    let content = read_repo_file("web/lib/mock/mock-runtime.ts");
    let block = slice_between(&content, "if (action.type === \"task_execute\") {", "if (action.type === \"feedback_submit\") {");
    assert!(
        block.contains("if (action.mode === \"create\")"),
        "task_execute should handle create mode in mock mode"
    );
    assert!(
        block.contains("project.workspaces.push"),
        "task_execute(create) should add a workspace to the selected project"
    );
    assert!(
        block.contains("state.threadsByWorkspace.set"),
        "task_execute(create) should initialize threadsByWorkspace for the new workspace"
    );
    assert!(
        block.contains("state.conversationsByWorkspaceThread.set"),
        "task_execute(create) should initialize a conversation for the created thread"
    );
}

