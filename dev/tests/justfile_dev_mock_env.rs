use std::fs;
use std::path::PathBuf;

fn read_repo_root_justfile() -> String {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.pop(); // dev/
    path.push("justfile");
    fs::read_to_string(&path).expect("read repo justfile")
}

#[test]
fn dev_mock_passes_next_public_luban_mode_to_pnpm_dev() {
    let content = read_repo_root_justfile();
    let lines: Vec<&str> = content.lines().collect();

    let start = lines
        .iter()
        .position(|line| line.contains("elif [ \"{{cmd}}\" = \"dev-mock\" ]; then"))
        .expect("find dev-mock recipe branch");

    let end = lines[start + 1..]
        .iter()
        .position(|line| line.contains("elif [ \"{{cmd}}\" = ") || line.trim_start().starts_with("else \\"))
        .map(|idx| start + 1 + idx)
        .unwrap_or(lines.len());

    let block = &lines[start..end];

    let channel_idx = block
        .iter()
        .position(|line| line.contains("channel=\"$([ \"{{profile}}\" = \"release\" ] && echo release || echo dev)\" &&"))
        .expect("find channel assignment in dev-mock block");

    let mode_lines: Vec<usize> = block
        .iter()
        .enumerate()
        .filter_map(|(idx, line)| {
            let trimmed = line.trim();
            trimmed
                .strip_prefix("NEXT_PUBLIC_LUBAN_MODE=")
                .and_then(|rest| rest.strip_prefix("mock"))
                .map(|_| idx)
        })
        .collect();
    assert_eq!(
        mode_lines.len(),
        1,
        "expected exactly one NEXT_PUBLIC_LUBAN_MODE=mock assignment in dev-mock block"
    );
    let mode_idx = mode_lines[0];

    let version_idx = block
        .iter()
        .position(|line| line.trim_start().starts_with("NEXT_PUBLIC_LUBAN_VERSION="))
        .expect("find NEXT_PUBLIC_LUBAN_VERSION assignment in dev-mock block");

    let pnpm_idx = block
        .iter()
        .position(|line| line.contains("pnpm dev"))
        .expect("find pnpm dev invocation in dev-mock block");

    assert!(
        channel_idx < mode_idx && mode_idx < version_idx && version_idx < pnpm_idx,
        "expected env assignments order: channel -> NEXT_PUBLIC_LUBAN_MODE -> NEXT_PUBLIC_LUBAN_VERSION -> pnpm dev"
    );
}

