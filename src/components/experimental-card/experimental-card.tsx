import { Component, Prop, State, Element } from '@stencil/core';

@Component({
  tag: 'experimental-card',
  styleUrl: 'experimental-card.scss'
})
export class ExperimentalCard {
  @Prop() title: string;
  @Prop() supportingText: string;
  @Prop() illustration: string;

  @State() hasActions: boolean;

  @Element() cardEl: HTMLElement;
  private actionsEl: HTMLElement;

  private titleStyle = () => {
    return {
      backgroundImage: `url(${this.illustration})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'bottom right 15%'
    }
  };

  private actionsStyle = () => {
    return {
      display: (this.hasActions) ? '' : 'none'
    }
  };

  componentDidLoad() {
    this.actionsEl = this.cardEl.querySelector('.mdl-card__actions');
    this.hasActions = (this.actionsEl.childElementCount !== 0);
    this.slotMutationObserver();
  }

  
  private slotMutationObserver(): void {
    // mutation CB handler
    let reactionCB = () => {
      this.hasActions = (this.actionsEl.childElementCount !== 0);
    };

    // setting up mutation observer
    let observer = new MutationObserver(reactionCB);
    observer.observe(this.actionsEl, { childList: true });
  }

  render() {
    return (
      <figure class="mdl-card mdl-shadow--2dp">
        <div class="mdl-card__title mdl-card--expand" style={this.titleStyle()}>
          <h2 class="mdl-card__title-text">{this.title}</h2>
        </div>
        <figcaption class="mdl-card__supporting-text">{this.supportingText}</figcaption>
        <div class="mdl-card__actions mdl-card--border" style={this.actionsStyle()}>
          <slot />
        </div>
      </figure>
    );
  }
}