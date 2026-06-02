use super::DisplayBackend;
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use tauri::{Runtime, WebviewWindow};
use x11rb::connection::Connection;
use x11rb::protocol::xproto::{AtomEnum, PropMode, ConnectionExt as XprotoConnectionExt};
use x11rb::wrapper::ConnectionExt as WrapperConnectionExt;
use x11rb::rust_connection::RustConnection;

pub struct X11Backend;

impl<R: Runtime> DisplayBackend<R> for X11Backend {
    fn mount_to_desktop(&self, window: &WebviewWindow<R>) -> Result<(), String> {
        let handle = window.window_handle().map_err(|e| e.to_string())?;
        
        let xid = match handle.as_raw() {
            RawWindowHandle::Xlib(h) => h.window as u32,
            RawWindowHandle::Xcb(h) => h.window.get(),
            _ => return Err("Window is not an X11 window".to_string()),
        };

        let (conn, _screen_num) = RustConnection::connect(None).map_err(|e| e.to_string())?;

        // Intern atoms
        let wm_window_type = conn.intern_atom(false, b"_NET_WM_WINDOW_TYPE")
            .map_err(|e| e.to_string())?
            .reply()
            .map_err(|e| e.to_string())?
            .atom;

        let desktop_type = conn.intern_atom(false, b"_NET_WM_WINDOW_TYPE_DESKTOP")
            .map_err(|e| e.to_string())?
            .reply()
            .map_err(|e| e.to_string())?
            .atom;

        let wm_state = conn.intern_atom(false, b"_NET_WM_STATE")
            .map_err(|e| e.to_string())?
            .reply()
            .map_err(|e| e.to_string())?
            .atom;

        let skip_taskbar = conn.intern_atom(false, b"_NET_WM_STATE_SKIP_TASKBAR")
            .map_err(|e| e.to_string())?
            .reply()
            .map_err(|e| e.to_string())?
            .atom;

        let skip_pager = conn.intern_atom(false, b"_NET_WM_STATE_SKIP_PAGER")
            .map_err(|e| e.to_string())?
            .reply()
            .map_err(|e| e.to_string())?
            .atom;

        // Set window type to desktop
        conn.change_property32(
            PropMode::REPLACE,
            xid,
            wm_window_type,
            AtomEnum::ATOM,
            &[desktop_type],
        ).map_err(|e| e.to_string())?;

        // Skip taskbar and pager
        conn.change_property32(
            PropMode::REPLACE,
            xid,
            wm_state,
            AtomEnum::ATOM,
            &[skip_taskbar, skip_pager],
        ).map_err(|e| e.to_string())?;

        conn.flush().map_err(|e| e.to_string())?;

        Ok(())
    }
}
