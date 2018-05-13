import { Selector } from 'testcafe';

fixture('Ripple FX Tests')
    .page('http://localhost:3333/');

test('Navigate to WAF-UTILS tab', async (t) => {
    const mainWafTabs = Selector('main > waf-tabs > nav > [role="tablist"] > li');
    const mainWafTabpanes = Selector('main > waf-tabs > waf-tab');
    const wafUtilsTab = mainWafTabs.withText('WAF-UTILS');
    const wafUtilsTabPane = mainWafTabpanes.withAttribute('tab-header', 'WAF-UTILS');

    const rippledBtns = wafUtilsTabPane.child('button[ripple], button.ripple-button');
    const nonRippledBtns = wafUtilsTabPane.child('button:not([ripple]), button:not(.ripple-button)');

    // wait for page to load
    await t
        .click(wafUtilsTab)
        .expect(rippledBtns.exists).ok()
        .expect(nonRippledBtns.exists).ok()
});