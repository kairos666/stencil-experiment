import { Component, Prop, Element, State, Watch } from '@stencil/core';

@Component({
  tag: 'waf-input',
  styleUrl: 'waf-input.scss'
})
export class WafInput {
    @Prop({ reflectToAttr: true }) label:string = 'error - label required'; // reflect auto generated attribute on component
    @Prop() errors:Object | string;
    @Prop() float:boolean;
    @Prop() alignRight:boolean;
    @Prop() fullWidth:boolean;
    @State() inputAttrs:any = { id: '' };
    @State() isFocused:boolean = false;
    @State() isDirty:boolean = false;
    @State() isInvalid:boolean = false;
    @State() innerErrors:Object = { 
        badInput: 'donnée incorrecte',
        patternMismatch: 'donnée enfreignant les règles',
        rangeOverflow: 'supérieur au maximum autorisé',
        rangeUnderflow: 'inférieur au minimum autorisé',
        stepMismatch: 'valeur non autorisée',
        tooLong: 'trop de charactères',
        tooShort: 'trop peu de charactères',
        typeMismatch: 'format incorrect',
        valueMissing: 'champs requis'
    };
    @State() errorText:string = '';

    @Element() textfieldElt:HTMLElement;
    private inputEl:HTMLInputElement; // dynamically defined <slot>

    @Watch('errors')
    errorsWatchHandler(newValue:Object | string) {
        if (typeof newValue === 'object') {
            // received an object so pass through
            this.innerErrors = Object.assign(this.innerErrors, newValue);
        } else if (typeof newValue === 'string') {
            try {
                this.innerErrors = Object.assign(this.innerErrors, JSON.parse(newValue));
            } catch (error) {
                console.warn('waf-input | invalid errors object passed', error);
            }
        }
    }

    render() {
        return (
            <div class={this.cmpntStyleClasses()}>
                <label class="waf-textfield__label" htmlFor={this.inputAttrs.id}>{this.label}</label>
                <slot></slot>
                <span class="waf-textfield__error">{this.errorText}</span>
            </div>
        );
    }

    componentDidLoad() {
        // set all elements and run some checks
        const inputData = this.inputTagChecker();
        this.inputEl = inputData.element;
        this.inputAttrs = inputData.elementAttrObj;

        // process initial errors setting
        this.errorsWatchHandler(this.errors);

        // build textfield according to data from input tag and own attributes
        if (this.inputEl && this.inputAttrs.id) this.init();
    }

    // main builder function
    private init() {
        // setup focus behavior
        this.inputEl.addEventListener('focus', () => { this.isFocused = true });
        this.inputEl.addEventListener('blur', () => { this.isFocused = false });

        // setup input change behavior
        this.inputEl.addEventListener('change', this.onValueUpdate.bind(this));
        this.inputEl.addEventListener('keyup', this.onValueUpdate.bind(this));

        // initial situation assessment
        this.onValueUpdate(false);
    }

    private onValueUpdate(evt) {
        this.isDirty = (this.inputEl.value !== '');

        // validity (either dirty & wrong or required & empty)
        if (evt) {
            // default case full check
            this.isInvalid = ((this.isDirty && !this.inputEl.checkValidity()) || this.inputEl.validity.valueMissing);
        } else {
            // initial check - check is simpler initially for required elements to pass through
            this.isInvalid = (this.isDirty && !this.inputEl.checkValidity());
        }

        // process error text to display
        const validityStates = this.inputEl.validity;
        const errorMsgs = [];

        Object.keys(this.innerErrors).forEach(errorType => {
            if (validityStates[errorType]) errorMsgs.push(this.innerErrors[errorType]);
        });
        this.errorText = (errorMsgs.length === 0) ? '' : errorMsgs.join(' | ');
    }

    private cmpntStyleClasses() {
        let result = 'waf-textfield';

        // external prop
        if (this.float) result += ' waf-textfield--floating-label';
        if (this.alignRight) result += ' waf-textfield--align-right';
        if (this.fullWidth) result += ' waf-textfield--full-width';

        // input attributes
        if (this.inputAttrs.placeholder) result += ' has-placeholder';
        if (this.inputAttrs.disabled !== undefined) result += ' is-disabled'; // ! empty string is considered false

        // internal state
        if (this.isDirty) result += ' is-dirty';
        if (this.isFocused) result += ' is-focused';
        if (this.isInvalid) result += ' is-invalid';

        return result;
    }

    // check if input tag is here and has all required features (id, type)
    private inputTagChecker():any {
        let result = { element: null, elementAttrObj: { id: '' } };
        let error;
        const inputNodeList:NodeList = this.textfieldElt.querySelectorAll('*:not(.waf-textfield):not(label):not(.waf-textfield__error)');
        const inputEl:HTMLInputElement = this.textfieldElt.querySelector('input');

        // check for correct nodeList child number and element type
        if (inputNodeList.length >= 2) error = 'waf-input | only a unique input tag is permitted inside the slot';
        if (inputEl === null) error = 'waf-input | missing slotted input tag';
        if (error) {
            console.warn(error);
            return result;
        }

        // extract all input attributes and check for mandatory id
        const inputElAttrs:NamedNodeMap = inputEl.attributes;
        const inputAttributesObj:any = {};
        for (let i = 0; i < inputElAttrs.length; i++) {
            const attr:Attr = inputElAttrs.item(i);
            inputAttributesObj[attr.name] = attr.value;
        }
        if (inputAttributesObj.id === undefined) error = 'waf-input | input tag is missing an "id" attribute';
        if (error) {
            console.warn(error);
            return result;
        }
        
        // all checks have passed - send element and input attributes object
        result = { element: inputEl, elementAttrObj: inputAttributesObj }

        return result;
    }
}