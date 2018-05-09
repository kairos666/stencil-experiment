import { Component, Prop, State, Watch, Element } from '@stencil/core';

@Component({
  tag: 'waf-img',
  styleUrl: 'waf-img.scss'
})
export class WafImg {
    private intersectionObserver:IntersectionObserver;
    @Prop() src:string;
    @Prop() srcset:string;
    @Prop() alt:string;
    @Prop() decoding:'sync'|'async'|'auto';
    @Prop() width:string;
    @Prop() height:string;
    @Prop() sizes:string;
    @Prop() visibleAsyncLoading:boolean = false;
    @State() innerSrc:string;
    @State() isBroken:boolean = false;
    @Element() wafImg:Element;

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
        } else if(!this.visibleAsyncLoading) {
            // async load when browser is available (not waiting for element to be visible in viewport)
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
        } else {
            // async load when browser is available (waiting for element to be visible in viewport)
            // default is according to viewport and as soon as the first pixel is visible
            this.intersectionObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // element is visible - but yet we make sure that the rest of the page is loaded
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
                        observer.disconnect();
                    }
                });
            });
            this.intersectionObserver.observe(this.wafImg);
        }
    }

    componentDidUnload() {
        // cleanup observer if needed
        if (this.intersectionObserver) this.intersectionObserver.disconnect();
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
            .then(response => {
                return response.blob();
            })
            .then(responseBlob => {
                return URL.createObjectURL(responseBlob);
            })
            .then(responseBlobObjectURL => {
                // then add src set that will use that response directly
                this.isBroken = false;
                this.innerSrc = responseBlobObjectURL;
            })
            .catch(() => {
                // if image can't be fetched
                this.isBroken = true;
                this.innerSrc = undefined;
            });
    }
}