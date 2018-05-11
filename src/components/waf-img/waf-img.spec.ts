import { TestWindow } from '@stencil/core/testing';
import { WafImg } from './waf-img';

// mock fetch calls
(global as any).fetch = (url, options) => {
    console.log('mock fetch request', url, options);

    return Promise.resolve({
        blob: function() {
            return new Blob([''], { type: 'image/png' });
        }
    });
};
// mock URL.createObjectURL
(global as any).URL = {
    createObjectURL: function(blob) {
        return 'fakeDOMString';
    }
}

describe('waf-img', () => {
    it('should build', () => {
        expect(new WafImg()).toBeTruthy();
    });
  
    describe('rendering', () => {
        let window;
        beforeEach(() => {
            window = new TestWindow();
        });
        it('should be broken without src', async() => {
            let element = await window.load({
                components: [WafImg],
                html: '<waf-img></waf-img>'
            });
            // directly to broken state
            expect(element.querySelector('.waf-img__broken')).toBeTruthy();
        });
        it('should work with src', async() => {
            let element = await window.load({
                components: [WafImg],
                html: '<waf-img src="https://picsum.photos/200/200/?image=500" alt="test-alt"></waf-img>'
            });
            // load state
            expect(element.querySelector('.waf-img__loading')).toBeTruthy();
            await window.flush();
            // show image after rerender
            expect(element.querySelector('img')).toBeTruthy();
        });
    });
});