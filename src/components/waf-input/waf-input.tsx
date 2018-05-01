import { Component } from '@stencil/core';

@Component({
  tag: 'waf-input',
  styleUrl: 'waf-input.scss'
})
export class WafInput {
  render() {
    return (
        <div class="waf-input">I'm a very basic component</div>
    );
  }
}