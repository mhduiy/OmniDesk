use tauri::{Runtime, WebviewWindow};

pub mod x11;

pub trait DisplayBackend<R: Runtime> {
    fn mount_to_desktop(&self, window: &WebviewWindow<R>) -> Result<(), String>;
}
