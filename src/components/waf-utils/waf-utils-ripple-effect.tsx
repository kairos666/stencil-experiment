import { Component, Prop, Element } from '@stencil/core';

/**
 * &lt;WAF-MATERIAL-DESIGN-BUTTONS&gt;
 * ===============
 * 
 * - apply md styles to all buttons | some instances | all instances in particular DOM node
 * - apply ripple effect to all buttons | some instances | all instances in particular DOM node
 * 
 * Sample
 * ------
 * ```
 * TODO
 * ```
 * 
 * Know limitations
 * ----------------
 * - TODO
 */
@Component({
  tag: 'waf-utils-ripple-effect',
  styleUrl: 'waf-utils-ripple-effect.scss'
})
export class WafRippleFX {
    private debounceDelay:number = 2000;
    private hookAttribute:string = '[ripple]';
    /** the custom DOM element itself */
    @Element() private wafFX:Element;

    /** include all element inside the custom tag that matches the selector */
    @Prop() selector:string;

    /**
     * Empty renderer
     */
    render() {
        return <slot />;
    }

    componentDidLoad() {
        // add missing ripple attributes
        if (this.selector) this.addMissingRippleAttribute();

        // select all occurrences
        const elts:NodeList = this.wafFX.querySelectorAll(this.hookAttribute);
        
        // process all elts
        Array.from(elts).forEach(this.generateRipple.bind(this));
    }

    private addMissingRippleAttribute() {
        const elts:NodeList = this.wafFX.querySelectorAll(`${this.selector}:not(${this.hookAttribute})`);
        
        // process all elts
        Array.from(elts).forEach(elt => {
            // add ripple attribute if missing
            (elt as Element).setAttribute('ripple', 'ripple');
        });
    }

    private generateRipple(elt:Element) {
        // handlers
        const addRipple = function(evt:MouseEvent|TouchEvent) {
            const evtPos = {
                x: ((evt as TouchEvent).touches) ? (evt as TouchEvent).touches[0].pageX : (evt as MouseEvent).pageX,
                y: ((evt as TouchEvent).touches) ? (evt as TouchEvent).touches[0].pageY : (evt as MouseEvent).pageY
            };
            const ripple = this;
            const size = ripple.offsetWidth;
            const pos = ripple.getBoundingClientRect();
            const rippler = document.createElement('span');
            const x = evtPos.x - pos.left - (size / 2);
            const y = evtPos.y - pos.top - (size / 2);
            const style = `top:${y}px;left:${x}px;height:${size}px;width:${size}px;`;
            ripple.rippleContainer.appendChild(rippler);
            rippler.setAttribute('style', style);
        }
        const cleanUp = function() {
            const container = this.rippleContainer;
            while (this.rippleContainer.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
        const debounce = function(func:Function, delay:number) {
            let inDebounce = undefined;
            return function() {
                let args = arguments;
                let context = this;
                clearTimeout(inDebounce);
                return inDebounce = setTimeout(function() {
                    return func.apply(context, args);
                }, delay);
            };
        }

        // setup (only if not done yet)
        if (!(elt as any).rippleContainer) {
            const rippleContainer = document.createElement('div');
            rippleContainer.className = 'ripple--container';
            // mouse
            elt.addEventListener('mousedown', addRipple);
            elt.addEventListener('mouseup', debounce(cleanUp, this.debounceDelay));
            // touch
            elt.addEventListener('touchstart', addRipple);
            elt.addEventListener('touchend', debounce(cleanUp, this.debounceDelay));
            (elt as any).rippleContainer = rippleContainer;
            elt.appendChild(rippleContainer);
        }
    }
}