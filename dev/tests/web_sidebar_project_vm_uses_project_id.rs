use std::fs;
use std::path::PathBuf;

fn read_repo_file(path: &str) -> String {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop(); // dev/
    root.push(path);
    fs::read_to_string(&root).expect("read repo file")
}

#[test]
fn sidebar_project_vm_id_uses_project_id_not_path() {
    let content = read_repo_file("web/lib/sidebar-view-model.ts");
    assert!(
        content.contains("id: p.id"),
        "buildSidebarProjects should use the server project id (p.id) for SidebarProjectVm.id"
    );
    assert!(
        !content.contains("id: p.path"),
        "SidebarProjectVm.id should not use p.path (breaks actions like create_workspace/delete_project)"
    );
}

