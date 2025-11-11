use crate::types::Issue;
use dashmap::DashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tracing::debug;

#[derive(Clone)]
struct CacheEntry {
    mtime: SystemTime,
    config_hash: u64,
    issues: Vec<Issue>,
}

pub struct FileCache {
    entries: DashMap<PathBuf, CacheEntry>,
    config_hash: u64,
}

impl FileCache {
    pub fn new() -> Self {
        Self {
            entries: DashMap::new(),
            config_hash: 0,
        }
    }

    pub fn with_config_hash(config_hash: u64) -> Self {
        Self {
            entries: DashMap::new(),
            config_hash,
        }
    }

    pub fn get(&self, path: &Path) -> Option<Vec<Issue>> {
        let metadata = fs::metadata(path).ok()?;
        let mtime = metadata.modified().ok()?;

        if let Some(entry) = self.entries.get(path) {
            if entry.mtime == mtime && entry.config_hash == self.config_hash {
                debug!("Cache hit: {:?}", path);
                return Some(entry.issues.clone());
            } else if entry.mtime != mtime {
                debug!("Cache stale (mtime changed): {:?}", path);
            } else {
                debug!("Cache stale (config changed): {:?}", path);
            }
        }

        None
    }

    pub fn insert(&self, path: PathBuf, issues: Vec<Issue>) {
        if let Ok(metadata) = fs::metadata(&path) {
            if let Ok(mtime) = metadata.modified() {
                self.entries.insert(
                    path,
                    CacheEntry {
                        mtime,
                        config_hash: self.config_hash,
                        issues: issues.clone(),
                    },
                );
            }
        }
    }

    pub fn invalidate(&self, path: &Path) {
        debug!("Invalidating cache: {:?}", path);
        self.entries.remove(path);
    }

    pub fn clear(&self) {
        debug!("Clearing all cache entries");
        self.entries.clear();
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }
}
