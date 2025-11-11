use crate::types::{FileResult, Issue};
use dashmap::DashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tracing::debug;

#[derive(Clone)]
struct CacheEntry {
    mtime: SystemTime,
    issues: Vec<Issue>,
}

pub struct FileCache {
    entries: DashMap<PathBuf, CacheEntry>,
}

impl FileCache {
    pub fn new() -> Self {
        Self {
            entries: DashMap::new(),
        }
    }

    pub fn get(&self, path: &Path) -> Option<Vec<Issue>> {
        let metadata = fs::metadata(path).ok()?;
        let mtime = metadata.modified().ok()?;

        if let Some(entry) = self.entries.get(path) {
            if entry.mtime == mtime {
                debug!("Cache hit: {:?}", path);
                return Some(entry.issues.clone());
            } else {
                debug!("Cache stale (mtime changed): {:?}", path);
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
