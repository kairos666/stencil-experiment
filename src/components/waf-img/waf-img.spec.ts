import { TestWindow } from '@stencil/core/testing';
import { WafImg } from './waf-img';

// mock fetch calls - request response is an object with a blob function
const successfulFetch = () => {
    return Promise.resolve({
        blob: function() {
            return Promise.resolve(new Blob([''], { type: 'image/png' }));
        }
    });
}
// mock fetch calls - request response is an error
const failedFetch = () => {
    return Promise.reject(new Error('can\'t access image src'));
}
// mock IntersectionObserver
class IntersectionObserver {
    public handler:Function;

    constructor(handlerFunc:Function) {
        this.handler = handlerFunc;

        // attach latest instance created on global object
        (global as any).mockIntersectionObserverInstance = this;
    }

    observe() {}
    disconnect() {}
    triggerHandler() {
        const fakeEntries = [{ isIntersecting: true }];
        this.handler(fakeEntries, this);
    } 
}

// patch window object
const globalPatcher = (mockFetch) => {
    const _global = (global as any);
    // mock fetch
    _global.fetch = mockFetch;
    // mock URL.createObjectURL
    _global.URL = {
        createObjectURL: function() {
            return 'fakeDOMString';
        }
    };
    // mock IntersectionObserver
    _global.IntersectionObserver = IntersectionObserver;
}

// mock document.readyState (read-only property)
let docReadyState = 'complete';
Object.defineProperty(document, 'readyState', { get: () => docReadyState });

// fire window event - 'load'
const fireWindowLoadEvent = () => {
    const loadEvt = document.createEvent('Event');
    loadEvt.initEvent('load', true, true);
    (global as any).window.dispatchEvent(loadEvt);
}

describe('waf-img', () => {
    it('should build', () => {
        // test component class build
        expect(new WafImg()).toBeTruthy();
    });
  
    describe('rendering checks', () => {
        let window;
        let warnSpy;
        beforeEach(() => {
            window = new TestWindow();

            // mocks reset
            jest.restoreAllMocks();
            warnSpy = jest.spyOn(console, 'warn');
        });
        it('should be broken without src', async() => {
            /** test setup */
            // document state
            docReadyState = 'loaded';

            // mock fetch API
            let mockFetch = jest.fn(failedFetch);
            globalPatcher(mockFetch);
            
            let element = await window.load({
                components: [WafImg],
                html: '<waf-img></waf-img>'
            });

            /** test checks */
            // directly to broken state
            expect(element.querySelector('.waf-img__broken')).toBeTruthy();
            // correct warning is issued
            expect(warnSpy).toBeCalledWith('waf-img | a src is required');
            // fetch API is not called
            expect(mockFetch.mock.calls.length).toBe(0);
        });

        it('should display image - (document is loaded)', async() => {
            /** test setup */
            // document state
            docReadyState = 'loaded';

            // mock fetch API
            let mockFetch = jest.fn(successfulFetch);
            globalPatcher(mockFetch);

            let element = await window.load({
                components: [WafImg],
                html: '<waf-img src="https://picsum.photos/200/200/?image=500" alt="test-alt"></waf-img>'
            });

            /** test checks */
            // load state
            expect(element.querySelector('.waf-img__loading')).toBeTruthy();
            expect(warnSpy).not.toBeCalled();
            // fetch API is called once
            expect(mockFetch.mock.calls.length).toBe(1);
            expect(mockFetch.mock.calls[0][0]).toEqual('https://picsum.photos/200/200/?image=500');
            // show image after rerender
            await window.flush();
            expect(element.querySelector('img')).toBeTruthy();
        });

        it('should display image and reflect all image attributes', async() => {
            /** test setup */
            // document state
            docReadyState = 'loaded';

            // mock fetch API
            let mockFetch = jest.fn(successfulFetch);
            globalPatcher(mockFetch);

            // list of attributes
            const wafImgAttributes = [
                { name: 'src', value: 'fakeDOMString' }, // value after being succesfully processed through mock fetch blobing
                { name: 'alt', value: 'test-alt' },
                { name: 'srcset', value: 'https://picsum.photos/g/200/200/?random 1x, https://picsum.photos/g/600/600/?random 2x, https://picsum.photos/g/1200/1200/?random 3x' },
                { name: 'decoding', value: 'sync' },
                { name: 'width', value: '200' },
                { name: 'height', value: '200' },
                { name: 'sizes', value: '100vw' }
            ]

            let element = await window.load({
                components: [WafImg],
                html: '<waf-img src="https://picsum.photos/200/200/?image=500" alt="test-alt" srcset="https://picsum.photos/g/200/200/?random 1x, https://picsum.photos/g/600/600/?random 2x, https://picsum.photos/g/1200/1200/?random 3x" decoding="sync" width="200" height="200" sizes="100vw"></waf-img>'
            });

            /** test checks */
            // show image after rerender
            await window.flush();
            const imgElt = element.querySelector('img');
            expect(imgElt).toBeTruthy();
            wafImgAttributes.forEach(attrItem => {
                // check each attribute individually
                expect(imgElt.getAttribute(attrItem.name)).toEqual(attrItem.value);
            });
        });

        it('should reflect width & height attributes on loading & broken states', async() => {
            /** test setup */
            // document state
            docReadyState = 'loaded';

            // mock fetch API
            let mockFetch = jest.fn(failedFetch);
            globalPatcher(mockFetch);
            
            let element = await window.load({
                components: [WafImg],
                html: '<waf-img src="https://picsum.photos/200/200/?image=500" alt="test-alt" width="200" height="200"></waf-img>'
            });

            /** test checks */
            // load state
            const loadingContainerElt = element.querySelector('.waf-img__loading');
            expect(loadingContainerElt).toBeTruthy();
            expect(loadingContainerElt.getAttribute('style')).toEqual('width: 200px; height: 200px;');
            // show broken after rerender
            await window.flush();
            const brokenContainerElt = element.querySelector('.waf-img__broken');
            expect(brokenContainerElt).toBeTruthy();
            expect(brokenContainerElt.getAttribute('style')).toEqual('width: 200px; height: 200px;');
        });

        it('should display image - (document is loading then load event is fired)', async() => {
            /** test setup */
            // document state
            docReadyState = 'loading';

            // mock fetch API
            let mockFetch = jest.fn(successfulFetch);
            globalPatcher(mockFetch);

            let element = await window.load({
                components: [WafImg],
                html: '<waf-img src="https://picsum.photos/200/200/?image=500" alt="test-alt"></waf-img>'
            });

            /** test checks */
            // load state
            expect(element.querySelector('.waf-img__loading')).toBeTruthy();
            expect(warnSpy).not.toBeCalled();
            // fetch API is not called yet because document is loading
            expect(mockFetch.mock.calls.length).toBe(0);

            // window load event is fired
            fireWindowLoadEvent();

            // fetch API is called once
            expect(mockFetch.mock.calls.length).toBe(1);
            expect(mockFetch.mock.calls[0][0]).toEqual('https://picsum.photos/200/200/?image=500');
            // show image after rerender /!\ 2 rerender are necessary (hypothesis due to async nature of tech resolution)
            await window.flush();
            await window.flush();
            expect(element.querySelector('img')).toBeTruthy();
        });

        it('[visible-async-loading] should display loading state until visible event is triggered - (document is loaded but component is not visible)', async() => {
            /** test setup */
            // document state
            docReadyState = 'loaded';

            // mock fetch API
            let mockFetch = jest.fn(successfulFetch);
            globalPatcher(mockFetch);

            let element = await window.load({
                components: [WafImg],
                html: '<waf-img visible-async-loading src="https://picsum.photos/200/200/?image=500" alt="test-alt"></waf-img>'
            });

            /** test checks */
            // load state (initial)
            expect(element.querySelector('.waf-img__loading')).toBeTruthy();
            // fetch API is not called yet because element is not visible
            expect(mockFetch.mock.calls.length).toBe(0);

            // load state (even after rerender because elment is not visible)
            await window.flush();
            expect(element.querySelector('.waf-img__loading')).toBeTruthy();
            // fetch API is not called yet because element is not visible
            expect(mockFetch.mock.calls.length).toBe(0);

            // intersectionObserver fire visible evt
            (global as any).mockIntersectionObserverInstance.triggerHandler();

            // fetch API is called once
            expect(mockFetch.mock.calls.length).toBe(1);
            expect(mockFetch.mock.calls[0][0]).toEqual('https://picsum.photos/200/200/?image=500');

            // show image after rerender /!\ 2 rerender are necessary (hypothesis due to async nature of tech resolution)
            await window.flush();
            await window.flush();
            expect(element.querySelector('img')).toBeTruthy();
        });
    });
});