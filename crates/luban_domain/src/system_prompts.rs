use std::collections::HashMap;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub enum SystemTaskKind {
    InferType,
    RenameBranch,
}

impl SystemTaskKind {
    pub const ALL: [SystemTaskKind; 2] = [SystemTaskKind::InferType, SystemTaskKind::RenameBranch];

    pub fn as_key(self) -> &'static str {
        match self {
            SystemTaskKind::InferType => "infer-type",
            SystemTaskKind::RenameBranch => "rename-branch",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            SystemTaskKind::InferType => "Infer Type",
            SystemTaskKind::RenameBranch => "Rename Branch",
        }
    }
}

pub fn default_system_prompt_templates() -> HashMap<SystemTaskKind, String> {
    let mut out = HashMap::new();
    for kind in SystemTaskKind::ALL {
        out.insert(kind, default_system_prompt_template(kind));
    }
    out
}

pub fn default_system_prompt_template(kind: SystemTaskKind) -> String {
    match kind {
        SystemTaskKind::InferType => r#"You are classifying a user's input into a task intent kind.

Rules:
- Do NOT run commands.
- Do NOT modify files.
- Output ONLY a single JSON object, no markdown, no extra text.
- Always output a result, even if the input is vague: choose intent_kind="other".
- Do NOT include rationale, notes, or any extra fields in the output.
- Do NOT ask the user for more info in the output.

Allowed intent_kind values:
- fix
- implement
- review
- discuss
- other

Input:
{{task_input}}

Retrieved context (JSON):
{{context_json}}

Output JSON schema:
{
  "intent_kind": "<one of the allowed values>"
}
"#
        .to_owned(),
        SystemTaskKind::RenameBranch => r#"You are generating a git branch name.

Rules:
- Do NOT run commands.
- Do NOT modify files.
- Output ONLY a single line, no markdown, no extra text.
- Always output a result, even if the input is vague: output "luban/misc".
- Do NOT include rationale, notes, quotes, or code fences.
- Do NOT ask the user for more info.

Branch name requirements:
- Must start with "luban/".
- Must use lowercase letters, numbers, and hyphens only after the prefix.
- Keep it short (prefer <= 24 chars after "luban/").
- Use hyphens to connect words.
- Avoid trailing hyphens.
- Include identifiers (like issue/pr number) only when helpful.

Input:
{{task_input}}

Retrieved context:
{{context_json}}
"#
        .to_owned(),
    }
}
