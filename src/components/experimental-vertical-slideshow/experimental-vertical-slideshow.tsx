import { Component, State, Element } from '@stencil/core';

@Component({
  tag: 'exp-vertical-slideshow',
  styleUrl: 'experimental-vertical-slideshow.scss'
})
export class ExperimentalVerticalSlideshow {

  @State() bgImages: Function[] = [];
  @State() bgFocusState: boolean[] = [];

  @Element() slideshowEl: HTMLElement;
  private contentsEl: HTMLElement;

  componentDidLoad() {
    this.contentsEl = this.slideshowEl.querySelector('.vertical-slideshow__contents');

    // format backgrounds for slides
    let slideshowTargetsArray = this.fromNodeListToArray(this.contentsEl.children);
    this.bgImages = slideshowTargetsArray
        .map(elt => elt.getAttribute('data-background-image'))
        .map(bgImgUrl => {
            return function() {
                return { backgroundImage: `url(${bgImgUrl})` }
            }
        });

    // set initial focus state - first slide is focused
    this.bgFocusState = slideshowTargetsArray.map((_elt, index) => (index == 0));

    // setup intersection observers
    if (IntersectionObserver) {
        // observer and behavior
        let slideshowObserver = new IntersectionObserver(
            (entries:IntersectionObserverEntry[]) => {
                entries.forEach((entry:IntersectionObserverEntry) => {
                    if(entry.isIntersecting && entry.intersectionRatio >= 0.1) {
                        let focusedSlideIndex:Number = slideshowTargetsArray.indexOf(entry.target);
                        this.bgFocusState = slideshowTargetsArray.map((_elt, index) => (index == focusedSlideIndex));
                    } 
                });
            }, 
            { threshold: 0.1 }
        );

        // observer targets
        slideshowTargetsArray.forEach((slide:HTMLElement) => {
            slideshowObserver.observe(slide);
        });
    }
  }

  fromNodeListToArray(input:HTMLCollection):Array<Element> {
    let output:Array<Element> = [];
    for(let i = 0; i < input.length; i++) {
        output.push(input[i]);
    }
    return output;
  }

  calculateDynamicSlideshowHeight = () => {
      return {
        height: this.bgImages.length * 100 + 'vh'
      }
  }

  render() {
    return [
        (<div class="vertical-slideshow__backgrounds" style={this.calculateDynamicSlideshowHeight()}>
            <div class="vertical-slideshow__backgrounds__inner">
                {this.bgImages.map((background, index) => 
                    <figure class={(this.bgFocusState[index] ? 'focused' : '')} style={background()}></figure>
                )}
            </div>
        </div>),
        (<ul class="vertical-slideshow__contents">
           <slot />
        </ul>)
    ];
  }
}
