import { Component, Prop, Element } from '@stencil/core';

@Component({
  tag: 'waf-arkanoid',
  styleUrl: 'waf-arkanoid.scss'
})
export class WafArkanoid {
    @Prop() paddle:number = 0.5;
    @Element() private akElt:HTMLElement;
    private akCanvas:HTMLCanvasElement;
    private akWidth:number = 640;
    private akHeight:number = 480;

    render() {
        return (<canvas class="arkanoid" width={this.akWidth} height={this.akHeight} />)
    }

    componentDidLoad() {
        // get canvas element
        this.akCanvas = this.akElt.querySelector('canvas');
        console.log(this.akCanvas);
    }
}