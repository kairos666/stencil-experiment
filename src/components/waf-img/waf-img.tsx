import { Component, Prop, State, Watch } from '@stencil/core';

@Component({
  tag: 'waf-img',
  styleUrl: 'waf-img.scss'
})
export class WafImg {
    @Prop() src:string;
    @Prop() srcset:string;
    @Prop() alt:string;
    @Prop() decoding:'sync'|'async'|'auto';
    @Prop() width:string;
    @Prop() height:string;
    @Prop() sizes:string;
    @State() innerSrc:string;
    @State() isBroken:boolean = false;

    render() {
        const renderedEl = (this.innerSrc) ? (
            <img src={this.innerSrc} alt={this.alt} width={this.width} height={this.height} sizes={this.sizes} srcset={this.srcset} decoding={this.decoding} />
        ) : (this.isBroken) ? (
            <span class="waf-img__broken" style={this.infoDynamicStyles()}>
                <span>broken image</span>
                <span>{this.alt}</span>
            </span>
        ) : (
            <span class="waf-img__loading" style={this.infoDynamicStyles()}>
                <span class="lds-ellipsis"><span></span><span></span><span></span><span></span></span>
                <span>{this.alt}</span>
            </span>
        )
        return renderedEl;
    }

    componentDidLoad() {
        // checks for at least "src" ("alt" is not necessary if only used for decoration)
        if (!this.src) {
            console.warn('waf-img | a src is required');
            this.isBroken = true;
        } else {
            // async load when browser is available
            const docState = document.readyState.toString();
            if (docState === 'loaded' || docState === 'interactive' || docState === 'complete') {
                // page is fully loaded
                this.srcSwapHandler(this.src);
            } else {
                // wait for the page to be fully loaded
                window.addEventListener('load', () => {
                    this.srcSwapHandler(this.src);
                });
            }
        }
    }

    infoDynamicStyles() {
        return (this.width && this.height) ? {
            width: `${this.width}px`,
            height: `${this.height}px`
        } : {}
    }

    @Watch('src')
    srcSwapHandler(newValue:string) {
        // first fetch the image (browser put it in cache)
        fetch(newValue)
            .then(() => {
                // then add src set that will use that cache directly
                this.isBroken = false;
                this.innerSrc = this.src;
            })
            .catch(() => {
                // if image can't be fetched
                this.isBroken = true;
                this.innerSrc = undefined;
            });
    }
}