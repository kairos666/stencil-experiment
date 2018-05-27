import { Component, Element, Event, EventEmitter } from '@stencil/core';
import { moduleInit } from '../../assets/wasmpico';

declare const WebAssembly:any;

/**
 * &lt;WAF-FACE-DETECT&gt;
 * ===============
 * Access to device camera and detect faces in range. It supports multiple faces detection
 * Great thanks to tehnokv for providing great ressources https://github.com/tehnokv/picojs
 * 
 * Sample
 * ------
 * ```
 * <waf-face-detect></waf-face-detect>
 * ```
 * 
 * Know limitations
 * ----------------
 * - good detection happens when you face the camera and look in front of you. The more the head and gaze stray from this the harder it is to get a good detection
 * - WebAssembly needed for performance
 * - WebRTC needed for video stream capture (sorry iOS users)
 * - still bugs to fix (works only in Chrome right now)
 */
@Component({
  tag: 'waf-face-detect',
  styleUrl: 'waf-face-detect.scss'
})
export class WafFaceDetect {
    @Element() private fdElt:HTMLElement;
    @Event({eventName: 'waf.face-detector.detected'}) private wafFaceDetectorEE:EventEmitter;
    private fdCanvas:HTMLCanvasElement;
    private fdVideo:HTMLVideoElement;
    private fdWidth:number = 640;
    private fdHeight:number = 480;
    private detectionThreshold = 3;
    private assetsPath:string = `${location.origin}/assets/`;
    private wasmFaceDetectorFile:string = 'wasmpico';
    private wasmFaceDetectorModule;

    render() {
        return [
            <video autoplay playsinline width="1" height="1"/>,
            <canvas class="face-detect" width={this.fdWidth} height={this.fdHeight} />,
            <canvas class="arkanoid" width={this.fdWidth} height={this.fdHeight} />
        ]
    }

    componentDidLoad() {
        // reference canvas element
        this.fdCanvas = this.fdElt.querySelector('canvas.face-detect');
        this.fdVideo = this.fdElt.querySelector('video');

        // initiate everything (video & wasm in parralel then canvas)
        this.init();
    }

    private init() {
        // initiate everything (video & wasm in parralel then canvas)
        const pBase = Promise.all([this.initCameraVideo(), this.initWebAssembly()]);
        pBase.then(() => {
            this.initCanvas();
            this.initArkanoid();
        }).catch(err => {
            console.warn(err);
        });
    }

    private initCameraVideo() {
        return new Promise((resolve, reject) => {
            if (!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
                navigator.mediaDevices.getUserMedia({video: true, audio: false}).then(stream => {
                    this.fdVideo.srcObject = stream;
                    resolve();
                });
            } else {
                reject('getUserMedia() is not supported by this browser');
            }
        });
    }

    private initWebAssembly() {
        return new Promise((resolve, reject) => {
            if (WebAssembly) {
                WebAssembly.compileStreaming(fetch(`${this.assetsPath}${this.wasmFaceDetectorFile}.wasm`))
                    .then(() => {
                        // the script 'wasmpico.js' will instantiate this object once the 'wasmpico.wasm' loads & compile
                        this.wasmFaceDetectorModule = moduleInit();
                        resolve();
                    }
                );
            } else {
                reject('This browser can\'t execute Web Assembly modules');
            }
        });
    }

    private initCanvas() {
        // memory allocations
        const allocations = this.faceDetectorAllocateMemory(this.fdWidth, this.fdHeight);

        // looping draw to canvas function
        const drawToCanvaLoop = () => {
            const ctx:CanvasRenderingContext2D = this.fdCanvas.getContext('2d');
            const video:HTMLVideoElement = this.fdVideo;
            const width:number = this.fdWidth;
            const height:number = this.fdHeight;

            // draw on canvas
            ctx.drawImage(video, 0, 0);

            // retrieve data and pass it for face detection
            const rgbaData:ImageData = ctx.getImageData(0, 0, width, height);
            const dets = this.faceDetectionCalculate(rgbaData, width, height, allocations);
            this.wafFaceDetectorEE.emit(dets);

            // setup for next repaint
            window.requestAnimationFrame(drawToCanvaLoop);
        }

        // update at each browser refresh (and pause when tab is not in focus)
        window.requestAnimationFrame(drawToCanvaLoop);

        // canvas setup is finished resolve promise (not really necessary but keep initSubSteps with the same interface)
        return Promise.resolve();
    }

    private faceDetectorAllocateMemory(width:number, height:number, maxndetections:number = 1024) {
        // allocate memory inside wasm module
        let ppixels = this.wasmFaceDetectorModule._malloc(width*height);
        let pixels = new Uint8Array(this.wasmFaceDetectorModule.HEAPU8.buffer, ppixels, width*height);

        // allocate memory for detection
        let prcsq = this.wasmFaceDetectorModule._malloc(4*4*maxndetections);
        let rscq = new Float32Array(this.wasmFaceDetectorModule.HEAPU8.buffer, prcsq, maxndetections);

        return {
            ppixels: ppixels,
            pixels: pixels,
            prcsq: prcsq,
            rscq: rscq,
            maxndetections: maxndetections
        }
    }

    private faceDetectionCalculate(image:ImageData, width:number, height:number, allocations:any) {
        const rgba = image.data;
        const ppixels = allocations.ppixels;
        const pixels = allocations.pixels;
        const prcsq = allocations.prcsq;
        const rcsq = allocations.rscq;
        const maxndetections = allocations.maxndetections;
        const params = {
            shiftfactor: 0.1, // move the detection window by 10% of its size
            minsize: 100,     // minimum size of a face
            maxsize: 1000,    // maximum size of a face
            scalefactor: 1.1  // for multiscale processing: resize the detection window by 10% when moving to the higher scale
        }

        // convert pixels to gray scale & move the RGBA pixels to the Wasm memory
        Array(height).fill('fake').forEach((_itemh, r) => {
            Array(width).fill('fake').forEach((_itemw, c) => {
                // gray = 0.2*red + 0.7*green + 0.1*blue
                pixels[r*width + c] = (2*rgba[r*4*width+4*c+0]+7*rgba[r*4*width+4*c+1]+1*rgba[r*4*width+4*c+2])/10;
            })
        })

        // run the detector across the frame
        // rcsq is an array representing row, column, scale and detection score
        let ndetections = this.wasmFaceDetectorModule._find_faces(prcsq, maxndetections, ppixels, height, width, width, params.scalefactor, params.shiftfactor, params.minsize, params.maxsize);
        
        // cluster multiple detections found around each face
        ndetections = this.wasmFaceDetectorModule._cluster_detections(prcsq, ndetections);
        
        let dets = [];
        const ctx:CanvasRenderingContext2D = this.fdCanvas.getContext('2d');
        Array(ndetections).fill('fake').forEach((_item, i) => {
            // return detections positions
            if (rcsq[4*i+3] > this.detectionThreshold) {
                dets.push({ x: rcsq[4*i+1], y: rcsq[4*i+0], size: rcsq[4*i+2] });

                // draw detection
                ctx.beginPath();
                ctx.arc(rcsq[4*i+1], rcsq[4*i+0], rcsq[4*i+2]/2, 0, 2*Math.PI, false);
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'red';
                ctx.stroke();
            }
        });

        return dets;
    }

    private initArkanoid() {
        const arkanoidCanvas:HTMLCanvasElement = this.fdElt.querySelector('canvas.arkanoid');
        const canvasContext:CanvasRenderingContext2D = arkanoidCanvas.getContext('2d');
        const options = {
            bricks: { 
                brickPerRowCount: 10,
                rowCount: 3,
                sideSpace: 20,
                brickHeight: 10,
                brickGutter: 5
            }
        }
        function generateObjectsModel(canvasWidth, canvasHeight, data) {
            // generate all bricks data
            const brickWidth = (canvasWidth - data.sideSpace * 2 - data.brickGutter * (data.brickPerRowCount - 1)) / data.brickPerRowCount;
            const bricksBluePrint = Array(data.rowCount).fill('fake').map((_itemRow, i) => {
                return Array(data.brickPerRowCount).fill('fake').map((_itemColumn, j) => {
                    return {
                        x: data.sideSpace + j * (brickWidth + data.brickGutter),
                        y: data.sideSpace + i * (data.brickHeight + data.brickGutter),
                        width: brickWidth,
                        height: data.brickHeight,
                        color: '#0093e0',
                        isActive: true,
                        type: 'brick'
                    }
                })
            });

            // generate bar data
            const barWidth = 2 * brickWidth + data.brickGutter;
            const bar = {
                x: canvasWidth / 2 - barWidth / 2,
                y: canvasHeight - data.sideSpace - data.brickHeight,
                width: barWidth ,
                height: data.brickHeight,
                color: '#0093e0',
                isActive: true,
                type: 'bar'
            }

            // generate ball data
            const ballRadius = 10;
            const ball = {
                x: canvasWidth / 2,
                y: canvasHeight - data.sideSpace - data.brickHeight - ballRadius,
                dx: 2,
                dy: -2,
                radius: ballRadius,
                color: '#0093e0',
                isActive: true,
                type: 'ball'
            };

            // return flattened array
            let flattenedModel = [].concat.apply([], bricksBluePrint);
            flattenedModel.push(bar);
            flattenedModel.push(ball);
            return flattenedModel;
        }
        function draw(model, ctx:CanvasRenderingContext2D, cWidth, cHeight, options) {
            function bounceOffWalls(ballbp, cWidth, cHeight, sideSpace) {
                let futurePosition = { x: ballbp.x + ballbp.dx, y: ballbp.y + ballbp.dy };
                
                // top
                if ((futurePosition.y - ballbp.radius) < sideSpace) ballbp.dy = -ballbp.dy;
                // bottom (game over)
                if ((futurePosition.y + ballbp.radius) > (cHeight - sideSpace)) ballbp.dy = -ballbp.dy;
                // left
                if (futurePosition.x - ballbp.radius < sideSpace) ballbp.dx = -ballbp.dx;
                // right
                if (futurePosition.x + ballbp.radius > (cWidth - sideSpace)) ballbp.dx = -ballbp.dx;
            }

            return () => {
                // clean canvas
                ctx.clearRect(0, 0, cWidth, cHeight)

                // draw active bricks onto canvas
                model.forEach(bbp => {
                    switch (bbp.type) {
                        case 'ball':
                            // update position
                            bounceOffWalls(bbp, cWidth, cHeight, options.bricks.sideSpace);
                            bbp.x += bbp.dx;
                            bbp.y += bbp.dy;

                            // ball
                            if (bbp.isActive) {
                                ctx.beginPath();
                                ctx.arc(bbp.x, bbp.y, bbp.radius, 0, Math.PI*2);
                                ctx.fillStyle = bbp.color;
                                ctx.fill();
                                ctx.closePath();
                            }
                        break;
                        default:
                            // bricks & bar
                            if (bbp.isActive) {
                                ctx.beginPath();
                                ctx.rect(bbp.x, bbp.y, bbp.width, bbp.height);
                                ctx.fillStyle = bbp.color;
                                ctx.fill();
                                ctx.closePath();
                            }
                    }
                });

                // draw at each frame
                window.requestAnimationFrame(draw(model, ctx, cWidth, cHeight, options));
            }
        }

        // generate game
        let model = generateObjectsModel(this.fdWidth, this.fdHeight, options.bricks);
        draw(model, canvasContext, this.fdWidth, this.fdHeight, options)();
    }
}