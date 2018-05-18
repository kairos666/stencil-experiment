// mock vuid module before it is imported by the class (works only in browser with crypto API)
jest.mock('vuid', () => {
    return jest.fn(() => 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
});

import { WafDialog } from './waf-dialog';

describe('waf-dialog', () => {
    it('should build', () => {
        // test component class build
        expect(new WafDialog()).toBeTruthy();
    });
});