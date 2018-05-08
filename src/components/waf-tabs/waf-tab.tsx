import { Component, Prop } from '@stencil/core'; 
 
@Component({ 
  tag: 'waf-tab' 
}) 
export class WafTab { 
    @Prop() tabHeader:string = 'tab-header is empty'
    render() { 
        return ( 
            <slot name="tabpane" />
        ); 
    }
}