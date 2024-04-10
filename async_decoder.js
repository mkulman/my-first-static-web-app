// ========== Constants and Variable Declarations ==========

const MAX_TEXTURE_POOL_SIZE = 5;
let pendingFrames = [],
    underflow = true,
    night = false,
    frameTimes = [],
    runtime = 0,
    frameCounter = 0,
    sps, decoder, socket, height, width, port, gl, heart = 0,
    lastheart = 0, pongtimer, frameRate;

const texturePool = [];

// ========== Utility Functions ==========

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function appendByteArray(buffer1, buffer2) {
    const tmp = new Uint8Array((buffer1.byteLength | 0) + (buffer2.byteLength | 0));
    tmp.set(buffer1, 0);
    tmp.set(buffer2, buffer1.byteLength | 0);
    return tmp;
}

// ========== Frame Functions ==========

function updateFrameCounter() {
    frameTimes[runtime] = frameCounter;
    frameRate = Math.round((frameCounter - frameTimes[runtime - 10]) / 10);
    runtime++;
}

function getFrameStats() {
    frameCounter++;
    return frameRate;
}

// ========== WebGL and Canvas Functions ==========

function getTexture(gl) {
    if (texturePool.length > 0) return texturePool.pop();
    return gl.createTexture();
}

function releaseTexture(gl, texture) {
    if (texturePool.length < MAX_TEXTURE_POOL_SIZE) {
        texturePool.push(texture);
    } else {
        gl.deleteTexture(texture);
    }
}

function drawImageToCanvas(image) {
    const texture = getTexture(gl);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    if (isPowerOf2(width) && isPowerOf2(height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindTexture(gl.TEXTURE_2D, null);
    releaseTexture(gl, texture);

    if (image.close) {
        image.close();
    }
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);s
}

function initCanvas(canvas) {

    height = canvas.height;
    width = canvas.width;

    gl = canvas.getContext('webgl2');

    const vertexSource = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0, 1);
            v_texCoord = a_texCoord;
        }
    `;
    const fragmentSource = `
        precision mediump float;
        uniform sampler2D u_image;
        varying vec2 v_texCoord;
        void main() {
            gl_FragColor = texture2D(u_image, v_texCoord);
        }
    `;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    positionLocation = gl.getAttribLocation(program, "a_position");
    texcoordLocation = gl.getAttribLocation(program, "a_texCoord");

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]), gl.STATIC_DRAW);

    texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0]), gl.STATIC_DRAW);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    decoder = new VideoDecoder({
        output: (frame) => {
            pendingFrames.push(frame);
            if (underflow) {
                renderFrame();
            }
        },
        error: (e) => {
            // gl=canvas.getContext('2d');

        },
    })

    startSocket();
}

// ========== Rendering and Decoder Functions ==========

async function renderFrame() {
    underflow = pendingFrames.length === 0;
    if (underflow) {
        return;
    }
    const frame = pendingFrames.shift();
    drawImageToCanvas(frame);

    if (pendingFrames.length < 5) {
        socket.sendObject({action: "ACK"});
    }
    try {
        self.postMessage({
            fps: getFrameStats(),
            decodeQueueSize: decoder.decodeQueueSize,
            pendingFrames: pendingFrames.length
        });
    } catch (e) {

        self.postMessage({error: e});
    }
    renderFrame();
}

function separateNalUnits(event){
    let i = -1;
    return event
        .reduce((output, value, index, self) => {
            if (value === 0 && self[index + 1] === 0 && self[index + 2] === 0 && self[index + 3] === 1) {
                i++;
            }
            if (!output[i]) {
                output[i] = [];
            }
            output[i].push(value);
            return output;
        }, [])
        .map(dat => Uint8Array.from(dat));
}

function videoMagic(dat){
    let unittype = (dat[4] & 0x1f);
    if (unittype === 1) {
        let chunk = new EncodedVideoChunk({
            type: 'delta',
            timestamp: 0,
            duration: 0,
            data: dat
        });
        if (decoder.state !== 'closed') {
            decoder.decode(chunk);
        } else {
            self.postMessage({error: true});
        }
        return;
    }

    if (unittype === 5) {
        let data = appendByteArray(sps, dat);

        let chunk = new EncodedVideoChunk({
            type: 'key',
            timestamp: 0,
            duration: 0,
            data: data
        });
        if (decoder.state !== 'closed') {
            decoder.decode(chunk);
        } else {
            self.postMessage({error: true});
        }
    }
}

function headerMagic(dat) {
    let unittype = (dat[4] & 0x1f);

    if (unittype === 7) {
        let config = {
            codec: "avc1.",
            codedHeight: height,
            codedWidth: width,
        }
        for (let i = 5; i < 8; ++i) {
            var h = dat[i].toString(16);
            if (h.length < 2) {
                h = '0' + h;
            }
            config.codec += h;
        }
        sps = dat;
        decoder.configure(config);

        return;
    }
    else if (unittype === 8)
        sps=appendByteArray(sps,dat)
    else
        videoMagic(dat);
}

// ========== Socket and Message Handling ==========

function noPong() {
    self.postMessage({error: "no pong"});
}

function heartbeat() {
    if (lastheart !== 0) {
        if ((Date.now() - lastheart) > 3000) {
            if (socket.readyState === WebSocket.OPEN) {
                try {
                    socket.sendObject({action: "START"});
                } catch (e) {
                    self.postMessage({error: e});
                    startSocket();
                }
            }
        }
    }

    lastheart = Date.now();
    socket.sendObject({action: "PING"});
}



function handleMessage(event) {
    const dat = new Uint8Array(event.data)
    handleVideoMessage(dat)
}

function handleVideoMessage(dat){

    let unittype = (dat[4] & 0x1f);
    if (unittype === 31)
    {
        if (pongtimer !== null)
            clearTimeout(pongtimer);

        pongtimer=setTimeout(noPong,3000);
        return;
    }
    if (unittype === 1 || unittype === 5)
        videoMagic(dat)
    else
        separateNalUnits(dat).forEach(headerMagic)
}

function startSocket() {
    socket = new WebSocket(`wss://teslaa.androidwheels.com:${port}`);
    socket.sendObject = (obj) => {
        try {
            socket.send(JSON.stringify(obj));
        }
        catch (e)
        {
            self.postMessage({error:e});
        }
    }

    socket.binaryType = "arraybuffer";
    socket.addEventListener('open', () => {
        socket.binaryType = "arraybuffer";
        socket.sendObject({action: "START"});
        socket.sendObject({action: "NIGHT", value: night});
        if (heart === 0) {
            heart = setInterval(heartbeat, 200);
            setInterval(updateFrameCounter, 1000)
        }
    });

    socket.addEventListener('close', socketClose);
    socket.addEventListener('error', socketClose);
    socket.addEventListener('message', event => handleMessage(event));
}

function socketClose() {
    self.postMessage({error: "Lost connection to phone, trying to reconnect"});
    startSocket();
}


let appVersion=22;
self.addEventListener('message', (message) => {

    if (message.data.action === 'INIT') {
        port = message.data.port;
        appVersion=parseInt(message.data.appVersion);
        initCanvas(message.data.canvas)

    } else {
        if (message.data.action === 'NIGHT') {
            night = message.data.value;
        }
        if (socket.readyState === WebSocket.OPEN) {
            socket.sendObject(message.data);
        }
    }
});