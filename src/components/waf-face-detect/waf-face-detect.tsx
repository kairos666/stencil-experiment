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
            // strap wasm module on
            fetch(`${this.assetsPath}${this.wasmFaceDetectorFile}.wasm`)
                .then(resp => resp.arrayBuffer())
                .then(buffer => {
                    WebAssembly.compile(buffer);
                    // the script 'wasmpico.js' will instantiate this object once the 'wasmpico.wasm' loads
                    console.log(moduleInit);
                    console.log(moduleInit());
                    console.log(this.wasmFaceDetectorModule);
                })
            // WebAssembly
            //     .instantiateStreaming(fetch(`${this.assetsPath}${this.wasmFaceDetectorFile}`))
            //     .then(obj => {
            //             this.wasmFaceDetectorModule = obj.instance.exports._find_faces();
            //             console.log(obj);
            //         }
            //     );
            // WebAssembly.compileStreaming(fetch(`${this.assetsPath}${this.wasmFaceDetectorFile}`))
            //     .then(mod => {
            //         WebAssembly.Module.imports(mod); 
            //         console.log(this.wasmFaceDetectorModule);
            //     }
            // );
        } else {
            console.warn('This browser can\'t execute Web Assembly modules');
        }
    }
}