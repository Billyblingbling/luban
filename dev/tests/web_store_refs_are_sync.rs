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
fn luban_store_updates_refs_before_react_state() {
    let content = read_repo_file("web/lib/luban-store.ts");

    let set_active_workspace_id = slice_between(&content, "function setActiveWorkspaceId(", "function setActiveThreadId(");
    assert!(
        set_active_workspace_id.contains("activeWorkspaceIdRef.current = resolved"),
        "setActiveWorkspaceId should update activeWorkspaceIdRef.current"
    );
    assert!(
        set_active_workspace_id.contains("_setActiveWorkspaceId(resolved)"),
        "setActiveWorkspaceId should pass resolved value to React state"
    );
    assert!(
        set_active_workspace_id.find("activeWorkspaceIdRef.current = resolved")
            < set_active_workspace_id.find("_setActiveWorkspaceId(resolved)"),
        "setActiveWorkspaceId should update ref before React state"
    );

    let set_active_thread_id = slice_between(&content, "function setActiveThreadId(", "function setThreads(");
    assert!(
        set_active_thread_id.contains("activeThreadIdRef.current = resolved"),
        "setActiveThreadId should update activeThreadIdRef.current"
    );
    assert!(
        set_active_thread_id.contains("_setActiveThreadId(resolved)"),
        "setActiveThreadId should pass resolved value to React state"
    );
    assert!(
        set_active_thread_id.find("activeThreadIdRef.current = resolved") < set_active_thread_id.find("_setActiveThreadId(resolved)"),
        "setActiveThreadId should update ref before React state"
    );

    let set_threads = slice_between(&content, "function setThreads(", "function setWorkspaceTabs(");
    assert!(
        set_threads.contains("threadsRef.current = resolved"),
        "setThreads should update threadsRef.current"
    );
    assert!(
        set_threads.contains("_setThreads(resolved)"),
        "setThreads should pass resolved value to React state"
    );
    assert!(
        set_threads.find("threadsRef.current = resolved") < set_threads.find("_setThreads(resolved)"),
        "setThreads should update ref before React state"
    );
}

