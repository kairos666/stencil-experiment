import { WafRippleFX } from './waf-utils-ripple-effect';

describe('waf-utils-ripple-effect', () => {
    it('should build', () => {
        // test component class build
        expect(new WafRippleFX()).toBeTruthy();
    });

    // no other unit tests - need e2e tests for checking n the effect itself
});