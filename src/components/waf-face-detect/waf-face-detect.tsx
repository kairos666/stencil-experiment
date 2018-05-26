import { Component, Element } from '@stencil/core';
import { moduleInit } from '../../assets/wasmpico';

declare const WebAssembly:any;

@Component({
  tag: 'waf-face-detect',
  styleUrl: 'waf-face-detect.scss'
})
export class WafFaceDetect {
    @Element() fdElt:HTMLElement;
    private fdCanvas:HTMLCanvasElement;
    private fdVideo:HTMLVideoElement;
    private fdWidth:number = 640;
    private fdHeight:number = 480;
    private assetsPath:string = `${location.origin}/assets/`;
    private wasmFaceDetectorFile:string = 'wasmpico';
    private wasmFaceDetectorModule;

    render() {
        return [
            <video autoplay playsinline width={this.fdWidth} height={this.fdHeight}/>,
            <canvas width={this.fdWidth} height={this.fdHeight} />
        ]
    }

    componentDidLoad() {
        // reference canvas element
        this.fdCanvas = this.fdElt.querySelector('canvas');
        this.fdVideo = this.fdElt.querySelector('video');

        // initiate everything (video & wasm in parralel then canvas)
        this.init();
    }

    private init() {
        // initiate everything (video & wasm in parralel then canvas)
        const pBase = Promise.all([this.initCameraVideo(), this.initWebAssembly()]);
        pBase.then(() => {
            this.initCanvas();
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
        const canvasContext:CanvasRenderingContext2D = this.fdCanvas.getContext('2d');

        // looping draw to canvas function
        const drawToCanvaLoopBuilder = function(ctx, video) {
            return function() {
                ctx.drawImage(video, 0, 0);
                window.requestAnimationFrame(drawToCanvaLoopBuilder(ctx, video));
            }
        }

        console.log(this.wasmFaceDetectorModule);

        // update at each browser refresh (and pause when tab is not in focus)
        window.requestAnimationFrame(drawToCanvaLoopBuilder(canvasContext, this.fdVideo));

        // canvas setup is finished resolve promise (not really necessary but keep initSubSteps with the same interface)
        return Promise.resolve();
    }
}