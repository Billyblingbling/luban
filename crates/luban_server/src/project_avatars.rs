use anyhow::{Context as _, anyhow};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

pub const LUBAN_GITHUB_AVATAR_BASE_URL_ENV: &str = "LUBAN_GITHUB_AVATAR_BASE_URL";

const DEFAULT_GITHUB_AVATAR_BASE_URL: &str = "https://github.com";
const DEFAULT_GITHUB_AVATAR_SIZE: u32 = 64;
const DEFAULT_CACHE_TTL: Duration = Duration::from_secs(7 * 24 * 60 * 60);
const MAX_AVATAR_BYTES: usize = 2 * 1024 * 1024;

fn cache_root(luban_root: &Path) -> PathBuf {
    luban_root.join("cache").join("project-avatars").join("v1")
}

fn is_valid_github_owner(owner: &str) -> bool {
    let owner = owner.trim();
    if owner.is_empty() || owner.len() > 128 {
        return false;
    }
    owner
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn github_owner_from_repo_id(repo_id: &str) -> Option<&str> {
    let repo_id = repo_id.trim().trim_end_matches('/');
    let rest = repo_id.strip_prefix("github.com/")?;
    let mut parts = rest.split('/').filter(|s| !s.is_empty());
    let owner = parts.next()?;
    let _repo = parts.next()?;
    if !is_valid_github_owner(owner) {
        return None;
    }
    Some(owner)
}

fn github_avatar_base_url() -> String {
    std::env::var(LUBAN_GITHUB_AVATAR_BASE_URL_ENV)
        .ok()
        .map(|v| v.trim().trim_end_matches('/').to_owned())
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| DEFAULT_GITHUB_AVATAR_BASE_URL.to_owned())
}

fn github_owner_avatar_url(owner: &str) -> anyhow::Result<reqwest::Url> {
    if !is_valid_github_owner(owner) {
        return Err(anyhow!("invalid github owner"));
    }

    let base = github_avatar_base_url();
    let raw = format!("{base}/{owner}.png?size={DEFAULT_GITHUB_AVATAR_SIZE}");
    reqwest::Url::parse(&raw).context("failed to parse github avatar url")
}

fn cache_path_for_owner(cache_root: &Path, owner: &str) -> PathBuf {
    let hash = blake3::hash(owner.as_bytes()).to_hex().to_string();
    cache_root.join(format!("{hash}.png"))
}

async fn load_cached_png_if_fresh(path: &Path) -> anyhow::Result<Option<Vec<u8>>> {
    let meta = match tokio::fs::metadata(path).await {
        Ok(meta) => meta,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(err) => return Err(err).context("failed to stat cached avatar"),
    };

    let modified = meta.modified().unwrap_or(SystemTime::UNIX_EPOCH);
    let age = SystemTime::now()
        .duration_since(modified)
        .unwrap_or(Duration::from_secs(0));
    if age > DEFAULT_CACHE_TTL {
        return Ok(None);
    }

    let bytes = tokio::fs::read(path)
        .await
        .context("failed to read cached avatar")?;
    Ok(Some(bytes))
}

async fn load_cached_png_if_exists(path: &Path) -> anyhow::Result<Option<Vec<u8>>> {
    match tokio::fs::read(path).await {
        Ok(bytes) => Ok(Some(bytes)),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(err).context("failed to read cached avatar"),
    }
}

pub async fn get_or_fetch_owner_avatar_png(
    client: &reqwest::Client,
    luban_root: &Path,
    owner: &str,
) -> anyhow::Result<Option<Vec<u8>>> {
    if !is_valid_github_owner(owner) {
        return Ok(None);
    }

    let cache_root = cache_root(luban_root);
    let cache_path = cache_path_for_owner(&cache_root, owner);

    if let Some(bytes) = load_cached_png_if_fresh(&cache_path).await? {
        return Ok(Some(bytes));
    }

    let url = github_owner_avatar_url(owner)?;
    let fetched = async {
        let res = client
            .get(url)
            .send()
            .await
            .context("avatar request failed")?;

        if res.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !res.status().is_success() {
            return Err(anyhow!("avatar request returned status {}", res.status()));
        }

        if let Some(len) = res.content_length()
            && len as usize > MAX_AVATAR_BYTES
        {
            return Err(anyhow!("avatar response too large: {len} bytes"));
        }

        let bytes = res.bytes().await.context("read avatar bytes")?.to_vec();
        if bytes.len() > MAX_AVATAR_BYTES {
            return Err(anyhow!("avatar response too large: {} bytes", bytes.len()));
        }
        Ok(Some(bytes))
    }
    .await;

    match fetched {
        Ok(Some(bytes)) => {
            tokio::fs::create_dir_all(&cache_root)
                .await
                .context("failed to create avatar cache dir")?;

            let unique = SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos();
            let tmp_path = cache_path.with_extension(format!("png.tmp-{}", unique));

            tokio::fs::write(&tmp_path, &bytes)
                .await
                .context("failed to write avatar cache temp file")?;

            if let Err(err) = tokio::fs::rename(&tmp_path, &cache_path).await {
                let _ = tokio::fs::remove_file(&tmp_path).await;
                return Err(err).context("failed to persist avatar cache file");
            }

            Ok(Some(bytes))
        }
        Ok(None) => Ok(None),
        Err(err) => {
            if let Some(bytes) = load_cached_png_if_exists(&cache_path).await? {
                tracing::warn!(error = %err, "avatar fetch failed; serving stale cached avatar");
                Ok(Some(bytes))
            } else {
                Err(err)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn github_owner_from_repo_id_parses_owner() {
        assert_eq!(
            github_owner_from_repo_id("github.com/apache/opendal"),
            Some("apache")
        );
        assert_eq!(
            github_owner_from_repo_id("github.com/apache/opendal/"),
            Some("apache")
        );
    }

    #[test]
    fn github_owner_from_repo_id_rejects_non_github_repo_id() {
        assert_eq!(github_owner_from_repo_id("gitlab.com/apache/opendal"), None);
    }

    #[test]
    fn github_owner_from_repo_id_rejects_missing_segments() {
        assert_eq!(github_owner_from_repo_id("github.com/apache"), None);
        assert_eq!(github_owner_from_repo_id("github.com/"), None);
    }
}
