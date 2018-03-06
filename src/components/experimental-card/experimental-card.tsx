import { Component, Prop } from '@stencil/core';

@Component({
  tag: 'experimental-card',
  styleUrl: 'experimental-card.scss'
})
export class ExperimentalCard {
  @Prop() title: string;
  @Prop() supportingText: string;
  @Prop() illustration: string;

  titleStyle = () => {
    return {
      backgroundImage: `url(${this.illustration})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'bottom right 15%'
    }
  };

  render() {
    return (
      <figure class="mdl-card mdl-shadow--2dp">
        <div class="mdl-card__title mdl-card--expand" style={this.titleStyle()}>
          <h2 class="mdl-card__title-text">{this.title}</h2>
        </div>
        <figcaption class="mdl-card__supporting-text">{this.supportingText}</figcaption>
      </figure>
    );
  }
}