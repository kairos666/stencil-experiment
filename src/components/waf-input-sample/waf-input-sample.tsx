import { Component, Prop, Element, State } from '@stencil/core';

@Component({
  tag: 'waf-input-sample',
  styleUrl: 'waf-input-sample.scss'
})
export class ExperimentalInput {
  @Prop() type:string = 'text';
  @Prop() fieldId:string = `field${new Date().getUTCMilliseconds()}`;
  @Prop() fieldError:string;
  @Prop() fieldLabel:string;

  @State() isFocused:boolean = false;
  @State() isDirty:boolean = false;
  @State() isInvalid:boolean = false;

  @Element() textfieldElt:HTMLElement;
  private inputEl:HTMLElement;
  private labelEl:HTMLElement;
  private errorEl:HTMLElement;

  componentDidLoad() {
      // set all elements
      this.inputEl = this.textfieldElt.querySelector('input');
      this.labelEl = this.textfieldElt.querySelector('label');
      this.errorEl = this.textfieldElt.querySelector('.mdl-textfield__error');
      if (!this.labelEl && !this.errorEl) console.log('can\'t find those elements');

      // focus handling
      this.inputEl.addEventListener('focus', () => { this.isFocused = true; });
      this.inputEl.addEventListener('blur', () => { this.isFocused = false; });
  }

  handleInput = (evt) => {
    let target:any = evt.target as any; // force typescript to swallow this

    // handle user inputs changes - dirty/pritine field
    this.isDirty = (target.value && target.value !== '');

    // handle validity
    if (target.validity) {
        this.isInvalid = !target.validity.valid;
    }
  }

  textFieldClassesBuilder = ():string => {
    return `mdl-textfield mdl-textfield--floating-label ${(this.isFocused) ? 'is-focused' : ''} ${(this.isDirty) ? 'is-dirty' : ''} ${(this.isInvalid) ? 'is-invalid' : ''}`;
  }

  render() {
    return (
        <div class={this.textFieldClassesBuilder()}>
            <input class="mdl-textfield__input" onInput={e => {this.handleInput(e)}} type={this.type} pattern="-?[0-9]*(\.[0-9]+)?" id={this.fieldId} />
            <label class="mdl-textfield__label" htmlFor={this.fieldId}>{this.fieldLabel}</label>
            <span class="mdl-textfield__error">{this.fieldError}</span>
        </div>
    );
  }
}