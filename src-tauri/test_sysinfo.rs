use sysinfo::System;

fn main() {
    let mut sys = System::new_all();
    sys.refresh_all();
    std::thread::sleep(std::time::Duration::from_millis(100));
    sys.refresh_cpu_usage();
    let cpu_usage = sys.global_cpu_usage();
    let total_mem = sys.total_memory();
    let used_mem = sys.used_memory();
    println!("cpu: {}, mem: {} / {}", cpu_usage, used_mem, total_mem);
}
