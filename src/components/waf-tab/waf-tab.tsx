import { Component } from '@stencil/core';

@Component({
  tag: 'waf-tab'
})
export class WafTab {
    render() {
        return [
            <slot name="tab" />,
            <slot name="tabpane" />
        ];
    }
}