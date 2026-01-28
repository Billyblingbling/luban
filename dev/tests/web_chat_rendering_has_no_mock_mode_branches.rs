use std::fs;
use std::path::PathBuf;

fn read_repo_file(path: &str) -> String {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop(); // dev/
    root.push(path);
    fs::read_to_string(&root).expect("read repo file")
}

fn assert_not_contains(haystack: &str, needle: &str, ctx: &str) {
    assert!(
        !haystack.contains(needle),
        "unexpected mock/real branching token {needle:?} in {ctx}"
    );
}

#[test]
fn chat_rendering_must_not_branch_on_mock_mode() {
    // Contract: chat UI must use a single rendering path for both mock mode and real mode.
    // Mock mode may change data sources (transport / fixtures), but must not change rendering.
    //
    // Note: this is enforced as a repo-text invariant so it stays cheap and CI-friendly.
    let files = [
        "web/components/chat-panel.tsx",
        "web/lib/conversation-ui.ts",
        "web/components/shared/status-indicator.tsx",
    ];

    for path in files {
        let content = read_repo_file(path);
        assert_not_contains(&content, "isMockMode(", path);
        assert_not_contains(&content, "lubanMode(", path);
        assert_not_contains(&content, "__LUBAN_MODE__", path);
        assert_not_contains(&content, "NEXT_PUBLIC_LUBAN_MODE", path);
    }
}

