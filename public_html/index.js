(async function() {
    document.addEventListener('DOMContentLoaded', async function() {
        let context = {
            canvas: null,
            wasm: null,
            gl: null
        };

        const on_resize = function(entries) {
            const dpr = window.devicePixelRatio;
            for (const entry of entries) {
                const box_sz = entry.devicePixelContentBoxSize[0];
                context.canvas.width = Math.round(box_sz.inlineSize);
                context.canvas.height = Math.round(box_sz.blockSize);
            }
            context.wasm.set_screen_sz(context.canvas.width, context.canvas.height);
        };

        const initialize = async function(module_exports) {
            context.wasm = module_exports;
            context.wasm.initialize();

            const observer = new ResizeObserver(on_resize);
            observer.observe(context.canvas, {box: 'content-box'});
        };

        const render = function(ms) {
            context.wasm.animate_frame(ms);
            requestAnimationFrame(render);
        };

        const run_wasm_module = async function(module) {
            await initialize(module.instance.exports);
            requestAnimationFrame(render);
        };

        context.canvas = document.getElementById('canvas');
        context.gl = context.canvas.getContext('webgl2');

        WebAssembly
            .instantiateStreaming(
                fetch("index.wasm"), 
                { env: get_wgl_bindings(context) })
            .then(run_wasm_module);
    });
})();
