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
fn mock_create_workspace_sets_running_then_idles() {
    let content = read_repo_file("web/lib/mock/mock-runtime.ts");
    let block = slice_between(
        &content,
        "if (a.type === \"create_workspace\") {",
        "if (a.type === \"archive_workspace\") {",
    );

    assert!(
        block.contains("create_workspace_status = \"running\""),
        "create_workspace should set create_workspace_status to running"
    );
    assert!(
        block.contains("create_workspace_status = \"idle\""),
        "create_workspace should eventually set create_workspace_status to idle"
    );
    assert!(
        block.contains("window.setTimeout"),
        "create_workspace should be async (two-phase) in mock runtime"
    );
}

