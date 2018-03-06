import { Component, Prop } from '@stencil/core';

@Component({
  tag: 'experimental-cmpnt-1',
  styleUrl: 'experimental-cmpnt-1.scss'
})
export class ExpCmpnt1 {

  // Indicate that name should be a public property on the component
  @Prop() name: string;

  render() {
    return (
      <p>
        My name is {this.name}
      </p>
    );
  }
}