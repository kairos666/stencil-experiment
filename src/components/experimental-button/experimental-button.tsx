import { Component, Prop, State, Watch } from '@stencil/core';

@Component({
  tag: 'experimental-button',
  styleUrl: 'experimental-button.scss'
})
export class ExperimentalButton {
  @Prop() type: string;
  @Prop() colored: boolean;
  @Prop() disabled: boolean;

  @State() buttonClasses: string;

  buttonClassesBuilder() {
    // validate type
    if (this.type && this.type !== 'fab' && this.type !== 'raised') throw new Error('type: must be either "raised" or "fab"');

    let result = 'mdl-button';
    result += (this.type) ? ` mdl-button--${this.type}` : '';
    result += (this.colored) ? ' mdl-button--colored' : '';
    return result;
  }

  componentWillLoad() {
    this.buttonClasses = this.buttonClassesBuilder();
  }

  @Watch('type')
  @Watch('colored')
  buttonTypeHandler() {
    this.buttonClasses = this.buttonClassesBuilder();
  }

  render() {
    return (
      <button class={this.buttonClasses} disabled={this.disabled}>
        <slot />
      </button>
    );
  }
}