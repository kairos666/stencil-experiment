import { Component, Prop, State, Method, Element, Event, EventEmitter } from '@stencil/core';
import focusTrapBuilder from 'focus-trap';
import vuid from 'vuid';

/**
 * &lt;WAF-DIALOG&gt;
 * ===============
 * A full feature dialog box component to generate modal windows effortlessly
 * - accessible (ARIA & focus trap)
 * - backdrop closing on click/tap (controllable for confirmation modals)
 * - RWD for smaller screens
 * - 2 alternatives to display long dialog (height bigger than viewport)
 * - component emit custom events when opening (waf.dialog.open) & closing (waf.dialog.close)
 * 
 * Sample
 * ------
 * ```
 * <waf-dialog>
 *  <!-- START - your dialog content here -->
 *  <h1 slot="title">Allow data collection?</h1>
 *  <p slot="content">Allowing us to collect data will let us get you the information you want faster.</p>
 *  <menu slot="actions">
 *   <button type="button" class="mdl-button">Agree</button>
 *   <button type="button" data-dialog-close class="mdl-button">Disagree</button>
 *  </menu>
 *  <!-- END - your dialog content here -->
 * </waf-dialog>
 * ```
 * 
 * Know limitations
 * ----------------
 * - if either prevent-backdrop-closing OR no-backdrop is set, the only non programmatic way to close the modal is to use the escape key. To avoid trapping users make sure to use 'data-dialog-close' attribute somewhere in the dialog content
 * - styling inside the dialog is the responsability of the user (it is not really a limitation :)
 */
@Component({
  tag: 'waf-dialog',
  styleUrl: 'waf-dialog.scss'
})
export class WafDialog {
    /** class name used to target on click close modal side effect */
    private closeAttrName:string = 'data-dialog-close';
    /** used to generate a unique ID for the component HTML DOM nodes that require it (will change at each run - for IE11 fallback to timestamp) */
    private uniqueId:number = (window.crypto) ? vuid() : Date.now();
    /** DOM Element used as backdrop for this specific dialog box */
    private backdropElt:Element;
    /** [focus trap](https://github.com/davidtheclark/focus-trap) instance  */
    private focusTrap;
    /** DOM Element for the component */
    @Element() private wafDialogElt:Element;
    /** emitter for 'waf.dialog.open' custom event - fired when modal is opened */
    @Event({eventName: 'waf.dialog.open'}) private wafDialogOpenEE:EventEmitter;
    /** emitter for 'waf.dialog.close' custom event - fired when modal is closed */
    @Event({eventName: 'waf.dialog.close'}) private wafDialogCloseEE:EventEmitter;
    /** current state of this dialog box open|close */
    @State() private isOpen:boolean = false;
    /** flag for toggling off the closing of modal when backdrop is clicked */
    @Prop() preventBackdropClosing:boolean;
    /** flag for toggling off the backdrop effect entirely */
    @Prop() noBackdrop:boolean;
    /** by default long dialog box are scrollable in the viewport, this attribute toggle on the behavior where the dialog box is limited to the visible viewport, scroll happens in the content section of the box */
    @Prop() limitedHeight:boolean;

    /**
     * Based on component state, render the dialog HTML structure and displays it or hide it
     */
    render() {
        return [
            <div class="waf-dialog-backdrop" tabindex="-1" style={this.backdropStyles()}></div>,
            <div aria-hidden={(!this.isOpen).toString()} aria-labelledby={this.idGenerator('title')} aria-describedby={this.idGenerator('description')} role="dialog" class={this.dialogClass()} style={this.dialogStyles()}>
                <section role="document" tabindex="-1">
                    <div id={this.idGenerator('description')} class="sr-only">Beginning of dialog window. Escape will cancel and close the window.</div>
                    <div id={this.idGenerator('title')}>
                        <slot name="title"/>
                    </div>
                    <slot name="content"/>
                    <slot name="actions"/>
                </section>
            </div>
        ]
    }

    /**
     * When initiated the component setup event listeners and the focus trap
     */
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

    /**
     * Component destroy function
     */
    componentDidUnload() {
        // cleanup listeners
        this.wafDialogElt.removeEventListener('click', this.innerCloseHandler.bind(this), true);
        this.backdropElt.removeEventListener('click', this.backdropClickHandler.bind(this));
        document.removeEventListener('keydown', this.escapeKeyHandler.bind(this));
    }

    /**
     * React to all events originating from inside the dialog (capture phase) and triggers a closing of the modal when 'data-dialog-close' attribute is set on the target element
     * @param evt originate from any clicked element inside the dialog
     */
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

    /**
     * React to clicked backdrop
     */
    private backdropClickHandler() {
        if (!this.preventBackdropClosing && !this.noBackdrop) this.hideModal();
    }

    /**
     * React to escape key being pressed
     * @param evt
     */
    private escapeKeyHandler(evt:KeyboardEvent) {
        if (this.isOpen && evt.keyCode === 27) this.hideModal();
    }

    /**
     * Util function for unique ID generation
     * @param type represent the targeted element inside the dialog DOM
     */
    private idGenerator(type:'title'|'description') { return `dialog-${this.uniqueId}-${type}` }

    /**
     * Util function for dynamic styles generation based on component state - target backdrop
     */
    private backdropStyles() {
        // base styles
        let stylesObject:any = {};

        // additional style when hidden or no backdrop
        if (!this.isOpen || this.noBackdrop) stylesObject.display = 'none';

        return stylesObject;
    }

    /**
     * Util function for dynamic styles generation based on component state - target dialog box
     */
    private dialogStyles() {
        // base styles
        let stylesObject:any = {};

        // additional style when hidden or no backdrop
        if (!this.isOpen) stylesObject.display = 'none';

        return stylesObject;
    }

    /**
     * Util function for dynamic classes generation based on component state - target dialog box
     */
    private dialogClass() {
        return (this.limitedHeight) ? 'limited-height' : '';
    }

    /**
     * Public method to open the dialog
     */
    @Method()
    showModal() { 
        this.isOpen = true;
        this.focusTrap.activate();
        this.wafDialogOpenEE.emit();
    } 

    /**
     * Public method to close the dialog
     */
    @Method()
    hideModal() { 
        this.isOpen = false;
        this.focusTrap.deactivate();
        this.wafDialogCloseEE.emit();
    }

    /**
     * Public method to toggle the dialog
     */
    @Method()
    toggleModal() {  
        if (this.isOpen) {
            this.hideModal();
        } else {
            this.showModal();
        }
    }
}