import { Component, Prop, Element, State } from '@stencil/core';

@Component({
  tag: 'waf-input',
  styleUrl: 'waf-input.scss'
})
export class WafInput {
    @Prop() label:string = 'error - label required';
    @Prop() float:boolean;
    @Prop() alignRight:boolean;
    @Prop() fullWidth:boolean;
    @State() inputAttrs:any = { id: '' };
    @State() isFocused:boolean = false;
    @State() isDirty:boolean = false;
    @State() isInvalid:boolean = false;

    @Element() textfieldElt:HTMLElement;
    private inputEl:HTMLInputElement;

    render() {
        return (
            <div class={this.cmpntStyleClasses()}>
                <label class="waf-textfield__label" htmlFor={this.inputAttrs.id}>{this.label}</label>
                <slot></slot>
                <span class="waf-textfield__error">errorText</span>
            </div>
        );
    }

    componentDidLoad() {
        // set all elements and run some checks
        const inputData = this.inputTagChecker();
        this.inputEl = inputData.element;
        this.inputAttrs = inputData.elementAttrObj;

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
    }

    private onValueUpdate(evt) {
        this.isDirty = (this.inputEl.value !== '');

        // // process validity calculations
        console.log(evt);
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