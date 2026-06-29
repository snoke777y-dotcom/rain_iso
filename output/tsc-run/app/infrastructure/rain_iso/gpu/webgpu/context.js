export function createWebGpuContext(options = {}) {
    return {
        kind: "webgpu",
        adapterName: options.adapterName
    };
}
