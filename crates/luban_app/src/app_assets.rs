use gpui::{AssetSource, Result, SharedString};
use gpui_component_assets::Assets as ComponentAssets;
use std::borrow::Cow;

const BRAIN_SVG: &[u8] = include_bytes!("../assets/icons/brain.svg");
const GIT_BRANCH_SVG: &[u8] = include_bytes!("../assets/icons/git-branch.svg");
const GIT_PULL_REQUEST_ARROW_SVG: &[u8] =
    include_bytes!("../assets/icons/git-pull-request-arrow.svg");
const HOUSE_SVG: &[u8] = include_bytes!("../assets/icons/house.svg");
const TIMER_SVG: &[u8] = include_bytes!("../assets/icons/timer.svg");
const ZED_SVG: &[u8] = include_bytes!("../assets/icons/zed.svg");

pub struct AppAssets {
    fallback: ComponentAssets,
}

impl Default for AppAssets {
    fn default() -> Self {
        Self {
            fallback: ComponentAssets,
        }
    }
}

impl AssetSource for AppAssets {
    fn load(&self, path: &str) -> Result<Option<Cow<'static, [u8]>>> {
        if path.is_empty() {
            return Ok(None);
        }

        match path {
            "icons/brain.svg" => Ok(Some(Cow::Borrowed(BRAIN_SVG))),
            "icons/git-branch.svg" => Ok(Some(Cow::Borrowed(GIT_BRANCH_SVG))),
            "icons/git-pull-request-arrow.svg" => {
                Ok(Some(Cow::Borrowed(GIT_PULL_REQUEST_ARROW_SVG)))
            }
            "icons/house.svg" => Ok(Some(Cow::Borrowed(HOUSE_SVG))),
            "icons/timer.svg" => Ok(Some(Cow::Borrowed(TIMER_SVG))),
            "icons/zed.svg" => Ok(Some(Cow::Borrowed(ZED_SVG))),
            _ => self.fallback.load(path),
        }
    }

    fn list(&self, path: &str) -> Result<Vec<SharedString>> {
        let mut assets = self.fallback.list(path)?;

        if "icons/brain.svg".starts_with(path) {
            assets.push("icons/brain.svg".into());
        }
        if "icons/git-branch.svg".starts_with(path) {
            assets.push("icons/git-branch.svg".into());
        }
        if "icons/git-pull-request-arrow.svg".starts_with(path) {
            assets.push("icons/git-pull-request-arrow.svg".into());
        }
        if "icons/house.svg".starts_with(path) {
            assets.push("icons/house.svg".into());
        }
        if "icons/timer.svg".starts_with(path) {
            assets.push("icons/timer.svg".into());
        }
        if "icons/zed.svg".starts_with(path) {
            assets.push("icons/zed.svg".into());
        }

        assets.sort();
        assets.dedup();
        Ok(assets)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_assets_load_custom_icons() {
        let assets = AppAssets::default();

        for path in [
            "icons/house.svg",
            "icons/git-branch.svg",
            "icons/git-pull-request-arrow.svg",
        ] {
            let loaded = assets.load(path).expect("asset load should not fail");
            assert!(loaded.is_some(), "expected asset to exist: {path}");
        }
    }
}
