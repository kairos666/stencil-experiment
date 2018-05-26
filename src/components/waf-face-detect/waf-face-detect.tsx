import { Component } from '@stencil/core';
import { moduleInit } from '../../assets/wasmpico';

declare const WebAssembly:any;

@Component({
  tag: 'waf-face-detect',
  styleUrl: 'waf-face-detect.scss'
})
export class WafFaceDetect {
    private assetsPath:string = `${location.origin}/assets/`;
    private wasmFaceDetectorFile:string = 'wasmpico';
    private wasmFaceDetectorModule;

    componentWillLoad() {
        if (WebAssembly) {
            WebAssembly.compileStreaming(fetch(`${this.assetsPath}${this.wasmFaceDetectorFile}.wasm`))
                .then(() => {
                    // the script 'wasmpico.js' will instantiate this object once the 'wasmpico.wasm' loads & compile
                    this.wasmFaceDetectorModule = moduleInit();
                    console.log(this.wasmFaceDetectorModule);
                }
            );
        } else {
            console.warn('This browser can\'t execute Web Assembly modules');
        }
    }
}