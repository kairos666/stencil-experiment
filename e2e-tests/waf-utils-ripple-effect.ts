import { Selector } from 'testcafe';

fixture('Ripple FX Tests')
    .page('http://localhost:3333/');

test('evaluate FX applied to buttons', async (t) => {
    const rippledBtns = Selector('button[ripple],button.ripple-button');
    const nonRippledBtns = Selector('button.not-rippled');

    // wait for page to load then navigate to correct tab
    await t
        .expect(rippledBtns.exists).ok('no elements matching selector')
        .expect(nonRippledBtns.exists).ok('no elements matching selector')

    // click on all rippled buttons and check the existence of the ripple container
    for (let i = 0; i < await rippledBtns.count; i++) {
        await t
            .expect(rippledBtns.nth(i).exists).ok('couldn\'t find elt - rippled button')
            .expect(rippledBtns.nth(i).find('.ripple--container').exists).ok('couldn\'t find elt - ripple--container')
            .click(rippledBtns.nth(i));
    }

    // click on all non rippled buttons and check the absence of the ripple container
    for (let i = 0; i < await nonRippledBtns.count; i++) {
        await t
            .expect(nonRippledBtns.nth(i).exists).ok()
            .expect(nonRippledBtns.nth(i).find('.ripple--container').exists).notOk('found elt - ripple--container')
            .click(nonRippledBtns.nth(i));
    }
});