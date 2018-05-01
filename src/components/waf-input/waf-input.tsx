import { Component, Prop, Element } from '@stencil/core';

@Component({
  tag: 'waf-input',
  styleUrl: 'waf-input.scss'
})
export class WafInput {
    @Prop() label:string = 'error - label required';

    @Element() textfieldElt:HTMLElement;
    private inputEl:HTMLInputElement;
    private inputAttrs:any;
    private labelEl:HTMLElement;
    private errorEl:HTMLElement;

    render() {
        return (
            <div class="waf-textfield">
                <label class="waf-textfield__label" htmlFor="inputId">{this.label}</label>
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
        this.labelEl = this.textfieldElt.querySelector('label');
        this.errorEl = this.textfieldElt.querySelector('.waf-textfield__error');
        if (!this.inputEl && !this.labelEl && !this.errorEl) console.log('found nothing');

        // build textfield according to data from input tag and own attributes
        if (this.inputEl && this.inputAttrs) this.init();
    }

    // main builder function
    private init() {
        console.log('i am ok to init');
    }

    // check if input tag is here and has all required features (id, type)
    private inputTagChecker():any {
        let result = { element: null, elementAttrObj: null };
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