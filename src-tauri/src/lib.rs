use std::fs;
use std::path::PathBuf;

fn portable_data_dir() -> Result<PathBuf, String> {
  let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
  let exe_dir = exe_path
    .parent()
    .ok_or_else(|| "could not resolve executable directory".to_string())?;

  // On macOS, app bundles run from inside MyApp.app/Contents/MacOS, so we
  // walk back up to the folder containing the .app bundle to stay portable
  // (e.g. on a USB key) instead of writing inside the read-only bundle.
  let data_dir = if cfg!(target_os = "macos") {
    exe_dir
      .ancestors()
      .find(|p| p.extension().map(|e| e == "app").unwrap_or(false))
      .and_then(|app_bundle| app_bundle.parent())
      .map(|p| p.to_path_buf())
      .unwrap_or_else(|| exe_dir.to_path_buf())
  } else {
    exe_dir.to_path_buf()
  };

  Ok(data_dir.join("appli-eval-pratique-data"))
}

#[tauri::command]
fn load_storage() -> Result<String, String> {
  let dir = portable_data_dir()?;
  let file = dir.join("storage.json");
  if !file.exists() {
    return Ok("{}".to_string());
  }
  fs::read_to_string(&file).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_storage(contents: String) -> Result<(), String> {
  let dir = portable_data_dir()?;
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  fs::write(dir.join("storage.json"), contents).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![load_storage, save_storage])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
