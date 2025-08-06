(function() {
    window.get_wgl_bindings = (context) => {
        const decoder = new TextDecoder('utf8');
        const utf8decode = (bytes) => decoder.decode(bytes);

        const encoder = new TextEncoder('utf8');
        const utf8encode = (bytes) => encoder.encode(bytes);

        const objs = {};    // holds native js objects
        let objs_idx = 0;   // used by wasm to reference objects in objs
        const new_obj = function(obj) {
            objs[++objs_idx] = obj;
            return objs_idx;
        };
        const get_obj = function(idx) {
            return objs[idx];
        };

        const string_from_addr = function(addr) {
            var struct = new Int32Array(context.wasm.memory.buffer, addr, 2);
            var bytes = new Uint8Array(context.wasm.memory.buffer, struct[0], struct[1]);
            return utf8decode(bytes);
        };

        const array_from_addrlen = function(addr, len) {
            return new Float32Array(context.wasm.memory.buffer, addr, len);
        };

        return {
            sinf: (f) => {
                return Math.sin(f);
            },
            cosf: (f) => {
                return Math.cos(f);
            },
            tanf: (f) => {
                return Math.tan(f);
            },
            /*
            * misc
            */
            wgl_set_clear_color: (r, g, b, a) => {
                context.gl.clearColor(r, g, b, a);
            },
            wgl_clear_color_buffer: () => {
                context.gl.clear(context.gl.COLOR_BUFFER_BIT);
            },
            wgl_clear_depth_buffer: () => {
                context.gl.clear(context.gl.DEPTH_BUFFER_BIT);
            },
            wgl_enable_depthtest: () => {
                context.gl.enable(context.gl.DEPTH_TEST);
            },

            wgl_console_logf: (i) => {
                console.log(i);
            },
            wgl_console_logi: (i) => {
                console.log(i);
            },
            wgl_console_logs: (s) => {
                console.log(string_from_addr(s));
            },

            wgl_viewport: function(w, h) {
                context.gl.viewport(0, 0, w, h);
            },

            /*
            * shaders
            */
            wgl_create_program: (vstruct, fstruct) => {
                const p = context.gl.createProgram();
                const vsrc = string_from_addr(vstruct);
                const fsrc = string_from_addr(fstruct);
                const v = context.gl.createShader(context.gl.VERTEX_SHADER);
                const f = context.gl.createShader(context.gl.FRAGMENT_SHADER);
                context.gl.shaderSource(v, vsrc);
                context.gl.shaderSource(f, fsrc);
                context.gl.compileShader(v);
                context.gl.compileShader(f);
                context.gl.attachShader(p, v);
                context.gl.attachShader(p, f);
                context.gl.linkProgram(p);
                if (!context.gl.getProgramParameter(p, context.gl.LINK_STATUS)) {
                    console.log(context.gl.getShaderInfoLog(v));
                    console.log(context.gl.getShaderInfoLog(f));
                    console.log(context.gl.getProgramInfoLog(p));
                    return -1;
                }
                return new_obj(p);
            },
            wgl_use_program: (p) => {
                context.gl.useProgram(get_obj(p));
            },
            wgl_uniform_location: (p, addr) => {
                const name = string_from_addr(addr);
                const loc = context.gl.getUniformLocation(get_obj(p), name);
                return new_obj(loc);
            },
            wgl_uniform_mat4: (loc, m) => {
                const data = array_from_addrlen(m, 16);
                context.gl.uniformMatrix4fv(get_obj(loc), false, data);
            },
            wgl_uniform_vec4: (loc, v) => {
                const data = array_from_addrlen(v, 4);
                context.gl.uniform4fv(get_obj(loc), data);
            },
            wgl_uniform_vec3: (loc, v) => {
                const data = array_from_addrlen(v, 3);
                context.gl.uniform3fv(get_obj(loc), data);
            },
            /*
            * objects
            */
            wgl_gen_vertex_array: function() {
                return new_obj(context.gl.createVertexArray());
            },
            wgl_bind_vertex_array: function(vao) {
                context.gl.bindVertexArray(get_obj(vao));
            },

            /*
            * buffers
            */
            wgl_gen_buffer: function() {
                return new_obj(context.gl.createBuffer())
            },
            wgl_bind_buffer: function(obj) {
                context.gl.bindBuffer(context.gl.ARRAY_BUFFER, get_obj(obj));
            },
            wgl_buffer_data: function(addr, len) {
                const data = array_from_addrlen(addr, len);
                context.gl.bufferData(context.gl.ARRAY_BUFFER, data, context.gl.STATIC_DRAW);
            },
            wgl_vertex_attrib_pointer_name: function(p, addr, n, stride, ofst) {
                const a = context.gl.getAttribLocation(get_obj(p), string_from_addr(addr));
                if (a < 0) {
                    console.log('missing a!');
                    return;
                }
                context.gl.vertexAttribPointer(a, n, context.gl.FLOAT, false, stride*4, ofst*4);
                context.gl.enableVertexAttribArray(a);
            },
            wgl_vertex_attrib_pointer: function(a, n, stride, ofst) {
                if (a < 0) {
                    return;
                }
                context.gl.vertexAttribPointer(a, n, context.gl.FLOAT, false, stride*4, ofst*4);
                context.gl.enableVertexAttribArray(a);
            },

            /*
            * drawing
            */
            wgl_draw_arrays: function(start, len) {
                context.gl.drawArrays(context.gl.TRIANGLES, start, len);
            },

            /*
             * gamepad queries
             */
            gpq_axis0_x: function() {
                const gamepads = navigator.getGamepads();
                if (!gamepads || !gamepads[0]) {
                    return 0;
                }
                return gamepads[0].axes[0];
            },
            gpq_axis0_y: function() {
                const gamepads = navigator.getGamepads();
                if (!gamepads || !gamepads[0]) {
                    return 0;
                }
                return gamepads[0].axes[1];
            },
            gpq_axis1_x: function() {
                const gamepads = navigator.getGamepads();
                if (!gamepads || !gamepads[0]) {
                    return 0;
                }
                return gamepads[0].axes[2];
            },
            gpq_axis1_y: function() {
                const gamepads = navigator.getGamepads();
                if (!gamepads || !gamepads[0]) {
                    return 0;
                }
                return gamepads[0].axes[3];
            },
            gpq_btn0: function() {
                const gamepads = navigator.getGamepads();
                if (!gamepads || !gamepads[0]) {
                    return 0;
                }
                return gamepads[0].buttons[0].pressed;
            },
            gpq_btn1: function() {
                const gamepads = navigator.getGamepads();
                if (!gamepads || !gamepads[0]) {
                    return 0;
                }
                return gamepads[0].buttons[1].pressed;
            },
            gpq_btn2: function() {
                const gamepads = navigator.getGamepads();
                if (!gamepads || !gamepads[0]) {
                    return 0;
                }
                return gamepads[0].buttons[2].pressed;
            },
            gpq_btn3: function() {
                const gamepads = navigator.getGamepads();
                if (!gamepads || !gamepads[0]) {
                    return 0;
                }
                return gamepads[0].buttons[3].pressed;
            },
            gpq_btn4: function() {
                const gamepads = navigator.getGamepads();
                if (!gamepads || !gamepads[0]) {
                    return 0;
                }
                return gamepads[0].buttons[4].pressed;
            },
            gpq_btn5: function() {
                const gamepads = navigator.getGamepads();
                if (!gamepads || !gamepads[0]) {
                    return 0;
                }
                return gamepads[0].buttons[5].pressed;
            },
        };
    };
})();
