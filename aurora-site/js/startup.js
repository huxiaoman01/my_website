/**
 * 逐段执行初始化：某个模块失败时只记录日志，不影响其它功能。
 * 老浏览器上个别 API（存储、MediaQueryList 监听等）可能缺失或抛错，
 * 不能让一个模块把整个页面的初始化拖垮。
 */
export function safely(label, task) {
    try {
        return task();
    } catch (err) {
        console.error(`${label} 初始化失败:`, err);
        return undefined;
    }
}
