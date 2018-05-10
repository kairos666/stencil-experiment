import { Component, Prop, State, Method, Element } from '@stencil/core';
import focusTrapBuilder from 'focus-trap';

/**
 * &lt;WAF-DIALOG&gt;
 * ===============
 * A full feature dialog box component to generate modal windows effortlessly
 * - accessible
 * - backdrop closing on click/tap (controllable for confirmation modals)
 * 
 * Sample
 * ------
 * ```
 * <waf-dialog>
 *  <!-- START - your dialog content here -->
 *  <h2>My dialog content</h2>
 *  <p>My dialog body copy yeah!</p>
 *  <!-- END - your dialog content here -->
 * </waf-dialog>
 * ```
 * 
 * Know limitations
 * ----------------
 * - TODO
 */
@Component({
  tag: 'waf-dialog',
  styleUrl: 'waf-dialog.scss'
})
export class WafDialog {
    private backdropZIndex:number = 666;
    private dialogZIndex:number = 667;
    private closeAttrName:string = 'data-dialog-close';
    private uniqueId:number = Date.now();
    private backdropElt:Element;
    private focusTrap;
    @Element() private wafDialogElt:Element;
    @State() isOpen:boolean = false;
    @Prop() preventBackdropClosing:boolean;
    @Prop() noBackdrop:boolean;
    @Prop() limitedHeight:boolean;

    render() {
        return [
            <div class="waf-dialog-backdrop" tabindex="-1" style={(!this.isOpen || this.noBackdrop) ? { display: 'none' } : { zIndex: String(this.backdropZIndex) }}></div>,
            <div aria-hidden={(!this.isOpen).toString()} aria-labelledby={this.idGenerator('title')} aria-describedby={this.idGenerator('description')} role="dialog"  style={(!this.isOpen) ? { display: 'none' } : { zIndex: String(this.dialogZIndex) }}>
                <section role="document" tabindex="-1">
                    <div id={this.idGenerator('description')} class="sr-only">Beginning of dialog window. Escape will cancel and close the window.</div>
                    <div id={this.idGenerator('title')}>
                        <slot name="title"/>
                    </div>
                    <slot name="content"/>
                    <slot name="actions"></slot>
                </section>
            </div>
        ]
    }

    componentDidLoad() {
        // listen to click events passing through the dialog box (capture phase to avoid missing some)
        this.wafDialogElt.addEventListener('click', this.innerCloseHandler.bind(this), true);

        // listen to backdrop click
        this.backdropElt = this.wafDialogElt.querySelector('.waf-dialog-backdrop');
        this.backdropElt.addEventListener('click', this.backdropClickHandler.bind(this));

        // listen to escape key
        document.addEventListener('keydown', this.escapeKeyHandler.bind(this));

        // setup focus trap
        const fallback:HTMLElement = (this.wafDialogElt.querySelector('[role="document"]') as HTMLElement); // used if no focusable element was provided inside the dialog box
        this.focusTrap = focusTrapBuilder((this.wafDialogElt as HTMLElement), {
            onActivate: undefined,
            onDeactivate: undefined,
            initialFocus: undefined,
            fallbackFocus: fallback,
            escapeDeactivates: true,
            clickOutsideDeactivates: false,
            returnFocusOnDeactivate: true
        });
    }

    componentDidUnload() {
        // cleanup listeners
        this.wafDialogElt.removeEventListener('click', this.innerCloseHandler.bind(this), true);
        this.backdropElt.removeEventListener('click', this.backdropClickHandler.bind(this));
        document.removeEventListener('keydown', this.escapeKeyHandler.bind(this));
    }

    private innerCloseHandler(evt:Event) {
        // determine if clicked item has the close attribute
        const targetAttrs:NamedNodeMap = (evt.target as Element).attributes;
        let found = false;
        for(let i = 0; i < targetAttrs.length; i++) {
            if (targetAttrs.item(i).name === this.closeAttrName) {
                found = true;
                break;
            }
        }

        // close dialog if the click event originated from an element with the close attribute
        if (found) this.hideModal();
    }

    private backdropClickHandler() {
        if (!this.preventBackdropClosing && !this.noBackdrop) this.hideModal();
    }

    private escapeKeyHandler(evt:KeyboardEvent) {
        if (evt.keyCode === 27) this.hideModal();
    }

    private idGenerator(type:'title'|'description') { return `dialog-${this.uniqueId}-${type}` }

    @Method()
    showModal() { 
        this.isOpen = true;
        this.focusTrap.activate();
    } 

    @Method()
    hideModal() { 
        this.isOpen = false;
        this.focusTrap.deactivate();
    }

    @Method()
    toggleModal() {  
        if (this.isOpen) {
            this.hideModal();
        } else {
            this.showModal();
        }
    }
}